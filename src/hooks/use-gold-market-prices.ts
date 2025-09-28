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
        setIsRefreshing(false);
      },
      (err) => {
        console.error("Error fetching gold market prices:", err);
        setError(err);
        setGoldMarketPrices(null);
        setIsLoading(false);
        setIsRefreshing(false);
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

  const refreshRates = useCallback(async () => {
    try {
      if (isLoading || isRefreshing) return;
      
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch("/api/scrape-gold-prices");
      if (!response.ok) {
        throw new Error("Failed to refresh gold prices");
      }
      // The rates will be updated automatically via the Firestore listener
    } catch (err) {
      console.error("Error refreshing gold prices:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to refresh gold prices"),
      );
      setIsRefreshing(false);
    }
  }, [isLoading, isRefreshing]);

  return { goldMarketPrices, isLoading: isLoading || isRefreshing, isRefreshing, error, refreshRates };
};
