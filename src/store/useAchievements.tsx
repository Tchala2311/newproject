// Provider that fetches the user's unlocked achievements, exposes a
// `report(event)` API for game/social code to call, and runs the checker
// to detect new unlocks. New unlocks are persisted to public.user_achievements
// and surfaced via lastUnlocked for the UI to toast.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useUser } from './useUser';
import { usePrefs } from './usePrefs';
import { ACHIEVEMENTS_BY_ID, Achievement } from '../lib/achievements/catalog';
import { CheckContext, checkAchievements } from '../lib/achievements/checker';
import { Game } from '../data/games';

export type GameProgressRow = {
  game_id: number;
  level: number;
  best_level: number;
  best_score: number;
  total_plays: number;
  total_wins: number;
  total_losses: number;
  retries: number;
};

type ReportEvent =
  | { type: 'play-start'; game: Game }
  | { type: 'level-complete'; game: Game; level: number; passed: boolean; score: number; durationMs?: number; meta?: Record<string, number> }
  | { type: 'comment' }
  | { type: 'follow' }
  | { type: 'ad-view' };

type State = {
  unlocked: Set<string>;
  progressByGame: Map<number, GameProgressRow>;
  recentGameIds: number[];
  lastUnlocked: Achievement | null;
  clearLastUnlocked: () => void;
  report: (e: ReportEvent) => void;
  getResumeFor: (gameId: number) => Pick<GameProgressRow, 'level' | 'best_level' | 'best_score'> | null;
  clearResume: (gameId: number) => Promise<void>;
};

