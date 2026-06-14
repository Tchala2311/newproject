// Final feed assembly. Maps to X-algorithm's Home Mixer:
// - Apply diversity rules (no two adjacent same-category, cap creator dominance)
// - Inject ad slots at fixed cadence
// - Reserve "exploration" slots for cold-start / discovery
// - Truncate to feed length

import { GAMES, Game } from '../../data/games';
import { ScoredCandidate } from './ranker';

export type FeedItem =
  | { type: 'game'; game: Game; score?: number; debug?: Record<string, number> }
  | { type: 'ad'; key: string; adIdx: number };

const AD_EVERY = 4;
const EXPLORATION_EVERY = 7; // every 7th slot is a random unranked card
const MAX_SAME_CATEGORY_RUN = 1; // never two same-category in a row
const MAX_PER_CREATOR = 2; // a single creator can't dominate the feed

export function assembleFeed(ranked: ScoredCandidate[], targetLength = 18): FeedItem[] {
  const sorted = [...ranked].sort((a, b) => b.total - a.total);

  // Pass 1: diversity-aware selection
  const selected: ScoredCandidate[] = [];
  const perCreator = new Map<string, number>();

  for (const cand of sorted) {
    if (selected.length >= targetLength) break;
    const creator = cand.game.creator.handle;
    if ((perCreator.get(creator) ?? 0) >= MAX_PER_CREATOR) continue;
    const lastCategory = selected[selected.length - 1]?.game.category;
    if (lastCategory && lastCategory === cand.game.category) {
      // Try to find a better next candidate that breaks the run; we'll handle
      // the simple case here by skipping IF an alternative is upcoming.
      const hasAlternative = sorted.some(
        (c) => c !== cand && c.game.category !== lastCategory && !selected.includes(c) && (perCreator.get(c.game.creator.handle) ?? 0) < MAX_PER_CREATOR
      );
      if (hasAlternative) continue;
    }
    selected.push(cand);
    perCreator.set(creator, (perCreator.get(creator) ?? 0) + 1);
  }

  // If we under-filled (small catalog or harsh diversity rules), top up with
  // anything not already shown.
  if (selected.length < targetLength) {
    const remainingPool = sorted.filter((c) => !selected.includes(c));
    for (const c of remainingPool) {
      if (selected.length >= targetLength) break;
      selected.push(c);
    }
  }

  // Pass 2: inject exploration slots (random unranked games not in selected)
  const seenIds = new Set(selected.map((c) => c.game.id));
  const explorationPool = GAMES.filter((g) => !seenIds.has(g.id));
  const result: FeedItem[] = [];
  let adIdx = 0;
  let explorationCursor = 0;
  // Count games as they're actually placed (primary + exploration) and inject
  // an ad every AD_EVERY games. The previous code re-filtered the whole result
  // each iteration, so an exploration card could bump the running count and
  // produce back-to-back / mis-spaced ads.
  let gamesSinceAd = 0;
  const pushGame = (item: FeedItem) => {
    result.push(item);
    gamesSinceAd += 1;
    if (gamesSinceAd >= AD_EVERY) {
      result.push({ type: 'ad', key: `ad-${adIdx}`, adIdx });
      adIdx += 1;
      gamesSinceAd = 0;
    }
  };

  for (let i = 0; i < selected.length; i += 1) {
    pushGame({
      type: 'game',
      game: selected[i].game,
      score: selected[i].total,
      debug: selected[i].parts,
    });
    // Inject exploration card every Mth slot
    if (
      (i + 1) % EXPLORATION_EVERY === 0 &&
      explorationCursor < explorationPool.length
    ) {
      pushGame({ type: 'game', game: explorationPool[explorationCursor++] });
    }
  }

  return result;
}
