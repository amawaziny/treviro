// src/lib/offline-securities-storage.ts
// Utility for caching and retrieving securities (stocks/funds) for offline explore page support

import { openDB } from 'idb';

const DB_NAME = 'treviro-offline-securities';
const STORE_NAME = 'securities';

export interface OfflineSecurity {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'fund';
  [key: string]: any;
}

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function cacheSecurities(securities: OfflineSecurity[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
  for (const sec of securities) {
    await store.put(sec);
  }
  await tx.done;
}

export async function getCachedSecurities(type?: 'stock' | 'fund'): Promise<OfflineSecurity[]> {
  const db = await getDB();
  let all = await db.getAll(STORE_NAME);
  if (type) {
    all = all.filter(sec => sec.type === type);
  }
  return all;
}

export async function clearCachedSecurities() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
