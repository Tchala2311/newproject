// Feature extraction for games. Maps each Game into a low-dimensional vector
// that the ranker uses for content-similarity scoring (X-algorithm analog of
// what TwHIN content embeddings give them — but hand-crafted instead of
// learned, because we have 19 games not 19M tweets).

import { Game } from '../../data/games';

export type GameFeatureVector = {
  // Categorical one-hot
  isChill: number;
  isReflex: number;
  isBrain: number;
  isTiming: number;
  isStrategy: number;

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
  durationTier: number;       // 0 = instant (<30s), 0.5 = casual (30-90s), 1 = sit-down (>90s)
  difficulty: number;         // 0..1 based on match%
  hueDeg: number;             // accent hex hue, normalized
};

const CHILL_SLUGS = new Set(['color-flood', 'water-sort', 'merge-wave']);
const REFLEX_SLUGS = new Set(['tap-rush', 'reflex-333', 'swipe-snake', 'falling-letters', 'tetris-mini']);
const BRAIN_SLUGS = new Set(['word-blast', 'color-snipe', 'connect', 'emoji-match', 'slide-15', 'wordle-5', 'picross']);
const TIMING_SLUGS = new Set(['stack-it', 'beat-tap', 'nerve-pulse', 'perfect-circle']);

const MECHANIC_BY_SLUG: Record<string, Partial<GameFeatureVector>> = {
  'color-flood':    { usesTap: 1, usesGrid: 1 },
  'tap-rush':       { usesTap: 1 },
  'word-blast':     { usesTap: 1, usesType: 1 },
  'stack-it':       { usesTap: 1 },
  'merge-wave':     { usesSwipe: 1, usesGrid: 1 },
  'perfect-circle': { usesDraw: 1 },
  'reflex-333':     { usesTap: 1 },
  'color-snipe':    { usesTap: 1 },
  'swipe-snake':    { usesSwipe: 1, usesGrid: 1 },
  'water-sort':     { usesTap: 1, usesPour: 1 },
  'beat-tap':       { usesTap: 1, usesRhythm: 1 },
  'emoji-match':    { usesTap: 1, usesMemory: 1, usesGrid: 1 },
  'nerve-pulse':    { usesDraw: 1 },
  'falling-letters':{ usesTap: 1, usesType: 1 },
  'connect':        { usesDraw: 1, usesGrid: 1 },
  'slide-15':       { usesTap: 1, usesGrid: 1 },
  'wordle-5':       { usesTap: 1, usesType: 1, usesGrid: 1 },
  'picross':        { usesTap: 1, usesGrid: 1, usesMemory: 1 },
  'tetris-mini':    { usesTap: 1, usesGrid: 1 },
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

function hexToHue(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hue / 360; // 0..1
}

export function extractFeatures(game: Game): GameFeatureVector {
  const base: GameFeatureVector = {
    isChill: CHILL_SLUGS.has(game.slug) ? 1 : 0,
    isReflex: REFLEX_SLUGS.has(game.slug) ? 1 : 0,
    isBrain: BRAIN_SLUGS.has(game.slug) ? 1 : 0,
    isTiming: TIMING_SLUGS.has(game.slug) ? 1 : 0,
    isStrategy: game.category === 'strategy' ? 1 : 0,
    usesTap: 0, usesSwipe: 0, usesDraw: 0, usesType: 0,
    usesMemory: 0, usesPour: 0, usesGrid: 0, usesRhythm: 0,
    durationTier: durationTier(game.duration),
    difficulty: 1 - game.match / 100, // higher match = easier vibes for THIS user
    hueDeg: hexToHue(game.accent),
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
