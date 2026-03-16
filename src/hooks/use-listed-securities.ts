"use client";

import { useState, useEffect, useCallback } from "react";
import { onSnapshot, query, setDoc, doc, collection, updateDoc } from "firebase/firestore";
import type { ListedSecurity } from "@/lib/types";
import { masterDataService } from "@/lib/services/master-data-service";
import { LISTED_SECURITIES_COLLECTION } from "@/lib/constants";
import { db } from "@/lib/firebase";

export const useListedSecurities = () => {
  const [listedSecurities, setListedSecurities] = useState<ListedSecurity[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const securitiesCollectionRef =
      masterDataService.getSecurityCollectionRef();
    const q = query(securitiesCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const securities: ListedSecurity[] = [];
        querySnapshot.forEach((doc) => {
          securities.push({ id: doc.id, ...doc.data() } as ListedSecurity);
        });
        setListedSecurities(securities);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching listed securities:", err);
        setError(err);
        setListedSecurities([]);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const getSecurityById = useCallback(
    (id: string): ListedSecurity | undefined => {
      const existingSecurity = listedSecurities.find((sec) => sec.id === id);
      if (existingSecurity) {
        return existingSecurity;
      }
    },
    [listedSecurities],
  );

  const createSecurity = useCallback(
    async (securityData: Omit<ListedSecurity, "id">) => {
      try {
        setIsLoading(true);
        const id = securityData.market + "-" + securityData.symbol;
        const securityDocRef = masterDataService.getDocRef(
          LISTED_SECURITIES_COLLECTION,
          id,
        );
        await setDoc(securityDocRef, securityData);
        setListedSecurities((prev) => [
          ...prev,
          { id, ...securityData } as ListedSecurity,
        ]);
      } catch (err) {
        console.error("Error creating listed security:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const addPriceHistory = useCallback(
    async (securityId: string, newPrice: number) => {
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const dateId = today.toISOString().split("T")[0];

        // Get the current security to calculate changePercent
        const currentSecurity = listedSecurities.find(
          (sec) => sec.id === securityId,
        );
        if (!currentSecurity) {
          throw new Error(`Security with ID ${securityId} not found`);
        }

        const oldPrice = currentSecurity.price;
        const changePercent =
          oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

        // Add price history document
        const priceHistoryDocRef = doc(
          db,
          LISTED_SECURITIES_COLLECTION,
          securityId,
          "priceHistory",
          dateId,
        );
        await setDoc(priceHistoryDocRef, {
          price: newPrice,
          date: new Date(),
        });

        // Update the security document with new price and changePercent
        const securityDocRef = doc(
          db,
          LISTED_SECURITIES_COLLECTION,
          securityId,
        );
        await updateDoc(securityDocRef, {
          price: newPrice,
          changePercent: changePercent,
          lastUpdated: new Date().toISOString(),
        });

        // Update local state
        setListedSecurities((prev) =>
          prev.map((sec) =>
            sec.id === securityId
              ? { ...sec, price: newPrice, changePercent }
              : sec,
          ),
        );
      } catch (err) {
        console.error("Error adding price history:", err);
        throw err;
      }
    },
    [listedSecurities],
  );

  return {
    listedSecurities,
    isLoading,
    error,
    getSecurityById,
    createSecurity,
    addPriceHistory,
  };
};
