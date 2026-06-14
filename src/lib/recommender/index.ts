// Public API: build a ranked feed for a given user. Wraps the candidate
// generators, the ranker, and the mixer.

import { supabase } from '../supabase';
import { GAMES } from '../../data/games';
import { buildUserProfile, UserProfile } from './userProfile';
import {
  fetchSignals,
  inNetworkCandidates,
  contentSimilarCandidates,
  trendingCandidates,
  coEngagedCandidates,
  fallbackCandidates,
  mergeCandidates,
} from './candidates';
import { rankCandidate, ScoredCandidate } from './ranker';
import { assembleFeed, FeedItem } from './mixer';

export type FeedRequest = {
  userId: string | null;
  followsLocal: Record<string, boolean>;
  notInterestedLocal?: Record<number, boolean>;
  targetLength?: number;
  // Refresh nonce — increments on pull-to-refresh. Adds light jitter to scores
  // so the user sees a *visibly* different feed when they pull, even when no
  // backend signal has changed. (TikTok / Reels behaviour.)
  refreshNonce?: number;
};

export type FeedResult = {
  items: FeedItem[];
  profile: UserProfile;
  ranked: ScoredCandidate[];
};

export async function getRankedFeed(req: FeedRequest): Promise<FeedResult> {
  const { userId, followsLocal, notInterestedLocal = {}, targetLength = 20, refreshNonce = 0 } = req;

  const profile = await buildUserProfile(userId, followsLocal, notInterestedLocal);
  const signals = await fetchSignals();

  // Cold-start path: no behavioral data → diversified curated catalog,
  // small randomization. We still log impressions so the next call has data.
  if (profile.isColdStart) {
    const candidates = fallbackCandidates();
    const ranked = candidates.map((c) =>
      rankCandidate(c.game, new Map([['fallback' as const, c.rawScore]]), profile)
    );
    if (refreshNonce > 0) {
      ranked.forEach((r) => { r.total += (Math.random() - 0.5) * 2.5; });
    }
    return { items: assembleFeed(ranked, targetLength), profile, ranked };
  }

  // Three (or four) candidate sources, in parallel where I/O is involved.
  const [coEngaged] = await Promise.all([
    userId ? coEngagedCandidates(userId, 12) : Promise.resolve([]),
  ]);

  const merged = mergeCandidates(
    inNetworkCandidates(profile),
    contentSimilarCandidates(profile, 12),
    trendingCandidates(signals, 8),
    coEngaged
  );

  // If the union is too small (very small DB), add the rest of the catalog
  // as low-weight fallback so the feed always has something fresh.
  for (const game of GAMES) {
    if (!merged.has(game.id)) {
      merged.set(game.id, { game, sources: new Map([['fallback', 0.2 + Math.random() * 0.1]]) as any });
    }
  }

  const ranked = [...merged.values()]
    .map(({ game, sources }) => rankCandidate(game, sources, profile));

  // Refresh jitter: large enough to visibly reorder the feed on every pull.
  // Top item gets mild jitter so the best match still tends to surface;
  // everything else gets strong jitter so the order feels genuinely fresh.
  if (refreshNonce > 0) {
    ranked.sort((a, b) => b.total - a.total);
    ranked.forEach((r, i) => {
      const strength = i === 0 ? 0.4 : 2.5;
      r.total += (Math.random() - 0.5) * strength;
    });
  }

  return { items: assembleFeed(ranked, targetLength), profile, ranked };
}

// Log an impression for one game card. Best-effort fire-and-forget; never
// blocks the UI thread waiting for the network.
export function logImpression(userId: string | null, gameId: number, position: number) {
  if (!userId) return;
  supabase
    .from('feed_impressions')
    .insert({ user_id: userId, game_id: gameId, position })
    .then(({ error }) => {
      if (error && __DEV__) console.warn('impression log failed', error.message);
    });
}

// Mark the most recent impression of a game by this user as engaged
// (called when the user likes/saves/comments/plays).
export async function markEngaged(userId: string | null, gameId: number) {
  if (!userId) return;
  await supabase
    .from('feed_impressions')
    .update({ engaged: true })
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .gte('shown_at', new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString())
    .then(({ error }) => {
      if (error && __DEV__) console.warn('mark engaged failed', error.message);
    });
}
