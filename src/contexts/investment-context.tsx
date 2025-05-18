
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult } from '@/lib/types';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

interface InvestmentContextType {
  investments: Investment[];
  addInvestment: (investment: Investment, analysis?: CurrencyFluctuationAnalysisResult) => Promise<void>;
  getInvestmentsByType: (type: string) => Investment[];
  isLoading: boolean;
  currencyAnalyses: Record<string, CurrencyFluctuationAnalysisResult>;
}

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [currencyAnalyses, setCurrencyAnalyses] = useState<Record<string, CurrencyFluctuationAnalysisResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const userId = user?.email; // Using email as a simple UID for mock user

  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated || !userId) {
      setInvestments([]);
      setCurrencyAnalyses({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;

    // Subscribe to investments
    const qInvestments = query(collection(db, investmentsCollectionPath));
    const unsubscribeInvestments = onSnapshot(qInvestments, (querySnapshot) => {
      const fetchedInvestments: Investment[] = [];
      querySnapshot.forEach((doc) => {
        // Explicitly cast to Investment after spreading. Firestore might add extra fields.
        fetchedInvestments.push({ id: doc.id, ...doc.data() } as Investment);
      });
      setInvestments(fetchedInvestments);
      setIsLoading(false); // Set loading to false after first fetch
    }, (error) => {
      console.error("Error fetching investments:", error);
      setIsLoading(false);
    });

    // Subscribe to currency analyses
    const qAnalyses = query(collection(db, analysesCollectionPath));
    const unsubscribeAnalyses = onSnapshot(qAnalyses, (querySnapshot) => {
      const fetchedAnalyses: Record<string, CurrencyFluctuationAnalysisResult> = {};
      querySnapshot.forEach((doc) => {
        fetchedAnalyses[doc.id] = doc.data() as CurrencyFluctuationAnalysisResult;
      });
      setCurrencyAnalyses(fetchedAnalyses);
    }, (error) => {
      console.error("Error fetching currency analyses:", error);
    });
    
    return () => {
      unsubscribeInvestments();
      unsubscribeAnalyses();
    };
  }, [userId, isAuthenticated, authIsLoading]);

  const addInvestment = useCallback(async (investment: Investment, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!isAuthenticated || !userId) {
      console.error("User not authenticated, cannot add investment.");
      return;
    }
    
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;

    try {
      // Firestore generates the ID, so we remove it from the object to be added
      // However, our current `Investment` type requires an ID from uuidv4.
      // For Firestore, it's better to let Firestore generate the ID or use the one we have.
      // Let's assume `investment.id` (from uuidv4) is what we want to use as the document ID.
      const investmentDocRef = doc(db, investmentsCollectionPath, investment.id);
      await setDoc(investmentDocRef, investment); // Using setDoc to use our predefined ID

      if (analysis && investment.type === 'Currencies') {
        const analysisDocRef = doc(db, analysesCollectionPath, investment.id); // Use investment ID for analysis doc ID
        await setDoc(analysisDocRef, analysis);
      }
    } catch (error) {
      console.error("Error adding investment to Firestore:", error);
      // Optionally re-throw or show a toast
    }
  }, [userId, isAuthenticated]);

  const getInvestmentsByType = useCallback((type: string) => {
    return investments.filter(inv => inv.type === type);
  }, [investments]);

  return (
    <InvestmentContext.Provider value={{ investments, addInvestment, getInvestmentsByType, isLoading, currencyAnalyses }}>
      {children}
    </InvestmentContext.Provider>
  );
};
