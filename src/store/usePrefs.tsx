import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIKES_KEY = 'loop:likes:v1';
const SAVES_KEY = 'loop:saves:v1';

type IDMap = Record<number, boolean>;

type PrefsState = {
  likes: IDMap;
  saves: IDMap;
  toggleLike: (id: number) => void;
  toggleSave: (id: number) => void;
};

const PrefsCtx = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [likes, setLikes] = useState<IDMap>({});
  const [saves, setSaves] = useState<IDMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [l, s] = await Promise.all([AsyncStorage.getItem(LIKES_KEY), AsyncStorage.getItem(SAVES_KEY)]);
        if (l) setLikes(JSON.parse(l));
        if (s) setSaves(JSON.parse(s));
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(LIKES_KEY, JSON.stringify(likes)).catch(() => {});
  }, [likes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SAVES_KEY, JSON.stringify(saves)).catch(() => {});
  }, [saves, hydrated]);

  const toggleLike = useCallback((id: number) => {
    setLikes((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSave = useCallback((id: number) => {
    setSaves((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const value = useMemo<PrefsState>(() => ({ likes, saves, toggleLike, toggleSave }), [likes, saves, toggleLike, toggleSave]);

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs(): PrefsState {
  const ctx = useContext(PrefsCtx);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
