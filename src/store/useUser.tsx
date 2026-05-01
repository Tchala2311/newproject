import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'loop:user:v1';
const FOLLOWS_KEY = 'loop:follows:v1';

const AVATAR_COLORS = ['#C99FE6', '#5DD9B0', '#F0CE61', '#79BCDD', '#6BD9C0', '#E76F8E', '#F5A04A'];

export type User = {
  handle: string;
  displayName: string;
  avatarColor: string;
  bio?: string;
  createdAt: number;
};

type State = {
  user: User | null;
  hydrated: boolean;
  follows: Record<string, boolean>;
  setUser: (u: User) => void;
  updateUser: (patch: Partial<User>) => void;
  toggleFollow: (handle: string) => void;
  signOut: () => void;
  pickAvatarColor: () => string;
};

const Ctx = createContext<State | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, f] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(FOLLOWS_KEY),
        ]);
        if (u) setUserState(JSON.parse(u));
        if (f) setFollows(JSON.parse(f));
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user) AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
    else AsyncStorage.removeItem(USER_KEY).catch(() => {});
  }, [user, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows)).catch(() => {});
  }, [follows, hydrated]);

  const setUser = useCallback((u: User) => setUserState(u), []);
  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);
  const toggleFollow = useCallback((handle: string) => {
    setFollows((prev) => ({ ...prev, [handle]: !prev[handle] }));
  }, []);
  const signOut = useCallback(() => setUserState(null), []);
  const pickAvatarColor = useCallback(() => {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }, []);

  const value = useMemo<State>(
    () => ({ user, hydrated, follows, setUser, updateUser, toggleFollow, signOut, pickAvatarColor }),
    [user, hydrated, follows, setUser, updateUser, toggleFollow, signOut, pickAvatarColor]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}

export const HANDLE_REGEX = /^[a-z0-9_.]{3,20}$/;
export function validateHandle(h: string): string | null {
  if (!h) return 'Введи имя пользователя';
  if (h.length < 3) return 'Минимум 3 символа';
  if (h.length > 20) return 'Максимум 20 символов';
  if (!HANDLE_REGEX.test(h)) return 'Только латиница, цифры, _ и .';
  return null;
}
