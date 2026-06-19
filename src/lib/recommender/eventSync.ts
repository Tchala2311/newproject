// Behavioral event sync. The on-device recommender (buildUserProfile) reads
// play / view / skip / complete signals back from the Supabase `events` table —
// so these MUST be persisted there, not only in AsyncStorage (which is what
// store/events.ts does for the offline/profile-screen aggregates).
//
// Without this bridge the entire watch-time / engagement signal stream never
// reaches the ranker, leaving it blind to ~everything except likes/saves.
//
// Design: batched, deduped-by-cadence, fire-and-forget. Never blocks the UI.

import { supabase } from '../supabase';

type RemoteEvent = {
  user_id: string;
  type: string;
  game_id: number;
  meta: Record<string, string | number>;
};

// Only behavioral signals belong here. likes / saves / comments live in their
// own tables (with their own RLS) and the profile builder reads those directly,
// so syncing them here too would double-count.
const SYNCED_TYPES = new Set(['play', 'view', 'skip', 'complete']);

const FLUSH_MS = 4000;
const MAX_BATCH = 20;

let currentUserId: string | null = null;
let buffer: RemoteEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

// Called whenever the signed-in user changes (incl. logout → null).
export function setEventSyncUser(userId: string | null) {
  // On a real user switch, drop any buffered events from the previous user so
  // we never attribute them to the new account (RLS would reject them anyway).
  if (userId !== currentUserId) buffer = [];
  currentUserId = userId;
}

export function syncEvent(type: string, gameId: number, meta: Record<string, string | number> = {}) {
  if (!currentUserId || !SYNCED_TYPES.has(type)) return;
  buffer.push({ user_id: currentUserId, type, game_id: gameId, meta });
  if (buffer.length >= MAX_BATCH) { flushEvents(); return; }
  if (!timer) timer = setTimeout(flushEvents, FLUSH_MS);
}

// Force-flush the buffer (batch insert). Safe to call anytime — no-op if empty.
export function flushEvents() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!buffer.length) return;
  const batch = buffer;
  buffer = [];
  supabase
    .from('events')
    .insert(batch)
    .then(({ error }) => {
      if (error && __DEV__) console.warn('event sync failed', error.message);
    });
}
