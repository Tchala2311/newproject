import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'flik:bests:v1';
let cache: Record<number, number> | null = null;

async function load(): Promise<Record<number, number>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

export async function getBest(gameId: number): Promise<number> {
  const all = await load();
  return all[gameId] || 0;
}

export async function getAllBests(): Promise<Record<number, number>> {
  return { ...(await load()) };
}

// Returns { best, isNew } — useful for showing "🏆 Новый рекорд!" on the
// result screen.
export async function recordScore(
  gameId: number,
  score: number,
): Promise<{ best: number; isNew: boolean; previous: number }> {
  const all = await load();
  const previous = all[gameId] || 0;
  const isNew = score > previous;
  if (isNew) {
    all[gameId] = score;
    cache = all;
    try { await AsyncStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  }
  return { best: all[gameId] || score, isNew, previous };
}
