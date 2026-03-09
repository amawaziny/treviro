"use client";

import { useState, useEffect, useCallback } from "react";
import { onSnapshot, query, setDoc } from "firebase/firestore";
import type { ListedSecurity } from "@/lib/types";
import { masterDataService } from "@/lib/services/master-data-service";
import { LISTED_SECURITIES_COLLECTION } from "@/lib/constants";

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

  return {
    listedSecurities,
    isLoading,
    error,
    getSecurityById,
    createSecurity,
  };
};
