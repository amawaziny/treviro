// Shared IndexedDB utility for offline functionality

export const DB_NAME = process.env.NEXT_PUBLIC_OFFLINE_DB_NAME || 'TreviroOfflineDB';
export const STORE_NAME = process.env.NEXT_PUBLIC_OFFLINE_DB_STORE || 'pendingInvestments';
const DB_VERSION = parseInt(process.env.NEXT_PUBLIC_OFFLINE_DB_VERSION || '1', 10);

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
