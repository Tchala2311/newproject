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
// Serialize the read-modify-write so two overlapping flushes can't each read
// the same storage and clobber the other's appended events.
let flushChain: Promise<void> = Promise.resolve();

function parseEvents(raw: string | null): Event[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function flush() {
  if (!buffer.length) return;
  const toFlush = buffer;
  buffer = [];
  flushTimer = null;
  flushChain = flushChain.then(async () => {
    try {
      const existing = await AsyncStorage.getItem(KEY);
      const arr = parseEvents(existing);
      const merged = [...arr, ...toFlush].slice(-MAX);
      await AsyncStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      // swallow — events are fire-and-forget
    }
  });
  return flushChain;
}

export function logEvent(e: Omit<Event, 'ts'>) {
  buffer.push({ ...e, ts: Date.now() });
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 1500);
}

export async function readEvents(): Promise<Event[]> {
  try {
    return parseEvents(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export async function clearEvents(): Promise<void> {
  buffer = [];
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
