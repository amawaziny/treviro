"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult } from '@/lib/types';

interface InvestmentContextType {
  investments: Investment[];
  addInvestment: (investment: Investment, analysis?: CurrencyFluctuationAnalysisResult) => void;
  // updateInvestment: (investment: Investment) => void;
  // deleteInvestment: (id: string) => void;
  getInvestmentsByType: (type: string) => Investment[];
  isLoading: boolean;
  currencyAnalyses: Record<string, CurrencyFluctuationAnalysisResult>; // Store analysis by investment ID
}

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [currencyAnalyses, setCurrencyAnalyses] = useState<Record<string, CurrencyFluctuationAnalysisResult>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedInvestments = localStorage.getItem('treviro-investments');
      if (storedInvestments) {
        setInvestments(JSON.parse(storedInvestments));
      }
      const storedAnalyses = localStorage.getItem('treviro-currency-analyses');
      if (storedAnalyses) {
        setCurrencyAnalyses(JSON.parse(storedAnalyses));
      }
    } catch (error) {
      console.error("Failed to load investments from localStorage", error);
    }
    setIsLoading(false);
  }, []);

  const saveInvestments = useCallback((updatedInvestments: Investment[]) => {
    try {
      localStorage.setItem('treviro-investments', JSON.stringify(updatedInvestments));
    } catch (error) {
      console.error("Failed to save investments to localStorage", error);
    }
  }, []);
  
  const saveCurrencyAnalyses = useCallback((updatedAnalyses: Record<string, CurrencyFluctuationAnalysisResult>) => {
    try {
      localStorage.setItem('treviro-currency-analyses', JSON.stringify(updatedAnalyses));
    } catch (error) {
      console.error("Failed to save currency analyses to localStorage", error);
    }
  }, []);

  const addInvestment = useCallback((investment: Investment, analysis?: CurrencyFluctuationAnalysisResult) => {
    setInvestments(prev => {
      const updated = [...prev, investment];
      saveInvestments(updated);
      return updated;
    });
    if (analysis && investment.type === 'Currencies') {
      setCurrencyAnalyses(prev => {
        const updated = {...prev, [investment.id]: analysis };
        saveCurrencyAnalyses(updated);
        return updated;
      });
    }
  }, [saveInvestments, saveCurrencyAnalyses]);


  const getInvestmentsByType = useCallback((type: string) => {
    return investments.filter(inv => inv.type === type);
  }, [investments]);

  return (
    <InvestmentContext.Provider value={{ investments, addInvestment, getInvestmentsByType, isLoading, currencyAnalyses }}>
      {children}
    </InvestmentContext.Provider>
  );
};
