import { GAMES, Game } from '../data/games';

// Pick a deterministic "challenge of the day". Same game for every user on
// any given day, rotates through the catalog so no game repeats too soon.
//
// Implementation detail: hash YYYY-MM-DD to an int and modulo GAMES.length.
// This means we don't need a backend table to assign the daily challenge —
// the *result* (scores) goes into Supabase, but the *selection* is pure.

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Cheap deterministic hash — good enough for rotation.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyChallenge(d = new Date()): { game: Game; day: string; seed: number } {
  const day = dayKey(d);
  const idx = hash(day) % GAMES.length;
  return { game: GAMES[idx], day, seed: hash(day + ':seed') };
}

export function isToday(day: string): boolean {
  return day === dayKey();
}
