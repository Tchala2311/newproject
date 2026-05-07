# Луп recommender — design notes

This is a **two-stage recommender** for the "Для тебя" feed, modeled
architecturally on X's open-source algorithm
([xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)).

We can't replicate X at full fidelity — they have a learned
embedding space (TwHIN), a graph DB (RealGraph), Heron streaming
ranking models (Light + Heavy / MaskNet), and a Scala mixer
(Home Mixer). With 19 games and a Postgres on Supabase, the
appropriate answer is heuristics-with-the-same-shape.

## Pipeline

```
       ┌─────────────────────────┐
user → │ buildUserProfile()      │ ← likes, saves, comments, plays,
       │  - perGameWeight        │   completes, follows, recent impressions
       │  - contentVector        │
       │  - following            │
       │  - recentImpressions    │
       └────────────┬────────────┘
                    │
       ┌────────────▼────────────────────────────────────────────┐
       │ Candidate sources (parallel)                            │
       │   inNetworkCandidates    — followed creators            │
       │   contentSimilarCandidates — cosine sim on features     │
       │   trendingCandidates     — 24h engagement velocity      │
       │   coEngagedCandidates    — collaborative filtering      │
       │   fallbackCandidates     — cold-start diversified pool  │
       └────────────┬────────────────────────────────────────────┘
                    │
                    ▼
              mergeCandidates()  ← keep strongest signal per game,
                                   record all sources it came from
                    │
                    ▼
              rankCandidate()    ← linear scorer: weighted sum of
                                   per-source signals + priors
                                   - recency penalty
                    │
                    ▼
              assembleFeed()     ← diversity rules, ad slots,
                                   exploration slots, length cap
                    │
                    ▼
                FlatList
```

## Mapping to X-algorithm

| X concept | Our analog | File |
|---|---|---|
| TwHIN content embeddings | Hand-crafted feature vector (category, mechanic, duration, hue) | `features.ts` |
| RealGraph user-edge weights | `perGameWeight` from likes/saves/comments/plays + decay | `userProfile.ts` |
| Candidate Source: Followed (in-network) | `inNetworkCandidates` | `candidates.ts` |
| Candidate Source: Most-Liked-by-Followers (out-network) | `coEngagedCandidates` (RPC) | `candidates.ts` + schema RPC |
| Candidate Source: Trending | `trendingCandidates` (24h velocity) | `candidates.ts` + `recommend_signals` RPC |
| Light Ranker (TLR) | Implicit — all candidates pass through; ranker weights are the gate | `ranker.ts` |
| Heavy Ranker (MaskNet) | Linear scorer with hand-tuned weights; same shape, no NN | `ranker.ts` |
| Home Mixer (diversity, ad inject) | `assembleFeed` with diversity + ad cadence + exploration | `mixer.ts` |
| Negative feedback loop | `feed_impressions` table + `recencyPenalty` weight | schema + `ranker.ts` |
| Cold-start | `isColdStart` flag → `fallbackCandidates` path | `userProfile.ts` + `index.ts` |

## What signals we use

Per-event weights (decayed exponentially with 14-day half-life):

| Event | Weight | Why |
|---|---:|---|
| comment | 6 | Highest-effort signal; strongest interest |
| save | 5 | Explicit "I want to come back" |
| complete (won) | 4 | Played to the end and succeeded |
| like | 3 | Quick endorsement |
| play | 2 | At least started |
| complete (lost) | 1 | Engaged but didn't enjoy enough to win |
| view | 0.5 | Saw the card; weak signal |

Ranker weights (linear combination):

| Feature | Weight | Notes |
|---|---:|---|
| inNetwork | 4.0 | Followed creator — strongest implicit endorsement |
| coEngaged | 3.0 | "People who liked X also liked Y" |
| contentSimilar | 2.0 | Cosine similarity on feature vector |
| trending | 1.2 | 24h engagement velocity |
| priorAffinity | 0.4 | Already engaged with this game (log-scaled) |
| matchPrior | 0.3 | Curator-defined match% as tie-breaker |
| recencyPenalty | -0.6 | Per-impression in last 24h (avoid feed repetition) |

## Mixer rules

- No two adjacent same-category cards (skip-and-defer if alternatives exist)
- Max 2 games per creator in the feed
- Ad slot every 4th game
- Exploration slot every 7th — random unranked game (gives cold-start signals + breaks filter bubbles)
- Length cap: 22 cards default

## What we log

`public.feed_impressions(user_id, game_id, position, shown_at, dwell_ms, engaged)`

- Inserted when a card becomes visible (`logImpression()`).
- `engaged` flips to `true` when user likes/saves/comments/plays during the
  same session (`markEngaged()` reaches back ≤6h).
- This table is the future training data for replacing the linear ranker
  with a learned model — once we have ~10k rows with engagement labels,
  any logistic regression / gradient-boosted tree will outperform the
  hand-tuned weights.

## What's deliberately not in scope

- **Learned ranker.** Too few impressions yet. The linear scorer above is
  designed to be replaced wholesale by a model later.
- **Embedding-based content sim.** Feature vector is hand-crafted. Once
  we hit ~100 games and ~1000 active users, swap in a co-engagement
  matrix factorization (truncated SVD over the user×game like matrix).
- **Realtime updates.** We rebuild the profile + feed on each "Для тебя"
  open. With WebSockets / Supabase realtime, we could push deltas.
- **A/B framework.** No bandit / arm assignment. Add when we have
  multiple ranker variants to compare.

## Tuning knobs

All weights live in `src/lib/recommender/ranker.ts:W`. Mixer cadence
constants in `src/lib/recommender/mixer.ts`. Decay rate in
`src/lib/recommender/userProfile.ts:DECAY_HALF_LIFE_DAYS`.
