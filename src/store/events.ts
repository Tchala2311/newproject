import AsyncStorage from '@react-native-async-storage/async-storage';

// Lightweight local event log. We append to AsyncStorage in batches so we
// don't block the main thread on every interaction.
//
// In production this should pipe to AppMetrica (Yandex's free analytics for RU)
// and to Supabase via a debounced edge-function call to feed the recommender.

export type EventType =
  | 'view'
  | 'play'
  | 'complete'
  | 'like'
  | 'unlike'
  | 'save'
  | 'unsave'
  | 'skip'
  | 'share';

export type Event = {
  type: EventType;
  gameId: number;
  ts: number;
  meta?: Record<string, string | number>;
};

const KEY = 'flik:events:v1';
const MAX = 500;

let buffer: Event[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (!buffer.length) return;
  const toFlush = buffer;
  buffer = [];
  flushTimer = null;
  try {
    const existing = await AsyncStorage.getItem(KEY);
    const arr: Event[] = existing ? JSON.parse(existing) : [];
    const merged = [...arr, ...toFlush].slice(-MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // swallow — events are fire-and-forget
  }
}

export function logEvent(e: Omit<Event, 'ts'>) {
  buffer.push({ ...e, ts: Date.now() });
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 1500);
}

export async function readEvents(): Promise<Event[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
