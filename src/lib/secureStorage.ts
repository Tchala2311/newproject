// Encrypted key-value storage backed by the platform secure enclave.
// iOS uses Keychain; Android uses Keystore via EncryptedSharedPreferences.
//
// expo-secure-store enforces a 2 048-byte per-key limit on iOS, so values
// larger than CHUNK_SIZE are split into numbered sub-keys and reassembled on
// read. This is transparent to callers.

import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const chunkKey = (key: string, i: number) => `${key}.chunk.${i}`;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const first = await SecureStore.getItemAsync(key);
    if (first === null) return null;
    const count = parseInt(first, 10);
    // A chunk header is a *bare* positive integer (e.g. "3"). A plain value
    // that merely starts with digits (e.g. "500ms" or even "500") must NOT be
    // mistaken for one — so we additionally require the string to be exactly
    // that integer AND that the first chunk actually exists. Otherwise it's a
    // normal single-entry value and we return it verbatim. (Backward compatible
    // with previously-written chunked values.)
    if (!isNaN(count) && count > 0 && String(count) === first.trim()) {
      const probe = await SecureStore.getItemAsync(chunkKey(key, 0));
      if (probe !== null) {
        const parts: string[] = [probe];
        for (let i = 1; i < count; i += 1) {
          const part = await SecureStore.getItemAsync(chunkKey(key, i));
          if (part === null) return null; // corrupted; treat as missing
          parts.push(part);
        }
        return parts.join('');
      }
    }
    return first;
  },

  async setItem(key: string, value: string): Promise<void> {
    // How many chunks (if any) the previous write left behind, so we can purge
    // stale ones and never leave orphans that a later read could misinterpret.
    const prevRoot = await SecureStore.getItemAsync(key);
    const prevCount = prevRoot && String(parseInt(prevRoot, 10)) === prevRoot.trim()
      ? parseInt(prevRoot, 10) : 0;
    const purge = (from: number, to: number) =>
      Promise.all(
        Array.from({ length: Math.max(0, to - from) }, (_, i) =>
          SecureStore.deleteItemAsync(chunkKey(key, from + i)).catch(() => {})),
      );

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      if (prevCount > 0) await purge(0, prevCount); // clear stale chunks
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    // Write the chunk count as the root key, then all chunks in parallel.
    await SecureStore.setItemAsync(key, String(chunks.length));
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c)));
    if (prevCount > chunks.length) await purge(chunks.length, prevCount);
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
