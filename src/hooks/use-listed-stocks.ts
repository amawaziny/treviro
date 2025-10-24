"use client";

import { useState, useEffect, useCallback } from "react";
import { onSnapshot, query } from "firebase/firestore";
import type { ListedSecurity } from "@/lib/types";
import { masterDataService } from "@/lib/services/master-data-service";

export const useListedSecurities = () => {
  const [listedSecurities, setListedSecurities] = useState<ListedSecurity[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const securitiesCollectionRef = masterDataService.getSecurityCollectionRef();
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

  const getListedSecurityById = useCallback(
    async (id: string): Promise<ListedSecurity | undefined> => {
      const existingSecurity = listedSecurities.find((sec) => sec.id === id);
      if (existingSecurity) {
        return existingSecurity;
      }
      try {
        return await masterDataService.getSecurity(id);
      } catch (err) {
        console.error(`Error fetching security by ID ${id}:`, err);
        return undefined;
      }
    },
    [listedSecurities],
  );

  return { listedSecurities, isLoading, error, getListedSecurityById };
};
