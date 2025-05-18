
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult } from '@/lib/types';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

interface InvestmentContextType {
  investments: Investment[];
  addInvestment: (investment: Omit<Investment, 'createdAt'>, analysis?: CurrencyFluctuationAnalysisResult) => Promise<void>;
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

  const userId = user?.uid; 

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
      querySnapshot.forEach((documentSnapshot) => { // Changed doc to documentSnapshot for clarity
        const data = documentSnapshot.data();
        const investment: Investment = {
          id: documentSnapshot.id,
          ...data,
          purchaseDate: data.purchaseDate, // Assuming purchaseDate is already a string
          createdAt: data.createdAt && data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : data.createdAt, // Keep as is if already string or undefined
        } as Investment; // Cast needed due to potential Timestamp
        fetchedInvestments.push(investment);
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

  const addInvestment = useCallback(async (investmentData: Omit<Investment, 'createdAt'>, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!isAuthenticated || !userId) {
      console.error("User not authenticated, cannot add investment.");
      return;
    }
    
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;

    const investmentWithTimestamp = {
      ...investmentData,
      createdAt: serverTimestamp(),
    };

    try {
      const investmentDocRef = doc(db, investmentsCollectionPath, investmentData.id);
      await setDoc(investmentDocRef, investmentWithTimestamp);

      if (analysis && investmentData.type === 'Currencies') {
        const analysisDocRef = doc(db, analysesCollectionPath, investmentData.id);
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

