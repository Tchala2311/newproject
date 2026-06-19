// Build a user's interest profile from their interactions, with time decay.
// Maps to X-algorithm's RealGraph (per-user edge weights) + interest vector.

import { supabase } from '../supabase';
import { GAMES, Game } from '../../data/games';
import { extractFeatures, GameFeatureVector } from './features';

export type EngagementSignal =
  | { type: 'like'; weight: 3 }
  | { type: 'save'; weight: 5 }
  | { type: 'comment'; weight: 6 }
  | { type: 'play'; weight: 2 }
  | { type: 'complete-won'; weight: 4 }
  | { type: 'complete-lost'; weight: 1 }
  | { type: 'view'; weight: 0.5 };

const WEIGHTS = {
  like: 3,
  save: 5,
  comment: 6,
  play: 2,
  completeWon: 4,
  completeLost: 1,
  view: 0.5,
  skip: -1.5, // explicit "Не интересно" — mild negative (graded views handle swipe-past)
} as const;

// Half-life in days. After 14 days, weight halves. After 28 days, ~25%.
const DECAY_HALF_LIFE_DAYS = 14;

export type UserProfile = {
  userId: string | null;
  // Per-game raw affinity score (sum of decayed event weights).
  perGameWeight: Map<number, number>;
  // Aggregated content vector — weighted average of features of liked games.
  contentVector: GameFeatureVector | null;
  // Following: handles the user follows (locally stored or DB-synced)
  following: Set<string>;
  // Recent impressions (game_id -> count) for repeat penalty
  recentImpressions: Map<number, number>;
  // Set of game IDs the user has explicitly marked "Не интересно" — strong
  // negative ranker weight so we suppress them aggressively.
  notInterested: Set<number>;
  // Cold-start indicator
  isColdStart: boolean;
};

function decayFactor(daysAgo: number): number {
  return Math.pow(0.5, daysAgo / DECAY_HALF_LIFE_DAYS);
}

// Watch-time → signal weight. This is TikTok's core input: how long a card held
// your attention. `view` events carry { dwellMs, played } in meta. A play is
// already counted via its own event, so a played view contributes nothing extra
// here (avoids double-counting); otherwise dwell time grades from a strong
// negative (instant swipe-past) to a clear positive (you really lingered).
function viewWeight(meta: any): number {
  if (meta?.played === 1 || meta?.played === '1') return 0;
  const dwell = Number(meta?.dwellMs ?? 0);
  if (dwell <= 0) return 0;
  if (dwell < 1000) return -1.5;   // immediate swipe — strong disinterest
  if (dwell < 2500) return -0.4;   // quick swipe — mild disinterest
  if (dwell < 5000) return 0.5;    // lingered — mild interest
  if (dwell < 10000) return 1.2;   // really looked — interest
  return 1.6;                      // very long dwell
}

function emptyVec(): GameFeatureVector {
  return extractFeatures(GAMES[0]); // shape; we'll zero it
}

function zeroVec(): GameFeatureVector {
  const v = emptyVec();
  for (const k of Object.keys(v) as Array<keyof GameFeatureVector>) v[k] = 0;
  return v;
}

function addScaled(target: GameFeatureVector, src: GameFeatureVector, scale: number) {
  for (const k of Object.keys(target) as Array<keyof GameFeatureVector>) {
    target[k] += src[k] * scale;
  }
}

function normalizeVec(v: GameFeatureVector) {
  let mag = 0;
  for (const k of Object.keys(v) as Array<keyof GameFeatureVector>) mag += v[k] * v[k];
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  for (const k of Object.keys(v) as Array<keyof GameFeatureVector>) v[k] /= mag;
  return v;
}

