// Feature extraction for games. Maps each Game into a low-dimensional vector
// that the ranker uses for content-similarity scoring (X-algorithm analog of
// what TwHIN content embeddings give them — but hand-crafted instead of
// learned, because we have 43 games not 19M tweets).

import { Game } from '../../data/games';

export type GameFeatureVector = {
  // Categorical one-hot — must match game.category values
  isChill: number;
  isReflex: number;
  isBrain: number;
  isTiming: number;
  isStrategy: number;
  isSpot: number;

  // Mechanic primitives (0/1)
  usesTap: number;
  usesSwipe: number;
  usesDraw: number;
  usesType: number;
  usesMemory: number;
  usesPour: number;
  usesGrid: number;
  usesRhythm: number;

  // Continuous features (normalized 0..1)
  durationTier: number; // 0 = instant (<30s), 0.5 = casual (30-90s), 1 = sit-down (>90s)
};

// Slug sets derived directly from game.category in games.ts so they stay
// in sync as new games are added.
const CHILL_SLUGS = new Set([
  'color-flood', 'water-sort',
]);
const REFLEX_SLUGS = new Set([
  'tap-rush', 'perfect-circle', 'reflex-333', 'swipe-snake', 'falling-letters',
  'tetris-mini', 'whack-mole', 'balloon-pop', 'catch-drop', 'speed-sort',
  'zigzag', 'coin-grab',
]);
const BRAIN_SLUGS = new Set([
  'word-blast', 'color-snipe', 'connect', 'emoji-match', 'slide-15',
  'wordle-5', 'picross', 'number-order', 'math-blitz', 'simon-says',
  'flip-duo', 'block-fill', 'color-order', 'number-flash', 'angle-guess',
  'dot-chain',
]);
const TIMING_SLUGS = new Set([
  'stack-it', 'beat-tap', 'nerve-pulse', 'gravity-flip', 'runner-jump',
  'tower-stack', 'balance', 'wave-match',
]);
const STRATEGY_SLUGS = new Set([
  'merge-wave', 'chain-boom',
]);
const SPOT_SLUGS = new Set([
  'odd-color', 'spot-change',
]);

const MECHANIC_BY_SLUG: Record<string, Partial<GameFeatureVector>> = {
  // Original 19
  'color-flood':     { usesTap: 1, usesGrid: 1 },
  'tap-rush':        { usesTap: 1 },
  'word-blast':      { usesTap: 1, usesType: 1 },
  'stack-it':        { usesTap: 1 },
  'merge-wave':      { usesSwipe: 1, usesGrid: 1 },
  'perfect-circle':  { usesDraw: 1 },
  'reflex-333':      { usesTap: 1 },
  'color-snipe':     { usesTap: 1 },
  'swipe-snake':     { usesSwipe: 1, usesGrid: 1 },
  'water-sort':      { usesTap: 1, usesPour: 1 },
  'beat-tap':        { usesTap: 1, usesRhythm: 1 },
  'emoji-match':     { usesTap: 1, usesMemory: 1, usesGrid: 1 },
  'nerve-pulse':     { usesDraw: 1 },
  'falling-letters': { usesTap: 1, usesType: 1 },
  'connect':         { usesDraw: 1, usesGrid: 1 },
  'slide-15':        { usesTap: 1, usesGrid: 1 },
  'wordle-5':        { usesTap: 1, usesType: 1, usesGrid: 1 },
  'picross':         { usesTap: 1, usesGrid: 1, usesMemory: 1 },
  'tetris-mini':     { usesTap: 1, usesGrid: 1 },
  // New 24
  'number-order':    { usesTap: 1, usesGrid: 1 },
  'math-blitz':      { usesTap: 1, usesType: 1 },
  'simon-says':      { usesTap: 1, usesMemory: 1 },
  'whack-mole':      { usesTap: 1, usesGrid: 1 },
  'balloon-pop':     { usesTap: 1 },
  'flip-duo':        { usesTap: 1, usesMemory: 1, usesGrid: 1 },
  'gravity-flip':    { usesTap: 1 },
  'catch-drop':      { usesSwipe: 1 },
  'speed-sort':      { usesSwipe: 1 },
  'runner-jump':     { usesTap: 1 },
  'odd-color':       { usesTap: 1, usesGrid: 1 },
  'coin-grab':       { usesTap: 1, usesSwipe: 1 },
  'tower-stack':     { usesTap: 1 },
  'block-fill':      { usesTap: 1, usesGrid: 1 },
  'color-order':     { usesTap: 1 },
  'number-flash':    { usesTap: 1, usesMemory: 1 },
  'zigzag':          { usesTap: 1 },
  'chain-boom':      { usesTap: 1, usesGrid: 1 },
  'balance':         { usesTap: 1 },
  'angle-guess':     { usesDraw: 1 },
  'wave-match':      { usesDraw: 1 },
  'dot-chain':       { usesDraw: 1, usesGrid: 1 },
  'spot-change':     { usesTap: 1, usesGrid: 1 },
};

function durationTier(s: string): number {
  // "~30 сек", "~1 мин", "~90 сек", "~2 мин", etc.
  const m = s.match(/(\d+)\s*(сек|мин)/i);
  if (!m) return 0.5;
  const n = parseInt(m[1], 10);
  const sec = m[2].toLowerCase().startsWith('сек') ? n : n * 60;
  if (sec < 30) return 0;
  if (sec < 90) return 0.5;
  return 1;
}

export function extractFeatures(game: Game): GameFeatureVector {
  const base: GameFeatureVector = {
    isChill: CHILL_SLUGS.has(game.slug) ? 1 : 0,
    isReflex: REFLEX_SLUGS.has(game.slug) ? 1 : 0,
    isBrain: BRAIN_SLUGS.has(game.slug) ? 1 : 0,
    isTiming: TIMING_SLUGS.has(game.slug) ? 1 : 0,
    isStrategy: STRATEGY_SLUGS.has(game.slug) ? 1 : 0,
    isSpot: SPOT_SLUGS.has(game.slug) ? 1 : 0,
    usesTap: 0, usesSwipe: 0, usesDraw: 0, usesType: 0,
    usesMemory: 0, usesPour: 0, usesGrid: 0, usesRhythm: 0,
    durationTier: durationTier(game.duration),
  };
  return { ...base, ...MECHANIC_BY_SLUG[game.slug] };
}

export function cosine(a: GameFeatureVector, b: GameFeatureVector): number {
  const keys = Object.keys(a) as Array<keyof GameFeatureVector>;
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
