// Heavy ranker — combines per-candidate features into a final score.
// X uses MaskNet (a learned NN). We use a tuned linear scorer; once we have
// enough impressions + engagement labels logged via feed_impressions, we can
// train weights from data instead of hand-picking them.

import { Game } from '../../data/games';
import { CandidateSource } from './candidates';
import { UserProfile } from './userProfile';

// Linear weights — chosen to reflect product priorities:
//  - in-network is the strongest implicit endorsement
//  - co-engagement is the second strongest (collaborative filtering)
//  - content similarity is third (especially useful for cold start mix)
//  - trending is a weaker signal (avoids local maxima)
//  - direct prior affinity (we already played and liked this) is a small bump
//  - recency penalty avoids feed repetition
export const W = {
  inNetwork: 4.0,
  coEngaged: 3.0,
  contentSimilar: 2.0,
  trending: 1.2,
  priorAffinity: 0.4,        // already liked this game — show again with less weight
  matchPrior: 0.3,           // hand-curated match% as a tie-breaker
  recencyPenalty: -0.6,      // per-impression penalty (last 24h)
  diversityCarry: 0,         // mutated by mixer at assemble time
} as const;

export type ScoredCandidate = {
  game: Game;
  total: number;
  parts: Record<string, number>;
  sources: CandidateSource[];
};

export function rankCandidate(
  game: Game,
  sources: Map<CandidateSource, number>,
  profile: UserProfile
): ScoredCandidate {
  const parts: Record<string, number> = {};

  parts.inNetwork = W.inNetwork * (sources.get('inNetwork') ?? 0);
  parts.coEngaged = W.coEngaged * (sources.get('coEngaged') ?? 0);
  parts.contentSimilar = W.contentSimilar * (sources.get('contentSimilar') ?? 0);
  parts.trending = W.trending * (sources.get('trending') ?? 0);

  // Direct prior affinity — log-scaled so a single like doesn't dominate.
  const prior = profile.perGameWeight.get(game.id) ?? 0;
  parts.priorAffinity = W.priorAffinity * Math.log1p(prior);

  // Curated AI match% (from the seed catalog) acts as a weak prior.
  parts.matchPrior = W.matchPrior * (game.match / 100);

  // Recency penalty: how often we've shown this game in the last 24h.
  const recent = profile.recentImpressions.get(game.id) ?? 0;
  parts.recencyPenalty = W.recencyPenalty * recent;

  const total = Object.values(parts).reduce((s, v) => s + v, 0);

  return {
    game,
    total,
    parts,
    sources: [...sources.keys()],
  };
}
