
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ListedStock } from '@/lib/types';

export const useListedStocks = () => {
  const [listedStocks, setListedStocks] = useState<ListedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const stocksCollectionRef = collection(db, 'listedStocks'); // Top-level collection
    const q = query(stocksCollectionRef);

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const stocks: ListedStock[] = [];
        querySnapshot.forEach((doc) => {
          stocks.push({ id: doc.id, ...doc.data() } as ListedStock);
        });
        setListedStocks(stocks);
        setIsLoading(false);
        setError(null);
      }, 
      (err) => {
        console.error("Error fetching listed stocks:", err);
        setError(err);
        setListedStocks([]); // Clear stocks on error
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, []);

  const getListedStockById = useCallback(async (id: string): Promise<ListedStock | undefined> => {
    // First, try to find in the already fetched list
    const existingStock = listedStocks.find(stock => stock.id === id);
    if (existingStock) {
      return existingStock;
    }
    // If not found, try to fetch directly from Firestore (e.g. if list is large or not fully loaded)
    // This is a fallback and might indicate the main list isn't comprehensive or id is wrong.
    try {
      const stockDocRef = doc(db, 'listedStocks', id);
      const stockDocSnap = await getDoc(stockDocRef);
      if (stockDocSnap.exists()) {
        return { id: stockDocSnap.id, ...stockDocSnap.data() } as ListedStock;
      }
      return undefined;
    } catch (err) {
      console.error(`Error fetching stock by ID ${id}:`, err);
      return undefined;
    }
  }, [listedStocks]);


  return { listedStocks, isLoading, error, getListedStockById };
};

