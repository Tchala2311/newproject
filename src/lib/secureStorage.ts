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
    // Not a chunk-count header — value fits in a single entry.
    if (isNaN(count)) return first;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null; // corrupted; treat as missing
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
    // Write the chunk count as the root key, then all chunks in parallel.
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
