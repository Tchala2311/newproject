// In-session online re-ranking — the "feed adapts as you scroll" behaviour that
// makes TikTok feel alive. The server-side profile (buildUserProfile) captures
// long-term taste with time decay; this layer reacts INSTANTLY, with zero
// network latency, to what you do in the current session.
//
// We accumulate a lightweight affinity (per category + a running content-feature
// vector) from live signals, then re-sort the UNSEEN tail of the feed so the
// next cards lean toward what you're engaging with and away from what you skip.

import { GAMES, Game } from '../../data/games';
import { extractFeatures, cosine, GameFeatureVector } from './features';
import { FeedItem } from './mixer';

export type SessionKind =
  | 'play' | 'complete' | 'like' | 'save' | 'comment' | 'share'
  | 'dwellLong' | 'dwellShort' | 'fastSkip' | 'notInterested';

// Signed weights — positive pulls the feed toward similar content, negative
// pushes it away. Tuned so a play/complete clearly outweighs a single skip but
// a streak of skips still visibly steers the feed.
const KIND_WEIGHT: Record<SessionKind, number> = {
  complete: 3.0,
  play: 2.5,
  save: 2.0,
  like: 1.6,
  comment: 1.6,
  share: 1.4,
  dwellLong: 1.0,   // lingered on the card without playing — mild interest
  dwellShort: -0.5, // quick swipe-past — mild disinterest
  fastSkip: -1.4,   // immediate swipe — clear disinterest
  notInterested: -4.0,
};

// How strongly the session moves a candidate's rank. Capped so it can reorder
// the tail meaningfully without completely overriding the base (server) score.
const CATEGORY_BOOST = 0.45;
const FEATURE_BOOST = 2.2;
const BOOST_CAP = 6;

const catAffinity = new Map<string, number>();
let featureVec: GameFeatureVector | null = null;
const suppressed = new Set<number>();

function zeroVec(): GameFeatureVector {
  const v = extractFeatures(GAMES[0]);
  (Object.keys(v) as Array<keyof GameFeatureVector>).forEach((k) => { v[k] = 0; });
  return v;
}

export function recordSessionSignal(game: Game, kind: SessionKind) {
  const w = KIND_WEIGHT[kind];
  catAffinity.set(game.category, (catAffinity.get(game.category) ?? 0) + w);
  if (!featureVec) featureVec = zeroVec();
  const f = extractFeatures(game);
  (Object.keys(featureVec) as Array<keyof GameFeatureVector>).forEach((k) => {
    featureVec![k] += f[k] * w;
  });
  // "Не интересно" hard-suppresses the exact game for the rest of the session;
  // similar games get softly down-ranked via the negative category/feature pull.
  if (kind === 'notInterested') suppressed.add(game.id);
}

// Additive score adjustment for one game given everything learned this session.
export function sessionBoost(game: Game): number {
  if (suppressed.has(game.id)) return -1000;
  const cat = catAffinity.get(game.category) ?? 0;
  const feat = featureVec ? cosine(featureVec, extractFeatures(game)) : 0;
  const raw = cat * CATEGORY_BOOST + feat * FEATURE_BOOST;
  return Math.max(-BOOST_CAP, Math.min(BOOST_CAP, raw));
}

const scoreOf = (it: FeedItem): number =>
  it.type === 'game' ? (it.score ?? 0) + sessionBoost(it.game) : 0;

// Re-rank ONLY the unseen tail (strictly after `keepThrough`). Ad slots stay
// pinned at their positions so the ad cadence — and the very next card — never
// jump under the user. Returns the same array identity when nothing reorders,
// so callers can pass it straight to setState without a wasted re-render.
export function reorderFeedTail(items: FeedItem[], keepThrough: number): FeedItem[] {
  if (keepThrough >= items.length - 2) return items;
  const head = items.slice(0, keepThrough + 1);
  const tail = items.slice(keepThrough + 1);

  const games = tail.filter((it): it is Extract<FeedItem, { type: 'game' }> => it.type === 'game');
  const sortedGames = [...games].sort((a, b) => scoreOf(b) - scoreOf(a));

  let gi = 0;
  const rebuiltTail = tail.map((it) => (it.type === 'ad' ? it : sortedGames[gi++]));

  const changed = rebuiltTail.some((it, i) => it !== tail[i]);
  if (!changed) return items;
  return [...head, ...rebuiltTail];
}

// Clear everything — call on user switch so one account's session can't bleed
// into another's.
export function resetSession() {
  catAffinity.clear();
  featureVec = null;
  suppressed.clear();
}
