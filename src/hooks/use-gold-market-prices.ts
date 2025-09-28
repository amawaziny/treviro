"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GoldMarketPrices } from "@/lib/types";

export const useGoldMarketPrices = () => {
  const [goldMarketPrices, setGoldMarketPrices] =
    useState<GoldMarketPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRates = useCallback(() => {
    if (!db) {
      setError(new Error("Firestore is not initialized."));
      setIsLoading(false);
      setGoldMarketPrices(null);
      return () => {};
    }

    setIsLoading(true);
    setError(null);

    const pricesDocRef = doc(db, "goldMarketPrices", "current");

    const unsubscribe = onSnapshot(
      pricesDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Convert Firestore Timestamps to Date objects or ISO strings if needed
          const prices: GoldMarketPrices = {
            ...data,
            lastUpdated:
              data.lastUpdated instanceof Timestamp
                ? data.lastUpdated.toDate()
                : data.lastUpdated, // Or handle as ISO string if preferred
          } as GoldMarketPrices;
          setGoldMarketPrices(prices);
        } else {
          console.warn(
            "Gold market prices document 'goldMarketPrices/current' does not exist.",
          );
          setGoldMarketPrices({}); // Set to empty object or specific default
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching gold market prices:", err);
        setError(err);
        setGoldMarketPrices(null);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchRates();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchRates]);

  const refreshRates = useCallback(() => {
    if (isLoading || isRefreshing) return;
    
    setIsRefreshing(true);
    const unsubscribe = fetchRates();
    
    // Simulate minimum loading time for better UX
    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [fetchRates, isLoading, isRefreshing]);

  return { goldMarketPrices, isLoading: isLoading || isRefreshing, isRefreshing, error, refreshRates };
};
