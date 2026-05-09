import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useUser } from './useUser';

const LIKES_CACHE = 'loop:likes:cache:v2';
const SAVES_CACHE = 'loop:saves:cache:v2';

type IDMap = Record<number, boolean>;

type PrefsState = {
  likes: IDMap;
  saves: IDMap;
  hydrated: boolean;
  toggleLike: (id: number) => void;
  toggleSave: (id: number) => void;
};

const PrefsCtx = createContext<PrefsState | null>(null);

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [likes, setLikes] = useState<IDMap>({});
  const [saves, setSaves] = useState<IDMap>({});
  const [hydrated, setHydrated] = useState(false);

  // 1) Cache hydrate (instant)
  useEffect(() => {
    (async () => {
      try {
        const [l, s] = await Promise.all([
          AsyncStorage.getItem(LIKES_CACHE),
          AsyncStorage.getItem(SAVES_CACHE),
        ]);
        setLikes(safeJsonParse<IDMap>(l, {}));
        setSaves(safeJsonParse<IDMap>(s, {}));
      } catch {}
    })();
  }, []);

  // 2) Server hydrate — always overwrite cache with DB truth
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setHydrated(true);
      return;
    }
    (async () => {
      const [{ data: likeRows }, { data: saveRows }] = await Promise.all([
        supabase.from('likes').select('game_id').eq('user_id', user.id),
        supabase.from('saves').select('game_id').eq('user_id', user.id),
      ]);
      if (cancelled) return;
      const lm: IDMap = {};
      const sm: IDMap = {};
      (likeRows ?? []).forEach((r: { game_id: number }) => { lm[r.game_id] = true; });
      (saveRows ?? []).forEach((r: { game_id: number }) => { sm[r.game_id] = true; });
      setLikes(lm);
      setSaves(sm);
      AsyncStorage.setItem(LIKES_CACHE, JSON.stringify(lm)).catch(() => {});
      AsyncStorage.setItem(SAVES_CACHE, JSON.stringify(sm)).catch(() => {});
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 3) Persist cache when local state changes (post-hydrate)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(LIKES_CACHE, JSON.stringify(likes)).catch(() => {});
  }, [likes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SAVES_CACHE, JSON.stringify(saves)).catch(() => {});
  }, [saves, hydrated]);

  const toggleLike = useCallback((id: number) => {
    if (!user) return;
    setLikes((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const op = next[id]
        ? supabase.from('likes').upsert({ user_id: user.id, game_id: id })
        : supabase.from('likes').delete().match({ user_id: user.id, game_id: id });
      op.then(({ error }) => {
        if (error) {
          if (__DEV__) console.warn('like toggle failed');
          // Revert optimistic update on failure.
          setLikes((cur) => ({ ...cur, [id]: !!prev[id] }));
        }
      });
      return next;
    });
  }, [user?.id]);

  const toggleSave = useCallback((id: number) => {
    if (!user) return;
    setSaves((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const op = next[id]
        ? supabase.from('saves').upsert({ user_id: user.id, game_id: id })
        : supabase.from('saves').delete().match({ user_id: user.id, game_id: id });
      op.then(({ error }) => {
        if (error) {
          if (__DEV__) console.warn('save toggle failed');
          // Revert optimistic update on failure.
          setSaves((cur) => ({ ...cur, [id]: !!prev[id] }));
        }
      });
      return next;
    });
  }, [user?.id]);

  const value = useMemo<PrefsState>(
    () => ({ likes, saves, hydrated, toggleLike, toggleSave }),
    [likes, saves, hydrated, toggleLike, toggleSave]
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs(): PrefsState {
  const ctx = useContext(PrefsCtx);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
