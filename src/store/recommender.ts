import { Event } from './events';
import { Game } from '../data/games';

// Local heuristic recommender. Aggregates the event log + likes/saves into a
// per-game score, then re-projects scores into the 65–99 "match %" range used
// by GameCard. New users with no events fall back to the static `match` from
// games.ts. Once we wire Supabase + a server-side ranker, this file becomes
// the offline fallback.

export type GameStats = {
  views: number;
  plays: number;
  completes: number;
  wins: number;
  liked: 0 | 1;
  saved: 0 | 1;
  shares: number;
  skips: number;
  bestScore: number;
  lastPlayedTs: number;
};

const ZERO: GameStats = {
  views: 0, plays: 0, completes: 0, wins: 0,
  liked: 0, saved: 0, shares: 0, skips: 0,
  bestScore: 0, lastPlayedTs: 0,
};

export function aggregateStats(
  events: Event[],
  likes: Record<number, boolean>,
  saves: Record<number, boolean>,
): Map<number, GameStats> {
  const m = new Map<number, GameStats>();
  const get = (id: number) => {
    let s = m.get(id);
    if (!s) { s = { ...ZERO }; m.set(id, s); }
    return s;
  };
  for (const ev of events) {
    const s = get(ev.gameId);
    switch (ev.type) {
      case 'view': s.views++; break;
      case 'play': s.plays++; if (ev.ts > s.lastPlayedTs) s.lastPlayedTs = ev.ts; break;
      case 'complete': {
        s.completes++;
        if (ev.meta?.won) s.wins++;
        const sc = Number(ev.meta?.score ?? 0);
        if (sc > s.bestScore) s.bestScore = sc;
        break;
      }
      case 'share': s.shares++; break;
      case 'skip': s.skips++; break;
    }
  }
  for (const id of Object.keys(likes)) if (likes[Number(id)]) get(Number(id)).liked = 1;
  for (const id of Object.keys(saves)) if (saves[Number(id)]) get(Number(id)).saved = 1;
  return m;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function scoreGame(s: GameStats, now: number): number {
  const recency = s.lastPlayedTs ? Math.max(0, 1 - (now - s.lastPlayedTs) / WEEK_MS) : 0;
  return (
    s.liked * 8 +
    s.saved * 5 +
    s.plays * 2 +
    s.completes * 3 +
    s.wins * 4 +
    s.shares * 3 -
    s.skips * 3 +
    s.views * 0.05 +
    recency * 4
  );
}

export type Ranked = Game & { stats: GameStats };

export function rankGames(
  games: Game[],
  events: Event[],
  likes: Record<number, boolean>,
  saves: Record<number, boolean>,
  now = Date.now(),
): Ranked[] {
  const stats = aggregateStats(events, likes, saves);

  // Per-category aggregate so unseen games inherit some interest from siblings.
  const catSum: Record<string, number> = {};
  const catCount: Record<string, number> = {};
  let totalActivity = 0;
  for (const g of games) {
    const s = stats.get(g.id);
    if (!s) continue;
    const sc = scoreGame(s, now);
    catSum[g.category] = (catSum[g.category] || 0) + sc;
    catCount[g.category] = (catCount[g.category] || 0) + 1;
    totalActivity += sc;
  }

  // Build raw blended scores
  const blended = games.map((g) => {
    const s = stats.get(g.id) || { ...ZERO };
    const personal = scoreGame(s, now);
    const catAvg = (catSum[g.category] || 0) / Math.max(1, catCount[g.category] || 0);
    return { game: g, stats: s, raw: personal + catAvg * 0.4 };
  });

  if (totalActivity <= 0) {
    // Cold start — keep static match values, no re-sort.
    return blended.map((b) => ({ ...b.game, stats: b.stats }));
  }

  const max = Math.max(...blended.map((b) => b.raw));
  const min = Math.min(...blended.map((b) => b.raw));
  const range = max - min || 1;

  return blended
    .map((b) => {
      const norm = 65 + ((b.raw - min) / range) * 34; // 65 → 99
      return { ...b.game, match: Math.round(norm), stats: b.stats };
    })
    .sort((a, b) => b.match - a.match);
}

// --- Stats helpers for the profile screen --------------------------------

export type Totals = {
  totalPlays: number;
  totalCompletes: number;
  totalWins: number;
  uniqueGames: number;
  totalShares: number;
};

export function computeTotals(events: Event[]): Totals {
  const played = new Set<number>();
  let totalPlays = 0;
  let totalCompletes = 0;
  let totalWins = 0;
  let totalShares = 0;
  for (const ev of events) {
    if (ev.type === 'play') { totalPlays++; played.add(ev.gameId); }
    else if (ev.type === 'complete') {
      totalCompletes++;
      if (ev.meta?.won) totalWins++;
    }
    else if (ev.type === 'share') totalShares++;
  }
  return { totalPlays, totalCompletes, totalWins, uniqueGames: played.size, totalShares };
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStreak(events: Event[], now = Date.now()): number {
  const days = new Set<string>();
  for (const ev of events) {
    if (ev.type === 'play' || ev.type === 'complete') days.add(dayKey(ev.ts));
  }
  if (!days.size) return 0;
  let streak = 0;
  let started = false;
  const today = new Date(now);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) {
      streak++;
      started = true;
    } else {
      // Today (i === 0) is a free pass — user may not have played yet.
      if (i === 0) continue;
      if (started) break;
      else break;
    }
  }
  return streak;
}

export function recentGameIds(events: Event[], limit = 4): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (let i = events.length - 1; i >= 0 && result.length < limit; i--) {
    const ev = events[i];
    if (ev.type !== 'play' && ev.type !== 'complete') continue;
    if (seen.has(ev.gameId)) continue;
    seen.add(ev.gameId);
    result.push(ev.gameId);
  }
  return result;
}

export function topCategoryLabel(events: Event[], games: Game[]): string | null {
  const counts: Record<string, number> = {};
  const labels: Record<string, string> = {};
  for (const g of games) labels[g.category] = g.categoryLabel;
  for (const ev of events) {
    if (ev.type !== 'play' && ev.type !== 'like' && ev.type !== 'complete') continue;
    const g = games.find((x) => x.id === ev.gameId);
    if (!g) continue;
    counts[g.category] = (counts[g.category] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? labels[entries[0][0]] : null;
}
