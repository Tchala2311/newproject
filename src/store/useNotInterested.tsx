import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { secureStorage } from '../lib/secureStorage';
import { supabase } from '../lib/supabase';
import { useUser } from './useUser';

const KEY = 'loop:notInterested:v1';

type State = {
  notInterested: Record<number, boolean>;
  markNotInterested: (gameId: number) => void;
  unmark: (gameId: number) => void;
};

const Ctx = createContext<State | null>(null);

export function NotInterestedProvider({ children }: { children: React.ReactNode }) {
  const { session } = useUser();
  const [map, setMap] = useState<Record<number, boolean>>({});

  // Hydrate from encrypted cache + DB
  useEffect(() => {
    secureStorage.getItem(KEY).then((v) => {
      if (!v) return;
      try {
        const parsed = JSON.parse(v);
        if (typeof parsed === 'object' && parsed !== null) setMap(parsed);
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    supabase
      .from('not_interested')
      .select('game_id')
      .eq('user_id', session.user.id)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next: Record<number, boolean> = {};
        for (const r of data as Array<{ game_id: number }>) next[r.game_id] = true;
        setMap((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    secureStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
  }, [map]);

  const markNotInterested = useCallback((gameId: number) => {
    setMap((p) => ({ ...p, [gameId]: true }));
    if (session?.user) {
      supabase
        .from('not_interested')
        .upsert({ user_id: session.user.id, game_id: gameId })
        .then(({ error }) => { if (error && __DEV__) console.warn('not_interested write failed'); });
    }
  }, [session?.user?.id]);

  const unmark = useCallback((gameId: number) => {
    setMap((p) => { const n = { ...p }; delete n[gameId]; return n; });
    if (session?.user) {
      supabase
        .from('not_interested')
        .delete()
        .match({ user_id: session.user.id, game_id: gameId })
        .then(({ error }) => { if (error && __DEV__) console.warn('not_interested delete failed'); });
    }
  }, [session?.user?.id]);

  const value = useMemo<State>(() => ({ notInterested: map, markNotInterested, unmark }), [map, markNotInterested, unmark]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotInterested(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotInterested must be used inside NotInterestedProvider');
  return ctx;
}
