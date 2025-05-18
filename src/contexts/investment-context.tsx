
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult } from '@/lib/types';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
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

  const userId = user?.uid; // Using Firebase UID

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
        fetchedInvestments.push({ id: doc.id, ...doc.data() } as Investment);
      });
      setInvestments(fetchedInvestments);
      setIsLoading(false); 
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
      const investmentDocRef = doc(db, investmentsCollectionPath, investment.id);
      await setDoc(investmentDocRef, investment);

      if (analysis && investment.type === 'Currencies') {
        const analysisDocRef = doc(db, analysesCollectionPath, investment.id);
        await setDoc(analysisDocRef, analysis);
      }
    } catch (error) {
      console.error("Error adding investment to Firestore:", error);
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
