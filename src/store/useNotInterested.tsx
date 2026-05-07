import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Hydrate from local cache + DB
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v) try { setMap(JSON.parse(v)); } catch {}
    });
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
    AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
  }, [map]);

  const markNotInterested = useCallback((gameId: number) => {
    setMap((p) => ({ ...p, [gameId]: true }));
    if (session?.user) {
      supabase
        .from('not_interested')
        .upsert({ user_id: session.user.id, game_id: gameId })
        .then(({ error }) => { if (error) console.warn('not_interested write failed', error.message); });
    }
  }, [session?.user?.id]);

  const unmark = useCallback((gameId: number) => {
    setMap((p) => { const n = { ...p }; delete n[gameId]; return n; });
    if (session?.user) {
      supabase
        .from('not_interested')
        .delete()
        .match({ user_id: session.user.id, game_id: gameId })
        .then(({ error }) => { if (error) console.warn('not_interested delete failed', error.message); });
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
