import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Event, readEvents } from './events';
import {
  computeStreak,
  computeTotals,
  rankGames,
  Ranked,
  recentGameIds,
  topCategoryLabel,
  Totals,
} from './recommender';
import { GAMES } from '../data/games';
import { usePrefs } from './usePrefs';
import { getAllBests } from './personalBests';

type StatsState = {
  events: Event[];
  bests: Record<number, number>;
  totals: Totals;
  streak: number;
  recentIds: number[];
  topCategory: string | null;
  ranked: Ranked[];
  refresh: () => void;
};

const StatsCtx = createContext<StatsState | null>(null);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { likes, saves } = usePrefs();
  const [events, setEvents] = useState<Event[]>([]);
  const [bests, setBests] = useState<Record<number, number>>({});
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([readEvents(), getAllBests()]).then(([evs, b]) => {
      if (!alive) return;
      setEvents(evs);
      setBests(b);
    });
    return () => { alive = false; };
  }, [tick]);

  const totals = useMemo(() => computeTotals(events), [events]);
  const streak = useMemo(() => computeStreak(events), [events]);
  const recentIds = useMemo(() => recentGameIds(events), [events]);
  const topCategory = useMemo(() => topCategoryLabel(events, GAMES), [events]);
  const ranked = useMemo(() => rankGames(GAMES, events, likes, saves), [events, likes, saves]);

  const value = useMemo<StatsState>(
    () => ({ events, bests, totals, streak, recentIds, topCategory, ranked, refresh }),
    [events, bests, totals, streak, recentIds, topCategory, ranked, refresh],
  );

  return <StatsCtx.Provider value={value}>{children}</StatsCtx.Provider>;
}

export function useStats(): StatsState {
  const ctx = useContext(StatsCtx);
  if (!ctx) throw new Error('useStats must be used inside StatsProvider');
  return ctx;
}
