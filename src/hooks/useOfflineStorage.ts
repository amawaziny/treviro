import { useEffect, useState, useCallback } from "react";

type StoreName = "investments" | "transactions" | "settings";

const DB_NAME = "treviro-offline-db";
const DB_VERSION = 1;

const useOfflineStorage = <T>(storeName: StoreName) => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the database
  useEffect(() => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Error opening IndexedDB", event);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      setDb(db);
      setIsInitialized(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains("investments")) {
        db.createObjectStore("investments", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("transactions")) {
        db.createObjectStore("transactions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    };

    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  // Save data to IndexedDB
  const saveData = useCallback(
    (data: T) => {
      return new Promise<boolean>((resolve, reject) => {
        if (!db) {
          reject(new Error("Database not initialized"));
          return;
        }

        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(true);
        request.onerror = (event) => {
          console.error("Error saving data:", event);
          reject(new Error("Failed to save data"));
        };
      });
    },
    [db, storeName],
  );

  // Get data from IndexedDB
  const getData = useCallback(
    <K extends string | number | Date>(key: K): Promise<T | undefined> => {
      return new Promise((resolve, reject) => {
        if (!db) {
          reject(new Error("Database not initialized"));
          return;
        }

        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
          console.error("Error getting data:", event);
          reject(new Error("Failed to get data"));
        };
      });
    },
    [db, storeName],
  );

  // Get all data from a store
  const getAllData = useCallback((): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error("Error getting all data:", event);
        reject(new Error("Failed to get all data"));
      };
    });
  }, [db, storeName]);

  // Delete data from IndexedDB
  const deleteData = useCallback(
    (key: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        if (!db) {
          reject(new Error("Database not initialized"));
          return;
        }

        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = (event) => {
          console.error("Error deleting data:", event);
          reject(new Error("Failed to delete data"));
        };
      });
    },
    [db, storeName],
  );

  return {
    isInitialized,
    saveData,
    getData,
    getAllData,
    deleteData,
  };
};

export default useOfflineStorage;
