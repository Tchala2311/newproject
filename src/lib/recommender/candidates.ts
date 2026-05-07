// Candidate generation — three independent sources, each producing
// (game_id, source_score) pairs. Mirrors X-algorithm's candidate sources:
//   - in-network  (followed creators)            => "follow signal"
//   - out-network similar (content similarity)   => TwHIN-like
//   - trending (engagement velocity 24h)         => Top Tweets in trending sources
// Plus a 4th — co-engagement / collaborative — which X separates as a
// dedicated TwHIN candidate source.

import { supabase } from '../supabase';
import { GAMES, Game } from '../../data/games';
import { extractFeatures, cosine } from './features';
import { UserProfile } from './userProfile';

export type CandidateSource = 'inNetwork' | 'contentSimilar' | 'trending' | 'coEngaged' | 'fallback';

export type Candidate = {
  game: Game;
  source: CandidateSource;
  rawScore: number; // 0..1ish per source
};

export type Signals = {
  totalLikes: Map<number, number>;
  trendingScore: Map<number, number>;
};

// Pull aggregated engagement signals (one round-trip via the schema RPC).
export async function fetchSignals(): Promise<Signals> {
  const { data, error } = await supabase.rpc('recommend_signals');
  const totalLikes = new Map<number, number>();
  const trendingScore = new Map<number, number>();
  if (error || !data) return { totalLikes, trendingScore };
  for (const row of data as any[]) {
    totalLikes.set(row.game_id, Number(row.total_likes));
    // Same formula as schema doc: weighted recency
    const t = Number(row.likes_24h) * 3 + Number(row.comments_24h) * 5 + Number(row.saves_24h) * 4;
    trendingScore.set(row.game_id, t);
  }
  return { totalLikes, trendingScore };
}

// 1) IN-NETWORK: games whose creators the user follows.
export function inNetworkCandidates(profile: UserProfile): Candidate[] {
  return GAMES
    .filter((g) => profile.following.has(g.creator.handle))
    .map((g) => ({ game: g, source: 'inNetwork' as const, rawScore: 1 }));
}

// 2) CONTENT-SIMILAR: games whose feature vector is closest to the user's
//    aggregated content vector.
export function contentSimilarCandidates(profile: UserProfile, k = 12): Candidate[] {
  if (!profile.contentVector) return [];
  return GAMES
    .map((g) => ({ game: g, similarity: cosine(profile.contentVector!, extractFeatures(g)) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
    .map((x) => ({ game: x.game, source: 'contentSimilar' as const, rawScore: x.similarity }));
}

// 3) TRENDING: weighted velocity over last 24h.
export function trendingCandidates(signals: Signals, k = 8): Candidate[] {
  const max = Math.max(1, ...signals.trendingScore.values());
  return [...signals.trendingScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([gameId, score]) => {
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) return null;
      return { game, source: 'trending' as const, rawScore: score / max };
    })
    .filter(Boolean) as Candidate[];
}

// 4) CO-ENGAGED: users who liked games you liked also liked these.
export async function coEngagedCandidates(userId: string, k = 12): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc('co_engagement_for_user', { uid: userId, top_n: k });
  if (error || !data) return [];
  const max = Math.max(1, ...(data as any[]).map((r) => Number(r.score)));
  return (data as any[])
    .map((r) => {
      const game = GAMES.find((g) => g.id === r.game_id);
      if (!game) return null;
      return {
        game,
        source: 'coEngaged' as const,
        rawScore: Number(r.score) / max,
      };
    })
    .filter(Boolean) as Candidate[];
}

// FALLBACK: cold-start users get the curated catalog with a small randomization.
// Mirrors X-algorithm's "Candidate Source: Most Followed" + random shuffle.
export function fallbackCandidates(): Candidate[] {
  return GAMES
    .map((g) => ({ game: g, source: 'fallback' as const, rawScore: g.match / 100 + Math.random() * 0.2 }));
}

// Merge candidates from multiple sources, keeping the strongest signal per
// game and remembering all sources it was produced by (used by the ranker for
// "in-network boost" features).
export function mergeCandidates(
  ...lists: Candidate[][]
): Map<number, { game: Game; sources: Map<CandidateSource, number> }> {
  const out = new Map<number, { game: Game; sources: Map<CandidateSource, number> }>();
  for (const list of lists) {
    for (const c of list) {
      const existing = out.get(c.game.id);
      if (!existing) {
        out.set(c.game.id, { game: c.game, sources: new Map([[c.source, c.rawScore]]) });
      } else {
        const prev = existing.sources.get(c.source) ?? 0;
        if (c.rawScore > prev) existing.sources.set(c.source, c.rawScore);
      }
    }
  }
  return out;
}
