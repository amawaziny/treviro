"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ListedSecurity } from "@/lib/types";

export const useListedSecurities = () => {
  const [listedSecurities, setListedSecurities] = useState<ListedSecurity[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const securitiesCollectionRef = collection(db, "listedSecurities");
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
      // If not in cache, fetch from Firestore
      try {
        const securityDocRef = doc(db, "listedSecurities", id);
        const securityDocSnap = await getDoc(securityDocRef);
        if (securityDocSnap.exists()) {
          return {
            id: securityDocSnap.id,
            ...securityDocSnap.data(),
          } as ListedSecurity;
        }
        return undefined;
      } catch (err) {
        console.error(`Error fetching security by ID ${id}:`, err);
        // Optionally set error state here if desired, though it might be better to handle errors at the call site
        // setError(err as Error);
        return undefined;
      }
    },
    [listedSecurities],
  );

  return { listedSecurities, isLoading, error, getListedSecurityById };
};
