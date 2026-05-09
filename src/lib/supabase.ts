import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase env missing. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.\nSee README.md "Backend setup".'
  );
}

// SecureStore has a 2 048-byte value limit on iOS. Large auth tokens are split
// into numbered chunks so every slice fits within the limit.
const CHUNK_SIZE = 1800;
const chunkKey = (key: string, i: number) => `${key}.chunk.${i}`;

const SecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const first = await SecureStore.getItemAsync(key);
    if (first === null) return null;
    // Single-chunk value — return directly
    const count = parseInt(first, 10);
    if (isNaN(count)) return first;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(key, String(chunks.length));
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c)));
  },

  async removeItem(key: string): Promise<void> {
    const first = await SecureStore.getItemAsync(key);
    if (first !== null) {
      const count = parseInt(first, 10);
      if (!isNaN(count)) {
        await Promise.all(
          Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i)))
        );
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: SecureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_color: string;
  bio: string | null;
  created_at: string;
};