export async function buildUserProfile(
  userId: string | null,
  followsLocal: Record<string, boolean>,
  notInterestedLocal: Record<number, boolean> = {}
): Promise<UserProfile> {
  const following = new Set<string>(Object.entries(followsLocal).filter(([, v]) => v).map(([k]) => k));
  const notInterested = new Set<number>(
    Object.entries(notInterestedLocal).filter(([, v]) => v).map(([k]) => Number(k))
  );

  if (!userId) {
    return {
      userId: null,
      perGameWeight: new Map(),
      contentVector: null,
      following,
      recentImpressions: new Map(),
      notInterested,
      isColdStart: true,
    };
  }

  // Fetch all engagement signals in parallel.
  const [likesRes, savesRes, commentsRes, eventsRes, impressionsRes, niRes] = await Promise.all([
    supabase.from('likes').select('game_id, created_at').eq('user_id', userId),
    supabase.from('saves').select('game_id, created_at').eq('user_id', userId),
    supabase.from('comments').select('game_id, created_at').eq('user_id', userId),
    supabase.from('events').select('game_id, type, meta, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
    supabase.rpc('recent_impressions_for_user', { uid: userId, hours: 24 }),
    supabase.from('not_interested').select('game_id').eq('user_id', userId),
  ]);

  // Merge DB not_interested with local cache
  for (const r of (niRes.data ?? []) as Array<{ game_id: number }>) {
    notInterested.add(r.game_id);
  }

  const perGame = new Map<number, number>();
  const contentVec = zeroVec();
  let totalWeight = 0;
  const now = Date.now();
  // Build a lookup map once — addSignal is called for every event row (up to
  // 600+) so GAMES.find would cost O(43×600) = ~25K comparisons per profile build.
  const gameById = new Map(GAMES.map((g) => [g.id, g]));

  const addSignal = (gameId: number, weight: number, createdAt: string) => {
    const days = (now - new Date(createdAt).getTime()) / 86400000;
    const decayed = weight * decayFactor(days);
    perGame.set(gameId, (perGame.get(gameId) ?? 0) + decayed);
    const game = gameById.get(gameId);
    if (game) {
      addScaled(contentVec, extractFeatures(game), decayed);
      totalWeight += decayed;
    }
  };

  (likesRes.data ?? []).forEach((r: any) => addSignal(r.game_id, WEIGHTS.like, r.created_at));
  (savesRes.data ?? []).forEach((r: any) => addSignal(r.game_id, WEIGHTS.save, r.created_at));
  (commentsRes.data ?? []).forEach((r: any) => addSignal(r.game_id, WEIGHTS.comment, r.created_at));

  (eventsRes.data ?? []).forEach((r: any) => {
    if (r.game_id === null || r.game_id === undefined) return;
    if (r.type === 'play') addSignal(r.game_id, WEIGHTS.play, r.created_at);
    else if (r.type === 'view') {
      const vw = viewWeight(r.meta);
      if (vw !== 0) addSignal(r.game_id, vw, r.created_at);
    }
    else if (r.type === 'skip') addSignal(r.game_id, WEIGHTS.skip, r.created_at);
    else if (r.type === 'complete') {
      const won = r.meta?.won === 1;
      addSignal(r.game_id, won ? WEIGHTS.completeWon : WEIGHTS.completeLost, r.created_at);
    }
  });

  if (totalWeight > 0) normalizeVec(contentVec);

  const recentImpressions = new Map<number, number>();
  if (impressionsRes.data) {
    (impressionsRes.data as Array<{ game_id: number; n: number }>).forEach((r) => {
      recentImpressions.set(r.game_id, r.n);
    });
  }

  // Cold-start = user has fewer than 20 *positive* engagement signals.
  // Skip events — and quick swipe-past views — have negative/neutral weight.
  // Counting them toward the threshold would let a user who just swipes past 20
  // cards exit cold-start with an inverted (all-negative) content vector,
  // surfacing the wrong games. So only a real linger/play view counts.
  const positiveEventCount = (eventsRes.data ?? []).filter((r: any) => {
    if (r.type === 'skip') return false;
    if (r.type === 'view') return r.meta?.played === 1 || Number(r.meta?.dwellMs ?? 0) >= 2500;
    return true; // play, complete
  }).length;
  const totalSignals = (likesRes.data?.length ?? 0) + (savesRes.data?.length ?? 0) + (commentsRes.data?.length ?? 0) + positiveEventCount;

  return {
    userId,
    perGameWeight: perGame,
    contentVector: totalWeight > 0 ? contentVec : null,
    following,
    recentImpressions,
    notInterested,
    isColdStart: totalSignals < 20,
  };
}

export function favoriteGameIds(profile: UserProfile, k: number): number[] {
  return [...profile.perGameWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id]) => id);
}

export function favoriteGames(profile: UserProfile, k: number): Game[] {
  const ids = favoriteGameIds(profile, k);
  return ids.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean);
}
