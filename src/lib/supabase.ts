import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase env missing. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.\nSee README.md "Backend setup".'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Returns a valid session, proactively refreshing if the token expires within
// 5 minutes. Returns null if the user is signed out or refresh fails.
export async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  const expiresAt = data.session.expires_at ?? 0;
  if (expiresAt - Math.floor(Date.now() / 1000) < 300) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) return null;
    return refreshed.session;
  }
  return data.session;
}

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_color: string;
  bio: string | null;
  created_at: string;
};
