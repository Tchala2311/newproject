// Pure function: given a snapshot of user state, return the set of
// achievements that should now be unlocked. The provider compares against
// the already-unlocked set and only fires new ones.

import { Game, GAMES } from '../../data/games';
import { ACHIEVEMENTS, CLASSIC_GAME_SLUGS } from './catalog';

export type CheckContext = {
  unlocked: Set<string>;
  totalLikes: number;
  totalComments: number;
  totalFollows: number;
  totalPlays: number;
  totalAdViews: number;
  // Per-game progress data
  progress: Map<number, { best_level: number; best_score: number; retries: number; total_plays: number }>;
  // Last completed event (for time-based achievements)
  lastEventHour?: number;
  // Last game just completed
  justCompleted?: { game: Game; level: number; passed: boolean; durationMs?: number };
  // Drawing precision percent (PerfectCircle)
  lastCirclePercent?: number;
  // Reflex ms (Reflex333)
  lastReflexMs?: number;
  // Wordle attempts
  lastWordleAttempts?: number;
  // Tetris cumulative lines
  totalTetrisLines?: number;
  // Has user signed up?
  hasAccount: boolean;
};

export function checkAchievements(ctx: CheckContext): string[] {
  const unlocked: string[] = [];
  const has = (id: string) => ctx.unlocked.has(id);
  const fire = (id: string) => { if (!has(id)) unlocked.push(id); };

  if (ctx.hasAccount) fire('newbie');
  if (ctx.totalPlays >= 1) fire('first-blood');

  // Classical lover — reach lvl 5 in any classic game
  for (const [gameId, p] of ctx.progress) {
    if (p.best_level >= 5) {
      // we don't have slug here, look it up via game ref in justCompleted; fallback: just check if any classic game has lvl 5
    }
  }
  if (ctx.justCompleted && CLASSIC_GAME_SLUGS.has(ctx.justCompleted.game.slug) && ctx.justCompleted.passed && ctx.justCompleted.level >= 5) {
    fire('classical-lover');
  }

  // Persistent — retried any one level 10+ times
  for (const p of ctx.progress.values()) {
    if (p.retries >= 10) { fire('persistant'); break; }
  }

  if (ctx.totalPlays >= 50) fire('gym-bro');
  if (ctx.totalLikes >= 10) fire('serial-liker');
  if (ctx.totalComments >= 1) fire('commenter');
  if (ctx.totalFollows >= 5) fire('follower');
  if (ctx.totalAdViews >= 10) fire('ad-survivor');

  if (ctx.lastCirclePercent !== undefined && ctx.lastCirclePercent >= 95) fire('precision-95');
  if (ctx.lastReflexMs !== undefined && ctx.lastReflexMs < 300) fire('reflex-sub-300');
  if ((ctx.totalTetrisLines ?? 0) >= 100) fire('tetris-100');
  if (ctx.lastWordleAttempts !== undefined && ctx.lastWordleAttempts <= 3) fire('wordle-3');

  // Time of day
  if (ctx.lastEventHour !== undefined) {
    if (ctx.lastEventHour >= 0 && ctx.lastEventHour < 5) fire('night-owl');
    if (ctx.lastEventHour >= 5 && ctx.lastEventHour < 7) fire('morning-bird');
  }

  // Speedrunner — passed 5 levels with avg duration < 12s
  // (require justCompleted.durationMs and aggregate via progress.total_plays — simplified)
  if (ctx.justCompleted?.passed && (ctx.justCompleted.durationMs ?? 999000) < 12000) {
    let fastWinsAcrossGames = 0;
    for (const p of ctx.progress.values()) if (p.best_level >= 5) fastWinsAcrossGames += 1;
    if (fastWinsAcrossGames >= 5) fire('speedrunner');
  }

  // Completionist — best_level >= 5 in EVERY game. Derive the count from the
  // catalog so it stays correct as games are added (was a stale hardcoded 19).
  let lvl5OrMore = 0;
  for (const p of ctx.progress.values()) if (p.best_level >= 5) lvl5OrMore += 1;
  if (lvl5OrMore >= GAMES.length) fire('completionist');

  // Collector — 10 unlocked total (computed AFTER above so it can chain on the same call)
  const wouldUnlockCount = ctx.unlocked.size + unlocked.length;
  if (wouldUnlockCount >= 10) fire('collector');

  return unlocked;
}

// Filter the achievement catalog into known/unknown for display.
export function partition(unlocked: Set<string>) {
  const owned: string[] = [];
  const locked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    (unlocked.has(a.id) ? owned : locked).push(a.id);
  }
  return { owned, locked };
}
