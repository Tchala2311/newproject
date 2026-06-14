import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { secureStorage } from '../lib/secureStorage';
import { clearBests } from './personalBests';
import { clearEvents } from './events';

const FOLLOWS_KEY = 'flik:follows:v1';

// All preference cache keys — cleared from both SecureStore and legacy
// AsyncStorage on sign-out so a new user on the same device starts clean.
const ALL_CACHE_KEYS = [
  FOLLOWS_KEY,
  'flik:likes:cache:v2',
  'flik:saves:cache:v2',
  'flik:notInterested:v1',
  'flik:recent:v1',
];

const AVATAR_COLORS = ['#C99FE6', '#5DD9B0', '#F0CE61', '#79BCDD', '#6BD9C0', '#E76F8E', '#F5A04A'];

const RESERVED_HANDLES = new Set(['admin', 'root', 'system', 'flik', 'team', 'support', 'help', 'mod', 'moderator']);

const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 256;

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
  hydrated: boolean;
  setUser: (u: { handle: string; displayName: string; avatarColor: string; bio?: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateUser: (patch: Partial<Pick<User, 'displayName' | 'avatarColor' | 'bio'>>) => Promise<void>;

  // follows
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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUserState] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [followsHydrated, setFollowsHydrated] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  // Tracks in-flight follow toggles to prevent race conditions. The ref is the
  // synchronous source of truth (state would be stale within the same tick, so
  // two fast taps could both pass the guard and double-write).
  const [followPending, setFollowPending] = useState<Set<string>>(new Set());
  const followPendingRef = useRef<Set<string>>(new Set());
  const followsRef = useRef<Record<string, boolean>>({});
  useEffect(() => { followsRef.current = follows; }, [follows]);

  // Bootstrap session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    }).catch((e) => {
      // Without this, a getSession() rejection (network/secure-store) would
      // leave authLoading=true forever and hang the app on the loading gate.
      if (__DEV__) console.warn('getSession failed', e);
      if (!mounted) return;
      setSession(null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // INITIAL_SESSION may fire before getSession resolves on some platforms.
      if (event === 'INITIAL_SESSION') setAuthLoading(false);
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
        if (__DEV__) console.warn('profile fetch failed', error.message);
        setUserState(null);
      } else if (data) {
        setUserState(profileToUser(data as Profile));
      } else {
        setUserState(null);
      }
      setHydrated(true);
    };
    run();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Follows: hydrate from encrypted cache instantly, then reconcile with DB.
  useEffect(() => {
    secureStorage.getItem(FOLLOWS_KEY).then((f) => {
      setFollows(safeJsonParse<Record<string, boolean>>(f, {}));
      setFollowsHydrated(true);
    }).catch(() => { setFollowsHydrated(true); });
  }, []);
  // Guard: do not persist the initial empty state before hydration completes.
  useEffect(() => {
    if (!followsHydrated) return;
    secureStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows)).catch(() => {});
  }, [follows, followsHydrated]);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const uid = session.user.id;
      const { data, error } = await supabase
        .from('creator_follows')
        .select('creator_handle')
        .eq('user_id', uid);
      if (!cancelled && !error && data) {
        const dbFollows: Record<string, boolean> = {};
        for (const r of data as Array<{ creator_handle: string }>) {
          dbFollows[r.creator_handle] = true;
        }
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
              .then(({ error: e }) => { if (e && __DEV__) console.warn('follow backfill failed'); });
          }
          return merged;
        });
      }
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
    // Wipe all local caches before signing out so a subsequent user on the
    // same device never sees stale data from the previous session. Remove from
    // both SecureStore (current) and AsyncStorage (legacy, for migration).
    await Promise.all([
      ...ALL_CACHE_KEYS.map((k) => secureStorage.removeItem(k).catch(() => {})),
      AsyncStorage.multiRemove(ALL_CACHE_KEYS).catch(() => {}),
      clearBests(),
      clearEvents(),
    ]);
    setFollows({});
    setFollowsHydrated(false);
    await supabase.auth.signOut();
  }, []);

  const setUser = useCallback(async (u: { handle: string; displayName: string; avatarColor: string; bio?: string }) => {
    if (!session?.user) return { ok: false as const, error: 'Не авторизован' };

    const trimmedName = (u.displayName || u.handle).slice(0, MAX_DISPLAY_NAME);
    const trimmedBio = u.bio ? u.bio.slice(0, MAX_BIO) : undefined;

    const row = {
      id: session.user.id,
      handle: u.handle,
      display_name: trimmedName,
      avatar_color: u.avatarColor,
      bio: trimmedBio ?? null,
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
          : 'Не удалось сохранить профиль. Попробуй ещё раз.';
      return { ok: false as const, error: msg };
    }
    setUserState(profileToUser(data as Profile));
    return { ok: true as const };
  }, [session?.user?.id]);

  const updateUser = useCallback(async (patch: Partial<Pick<User, 'displayName' | 'avatarColor' | 'bio'>>) => {
    if (!session?.user || !user) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName.slice(0, MAX_DISPLAY_NAME);
    if (patch.avatarColor !== undefined) dbPatch.avatar_color = patch.avatarColor;
    if (patch.bio !== undefined) dbPatch.bio = patch.bio.slice(0, MAX_BIO);
    const { data, error } = await supabase
      .from('profiles')
      .update(dbPatch)
      .eq('id', session.user.id)
      .select('id, handle, display_name, avatar_color, bio, created_at')
      .single();
    if (error) {
      if (__DEV__) console.warn('profile update failed');
      return;
    }
    setUserState(profileToUser(data as Profile));
  }, [session?.user?.id, user]);

  const toggleFollow = useCallback((handle: string) => {
    // Synchronous guard: ignore if a request for this handle is already
    // in-flight (state-based checks are stale within the same tick).
    if (followPendingRef.current.has(handle)) return;
    const isOn = !!followsRef.current[handle];

    // Optimistic update (outside any setState updater so the DB op below runs
    // exactly once, not twice under StrictMode's double-invoked updater).
    followsRef.current = { ...followsRef.current, [handle]: !isOn };
    setFollows((prev) => ({ ...prev, [handle]: !isOn }));

    if (!session?.user) return;
    const uid = session.user.id;
    followPendingRef.current.add(handle);
    setFollowPending((p) => new Set(p).add(handle));

    const op = isOn
      ? supabase.from('creator_follows').delete().match({ user_id: uid, creator_handle: handle })
      : supabase.from('creator_follows').upsert({ user_id: uid, creator_handle: handle }, { onConflict: 'user_id,creator_handle' });

    op.then(({ error }) => {
      if (error) {
        if (__DEV__) console.warn('follow toggle failed');
        // Revert optimistic update on failure.
        followsRef.current = { ...followsRef.current, [handle]: isOn };
        setFollows((cur) => ({ ...cur, [handle]: isOn }));
      }
      followPendingRef.current.delete(handle);
      setFollowPending((p) => { const s = new Set(p); s.delete(handle); return s; });
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
  if (RESERVED_HANDLES.has(h.toLowerCase())) return 'Этот тег зарезервирован';
  return null;
}
