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

  // follows: creator-handle based, persisted to public.creator_follows.
  // Local cache (AsyncStorage) gives instant UI; DB sync happens on every toggle.
  follows: Record<string, boolean>;
  toggleFollow: (handle: string) => void;
  followerCount: number;

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
  const [followerCount, setFollowerCount] = useState(0);

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

  // Follows: hydrate from local cache instantly, then reconcile with DB.
  // Toggles write to both immediately (local optimistic update + DB upsert/delete).
  useEffect(() => {
    AsyncStorage.getItem(FOLLOWS_KEY).then((f) => {
      if (f) try { setFollows(JSON.parse(f)); } catch {}
    });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows)).catch(() => {});
  }, [follows]);

  // When user logs in, fetch real follows from DB and merge with any local
  // follows (e.g. ones picked during onboarding before DB write succeeded).
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const uid = session.user.id;
      // Read user's followed creators
      const { data, error } = await supabase
        .from('creator_follows')
        .select('creator_handle')
        .eq('user_id', uid);
      if (!cancelled && !error && data) {
        const dbFollows: Record<string, boolean> = {};
        for (const r of data as Array<{ creator_handle: string }>) {
          dbFollows[r.creator_handle] = true;
        }
        // Backfill: if local has follows that DB doesn't, push them up so the
        // user doesn't lose anything they did pre-login.
        setFollows((prev) => {
          const merged = { ...dbFollows };
          const toBackfill: string[] = [];
          for (const [h, on] of Object.entries(prev)) {
            if (on && !dbFollows[h]) {
              merged[h] = true;
              toBackfill.push(h);
            }
          }
          if (toBackfill.length) {
            supabase
              .from('creator_follows')
              .upsert(toBackfill.map((h) => ({ user_id: uid, creator_handle: h })))
              .then(({ error: e }) => { if (e) console.warn('follow backfill failed', e.message); });
          }
          return merged;
        });
      }
      // Followers count = how many people follow you (by your own handle)
      const { data: profile } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', uid)
        .maybeSingle();
      if (!cancelled && profile?.handle) {
        const { data: cnt } = await supabase
          .rpc('creator_follower_count', { handle: (profile as any).handle });
        if (!cancelled && typeof cnt === 'number') setFollowerCount(cnt);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

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
    setFollows((prev) => {
      const isOn = !!prev[handle];
      const next = { ...prev, [handle]: !isOn };
      // Sync to DB if signed in (fire-and-forget; local state is the truth
      // for snappy UI).
      if (session?.user) {
        const uid = session.user.id;
        if (isOn) {
          supabase
            .from('creator_follows')
            .delete()
            .match({ user_id: uid, creator_handle: handle })
            .then(({ error }) => { if (error) console.warn('unfollow failed', error.message); });
        } else {
          supabase
            .from('creator_follows')
            .upsert({ user_id: uid, creator_handle: handle })
            .then(({ error }) => { if (error) console.warn('follow failed', error.message); });
        }
      }
      return next;
    });
  }, [session?.user?.id]);

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
      followerCount,
      pickAvatarColor,
    }),
    [session, authLoading, signOut, user, hydrated, setUser, updateUser, follows, toggleFollow, followerCount, pickAvatarColor]
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
