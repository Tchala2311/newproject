import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { secureStorage } from '../lib/secureStorage';
import { supabase } from '../lib/supabase';
import { useUser } from './useUser';

const LIKES_CACHE = 'flik:likes:cache:v2';
const SAVES_CACHE = 'flik:saves:cache:v2';

// How long to wait after the last tap before writing to the DB.
const DEBOUNCE_MS = 400;

type IDMap = Record<number, boolean>;

// Tracks the debounce state per game ID so rapid taps only produce one write.
type PendingEntry = {
  timer: ReturnType<typeof setTimeout>;
  // The committed (DB) state before this debounce cycle started.
  committed: boolean;
};

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

  // Per-game debounce state for likes and saves.
  const likePending = useRef<Record<number, PendingEntry>>({});
  const savePending = useRef<Record<number, PendingEntry>>({});

  // Cancel any pending debounced writes on unmount so they don't fire setState
  // or issue DB writes after sign-out / teardown.
  useEffect(() => () => {
    Object.values(likePending.current).forEach((e) => clearTimeout(e.timer));
    Object.values(savePending.current).forEach((e) => clearTimeout(e.timer));
    likePending.current = {};
    savePending.current = {};
  }, []);

  // 1) Cache hydrate from encrypted storage (instant — no network)
  useEffect(() => {
    (async () => {
      try {
        const [l, s] = await Promise.all([
          secureStorage.getItem(LIKES_CACHE),
          secureStorage.getItem(SAVES_CACHE),
        ]);
        setLikes(safeJsonParse<IDMap>(l, {}));
        setSaves(safeJsonParse<IDMap>(s, {}));
      } catch {}
    })();
  }, []);

  // 2) Server hydrate — DB is source of truth; overwrites cache on login
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
      secureStorage.setItem(LIKES_CACHE, JSON.stringify(lm)).catch(() => {});
      secureStorage.setItem(SAVES_CACHE, JSON.stringify(sm)).catch(() => {});
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 3) Persist to encrypted storage whenever local state changes (post-hydrate)
  useEffect(() => {
    if (!hydrated) return;
    secureStorage.setItem(LIKES_CACHE, JSON.stringify(likes)).catch(() => {});
  }, [likes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    secureStorage.setItem(SAVES_CACHE, JSON.stringify(saves)).catch(() => {});
  }, [saves, hydrated]);

  const toggleLike = useCallback((id: number) => {
    if (!user) return;
    setLikes((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const wanted = !!next[id];

      const existing = likePending.current[id];
      if (existing) clearTimeout(existing.timer);

      // Remember the DB state from before this debounce cycle so we can
      // revert to it if the write fails.
      const committed = existing ? existing.committed : !!prev[id];

      likePending.current[id] = {
        committed,
        timer: setTimeout(() => {
          delete likePending.current[id];
          // If the user toggled back to the original state, no write needed.
          if (wanted === committed) return;
          const op = wanted
            ? supabase.from('likes').upsert({ user_id: user.id, game_id: id }, { onConflict: 'user_id,game_id' })
            : supabase.from('likes').delete().match({ user_id: user.id, game_id: id });
          op.then(({ error }) => {
            if (error) {
              if (__DEV__) console.warn('like toggle failed');
              setLikes((cur) => ({ ...cur, [id]: committed }));
            }
          });
        }, DEBOUNCE_MS),
      };

      return next;
    });
  }, [user?.id]);

  const toggleSave = useCallback((id: number) => {
    if (!user) return;
    setSaves((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const wanted = !!next[id];

      const existing = savePending.current[id];
      if (existing) clearTimeout(existing.timer);

      const committed = existing ? existing.committed : !!prev[id];

      savePending.current[id] = {
        committed,
        timer: setTimeout(() => {
          delete savePending.current[id];
          if (wanted === committed) return;
          const op = wanted
            ? supabase.from('saves').upsert({ user_id: user.id, game_id: id }, { onConflict: 'user_id,game_id' })
            : supabase.from('saves').delete().match({ user_id: user.id, game_id: id });
          op.then(({ error }) => {
            if (error) {
              if (__DEV__) console.warn('save toggle failed');
              setSaves((cur) => ({ ...cur, [id]: committed }));
            }
          });
        }, DEBOUNCE_MS),
      };

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
