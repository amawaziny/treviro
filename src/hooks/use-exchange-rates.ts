"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ExchangeRates } from "@/lib/types";

export const useExchangeRates = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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
      },
      (err) => {
        console.error("Error fetching exchange rates:", err);
        setError(err);
        setExchangeRates(null);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { exchangeRates, isLoading, error };
};
