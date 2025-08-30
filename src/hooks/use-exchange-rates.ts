"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ExchangeRates } from "@/lib/types";

export const useExchangeRates = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRates = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const ratesDocRef = doc(db, "exchangeRates", "current");

    const unsubscribe = onSnapshot(
      ratesDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setExchangeRates(docSnap.data() as ExchangeRates);
        } else {
          console.warn(
            "Exchange rates document 'exchangeRates/current' does not exist.",
          );
          setExchangeRates({}); // Set to empty object if not found
        }
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (err) => {
        console.error("Error fetching exchange rates:", err);
        setError(err);
        setExchangeRates(null);
        setIsLoading(false);
        setIsRefreshing(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchRates();
    return () => unsubscribe();
  }, [fetchRates]);

  const refreshRates = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const response = await fetch('/api/scrape-exchange-rate');
      if (!response.ok) {
        throw new Error('Failed to refresh exchange rates');
      }
      // The rates will be updated automatically via the Firestore listener
    } catch (err) {
      console.error('Error refreshing exchange rates:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh exchange rates'));
      setIsRefreshing(false);
    }
  }, []);

  return { 
    exchangeRates, 
    isLoading, 
    isRefreshing,
    error, 
    refreshRates 
  };
};