const Ctx = createContext<State | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { likes } = usePrefs();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [progressByGame, setProgressByGame] = useState<Map<number, GameProgressRow>>(new Map());
  const [recentGameIds, setRecentGameIds] = useState<number[]>([]);
  const [unlockQueue, setUnlockQueue] = useState<Achievement[]>([]);
  const tetrisLinesRef = useRef(0);
  const adViewsRef = useRef(0);

  // Persist + hydrate recent game IDs independently of Supabase.
  useEffect(() => {
    AsyncStorage.getItem('loop:recent:v1').then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentGameIds(parsed);
      } catch {}
    }).catch(() => {});
  }, []);

  const pushRecent = useCallback((gameId: number) => {
    setRecentGameIds((prev) => {
      const next = [gameId, ...prev.filter((id) => id !== gameId)].slice(0, 20);
      AsyncStorage.setItem('loop:recent:v1', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Hydrate
  useEffect(() => {
    if (!user) {
      setUnlocked(new Set());
      setProgressByGame(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const [achRes, progRes] = await Promise.all([
        supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
        supabase.from('game_progress').select('*').eq('user_id', user.id),
      ]);
      if (cancelled) return;
      if (achRes.data) setUnlocked(new Set((achRes.data as any[]).map((r) => r.achievement_id)));
      if (progRes.data) {
        const m = new Map<number, GameProgressRow>();
        (progRes.data as GameProgressRow[]).forEach((r) => m.set(r.game_id, r));
        setProgressByGame(m);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const persistProgress = useCallback(async (gameId: number, patch: Partial<GameProgressRow>) => {
    if (!user) return;
    const existing = progressByGame.get(gameId);
    const next: GameProgressRow = {
      game_id: gameId,
      level: existing?.level ?? 1,
      best_level: existing?.best_level ?? 1,
      best_score: existing?.best_score ?? 0,
      total_plays: existing?.total_plays ?? 0,
      total_wins: existing?.total_wins ?? 0,
      total_losses: existing?.total_losses ?? 0,
      retries: existing?.retries ?? 0,
      ...patch,
    };
    const m = new Map(progressByGame);
    m.set(gameId, next);
    setProgressByGame(m);
    await supabase
      .from('game_progress')
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error && __DEV__) console.warn('progress upsert failed'); });
  }, [user?.id, progressByGame]);

  const persistUnlocks = useCallback(async (ids: string[]) => {
    if (!user || !ids.length) return;
    const rows = ids.map((id) => ({ user_id: user.id, achievement_id: id }));
    const { error } = await supabase.from('user_achievements').upsert(rows, { onConflict: 'user_id,achievement_id' });
    if (error && __DEV__) console.warn('achievement insert failed');
  }, [user?.id]);

  const runChecker = useCallback((extra: Partial<CheckContext>) => {
    const ctx: CheckContext = {
      unlocked,
      totalLikes: Object.values(likes).filter(Boolean).length,
      totalComments: 0,
      totalFollows: 0,
      totalPlays: [...progressByGame.values()].reduce((s, p) => s + p.total_plays, 0),
      totalAdViews: adViewsRef.current,
      progress: progressByGame,
      hasAccount: !!user,
      totalTetrisLines: tetrisLinesRef.current,
      ...extra,
    };
    const newIds = checkAchievements(ctx);
    if (!newIds.length) return;
    setUnlocked((prev) => {
      const n = new Set(prev);
      newIds.forEach((id) => n.add(id));
      return n;
    });
    setUnlockQueue((q) => [...q, ...newIds.map((id) => ACHIEVEMENTS_BY_ID[id]).filter(Boolean)]);
    persistUnlocks(newIds);
  }, [unlocked, likes, progressByGame, user, persistUnlocks]);

  const report = useCallback((e: ReportEvent) => {  // eslint-disable-line react-hooks/exhaustive-deps
    switch (e.type) {
      case 'play-start': {
        const cur = progressByGame.get(e.game.id);
        persistProgress(e.game.id, { total_plays: (cur?.total_plays ?? 0) + 1 });
        pushRecent(e.game.id);
        break;
      }
      case 'level-complete': {
        const cur = progressByGame.get(e.game.id);
        if (e.passed) {
          const newLevel = e.level + 1;
          const bestLevel = Math.max(cur?.best_level ?? 0, e.level);
          const bestScore = Math.max(cur?.best_score ?? 0, e.score);
          persistProgress(e.game.id, {
            level: newLevel,
            best_level: bestLevel,
            best_score: bestScore,
            total_wins: (cur?.total_wins ?? 0) + 1,
          });
        } else {
          persistProgress(e.game.id, {
            retries: (cur?.retries ?? 0) + 1,
            total_losses: (cur?.total_losses ?? 0) + 1,
          });
        }
        if (e.game.slug === 'tetris-mini' && e.meta?.lines) {
          tetrisLinesRef.current += e.meta.lines;
        }
        runChecker({
          justCompleted: { game: e.game, level: e.level, passed: e.passed, durationMs: e.durationMs },
          lastEventHour: new Date().getHours(),
          lastCirclePercent: e.game.slug === 'perfect-circle' ? e.meta?.percent : undefined,
          lastReflexMs: e.game.slug === 'reflex-333' ? e.meta?.ms : undefined,
          lastWordleAttempts: e.game.slug === 'wordle-5' ? e.meta?.attempts : undefined,
        });
        break;
      }
      case 'ad-view':
        adViewsRef.current += 1;
        runChecker({});
        break;
      case 'comment':
        runChecker({ totalComments: 1 });
        break;
      case 'follow':
        runChecker({ totalFollows: 5 }); // approximation; better to fetch live count
        break;
    }
  }, [progressByGame, persistProgress, runChecker, pushRecent]);

  const getResumeFor = useCallback((gameId: number) => {
    const p = progressByGame.get(gameId);
    if (!p || p.level <= 1) return null;
    return { level: p.level, best_level: p.best_level, best_score: p.best_score };
  }, [progressByGame]);

  const clearResume = useCallback(async (gameId: number) => {
    await persistProgress(gameId, { level: 1 });
  }, [persistProgress]);

  const lastUnlocked = unlockQueue[0] ?? null;
  const clearLastUnlocked = useCallback(() => {
    setUnlockQueue((q) => q.slice(1));
  }, []);

  const value = useMemo<State>(() => ({
    unlocked,
    progressByGame,
    recentGameIds,
    lastUnlocked,
    clearLastUnlocked,
    report,
    getResumeFor,
    clearResume,
  }), [unlocked, progressByGame, recentGameIds, lastUnlocked, clearLastUnlocked, report, getResumeFor, clearResume]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAchievements(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAchievements must be used inside AchievementsProvider');
  return ctx;
}
