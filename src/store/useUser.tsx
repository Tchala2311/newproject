import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

const FOLLOWS_KEY = 'loop:follows:v1';

const AVATAR_COLORS = ['#C99FE6', '#5DD9B0', '#F0CE61', '#79BCDD', '#6BD9C0', '#E76F8E', '#F5A04A'];

export type User = {
  id: string;
  handle: string;
  displayName: string;
  avatarColor: string;
  bio?: string;
};

type State = {
  // auth
  session: Session | null;
  authLoading: boolean;
  signOut: () => Promise<void>;

  // profile
  user: User | null;
  hydrated: boolean; // profile fetched (null = needs onboarding)
  setUser: (u: { handle: string; displayName: string; avatarColor: string; bio?: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateUser: (patch: Partial<Pick<User, 'displayName' | 'avatarColor' | 'bio'>>) => Promise<void>;

  // follows (still local-only for now; v2 wires to public.follows)
  follows: Record<string, boolean>;
  toggleFollow: (handle: string) => void;

  pickAvatarColor: () => string;
};

const Ctx = createContext<State | null>(null);

function profileToUser(p: Profile): User {
  return {
    id: p.id,
    handle: p.handle,
    displayName: p.display_name ?? p.handle,
    avatarColor: p.avatar_color,
    bio: p.bio ?? undefined,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUserState] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [follows, setFollows] = useState<Record<string, boolean>>({});

  // Bootstrap session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Fetch profile when session changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!session?.user) {
        setUserState(null);
        setHydrated(true);
        return;
      }
      setHydrated(false);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_color, bio, created_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('profile fetch failed', error.message);
        setUserState(null);
      } else if (data) {
        setUserState(profileToUser(data as Profile));
      } else {
        setUserState(null); // signed in but no profile yet -> onboarding
      }
      setHydrated(true);
    };
    run();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Follows — still local for now
  useEffect(() => {
    AsyncStorage.getItem(FOLLOWS_KEY).then((f) => {
      if (f) try { setFollows(JSON.parse(f)); } catch {}
    });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows)).catch(() => {});
  }, [follows]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const setUser = useCallback(async (u: { handle: string; displayName: string; avatarColor: string; bio?: string }) => {
    if (!session?.user) return { ok: false as const, error: 'Не авторизован' };
    const row = {
      id: session.user.id,
      handle: u.handle,
      display_name: u.displayName || u.handle,
      avatar_color: u.avatarColor,
      bio: u.bio ?? null,
    };
    const { data, error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select('id, handle, display_name, avatar_color, bio, created_at')
      .single();
    if (error) {
      const msg =
        error.code === '23505'
          ? 'Этот @тег уже занят, попробуй другой'
          : error.message;
      return { ok: false as const, error: msg };
    }
    setUserState(profileToUser(data as Profile));
    return { ok: true as const };
  }, [session?.user?.id]);

  const updateUser = useCallback(async (patch: Partial<Pick<User, 'displayName' | 'avatarColor' | 'bio'>>) => {
    if (!session?.user || !user) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
    if (patch.avatarColor !== undefined) dbPatch.avatar_color = patch.avatarColor;
    if (patch.bio !== undefined) dbPatch.bio = patch.bio;
    const { data, error } = await supabase
      .from('profiles')
      .update(dbPatch)
      .eq('id', session.user.id)
      .select('id, handle, display_name, avatar_color, bio, created_at')
      .single();
    if (error) { console.warn('profile update failed', error.message); return; }
    setUserState(profileToUser(data as Profile));
  }, [session?.user?.id, user]);

  const toggleFollow = useCallback((handle: string) => {
    setFollows((prev) => ({ ...prev, [handle]: !prev[handle] }));
  }, []);

  const pickAvatarColor = useCallback(() => {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }, []);

  const value = useMemo<State>(
    () => ({
      session,
      authLoading,
      signOut,
      user,
      hydrated,
      setUser,
      updateUser,
      follows,
      toggleFollow,
      pickAvatarColor,
    }),
    [session, authLoading, signOut, user, hydrated, setUser, updateUser, follows, toggleFollow, pickAvatarColor]
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
