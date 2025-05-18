
"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
      }, 
      (err) => {
        console.error("Error fetching listed stocks:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, []);

  return { listedStocks, isLoading, error };
};
