
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction } from '@/lib/types';
import { db } from '@/lib/firebase'; 
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp, writeBatch, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';

interface InvestmentContextType {
  investments: Investment[];
  addInvestment: (investment: Omit<Investment, 'createdAt' | 'id'>, analysis?: CurrencyFluctuationAnalysisResult) => Promise<void>;
  getInvestmentsByType: (type: string) => Investment[];
  isLoading: boolean;
  currencyAnalyses: Record<string, CurrencyFluctuationAnalysisResult>;
  recordSellStockTransaction: (
    listedStockId: string,
    tickerSymbol: string,
    numberOfSharesToSell: number,
    sellPricePerShare: number,
    sellDate: string,
    fees: number
  ) => Promise<void>;
  transactions: Transaction[];
}

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      setTransactions([]);
      setCurrencyAnalyses({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;
    const transactionsCollectionPath = `users/${userId}/transactions`;

    const qInvestments = query(collection(db, investmentsCollectionPath), orderBy("purchaseDate", "asc"));
    const unsubscribeInvestments = onSnapshot(qInvestments, (querySnapshot) => {
      const fetchedInvestments: Investment[] = [];
      querySnapshot.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();
        const investment: Investment = {
          id: documentSnapshot.id,
          ...data,
          purchaseDate: data.purchaseDate,
          createdAt: data.createdAt && data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : data.createdAt,
        } as Investment;
        fetchedInvestments.push(investment);
      });
      setInvestments(fetchedInvestments);
      if (!unsubTransactions) setIsLoading(false); // Only set loading false if both listeners are set up or this is the last one
    }, (error) => {
      console.error("Error fetching investments:", error);
      setIsLoading(false);
    });

    const qTransactions = query(collection(db, transactionsCollectionPath), orderBy("date", "desc"));
    const unsubTransactions = onSnapshot(qTransactions, (querySnapshot) => {
        const fetchedTransactions: Transaction[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedTransactions.push({
                id: docSnap.id,
                ...data,
                date: data.date,
                createdAt: data.createdAt && data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
            } as Transaction);
        });
        setTransactions(fetchedTransactions);
        if(!unsubscribeInvestments) setIsLoading(false); // Only set loading false if both listeners are set up
    }, (error) => {
        console.error("Error fetching transactions:", error);
        setIsLoading(false); // Set loading false even on transaction fetch error
    });


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
    
    // Set loading to false once initial listeners are established
    // This assumes onSnapshot calls back relatively quickly for empty or existing data
    Promise.all([
        getDocs(qInvestments), // Check if initial data for investments is processed
        getDocs(qTransactions)  // Check if initial data for transactions is processed
    ]).then(() => {
        setIsLoading(false);
    }).catch(() => {
        setIsLoading(false); // Also set loading to false on error during initial fetch
    });


    return () => {
      unsubscribeInvestments();
      unsubscribeAnalyses();
      unsubTransactions();
    };
  }, [userId, isAuthenticated, authIsLoading]);

  const addInvestment = useCallback(async (investmentData: Omit<Investment, 'createdAt' | 'id'>, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!isAuthenticated || !userId) {
      console.error("User not authenticated, cannot add investment.");
      return;
    }
    
    const investmentId = uuidv4();
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;

    const newInvestmentWithId = {
        ...investmentData,
        id: investmentId,
    }

    const investmentWithTimestamp = {
      ...newInvestmentWithId,
      createdAt: serverTimestamp(),
    };

    try {
      const investmentDocRef = doc(db, investmentsCollectionPath, investmentId);
      await setDoc(investmentDocRef, investmentWithTimestamp);

      if (analysis && investmentData.type === 'Currencies') {
        const analysisDocRef = doc(db, analysesCollectionPath, investmentId);
        await setDoc(analysisDocRef, analysis);
      }
    } catch (error) {
      console.error("Error adding investment to Firestore:", error);
    }
  }, [userId, isAuthenticated]);

  const getInvestmentsByType = useCallback((type: string) => {
    return investments.filter(inv => inv.type === type);
  }, [investments]);

  const recordSellStockTransaction = useCallback(
    async (
      listedStockId: string,
      tickerSymbol: string,
      numberOfSharesToSell: number,
      sellPricePerShare: number,
      sellDate: string,
      fees: number
    ) => {
      if (!isAuthenticated || !userId) {
        throw new Error("User not authenticated.");
      }

      const userStockInvestments = investments.filter(
        (inv) => inv.type === "Stocks" && inv.tickerSymbol === tickerSymbol
      ) as StockInvestment[];

      userStockInvestments.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()); // Sort by purchase date (FIFO for share reduction)

      let totalOwnedShares = userStockInvestments.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0);
      if (numberOfSharesToSell > totalOwnedShares) {
        throw new Error("Not enough shares to sell.");
      }

      let totalCostOfOwnedShares = userStockInvestments.reduce(
        (sum, inv) => sum + (inv.purchasePricePerShare || 0) * (inv.numberOfShares || 0),
        0
      );
      const averagePurchasePrice = totalOwnedShares > 0 ? totalCostOfOwnedShares / totalOwnedShares : 0;

      const totalProceeds = numberOfSharesToSell * sellPricePerShare - fees;
      const costOfSharesSold = averagePurchasePrice * numberOfSharesToSell;
      const profitOrLoss = totalProceeds - costOfSharesSold;

      const transactionId = uuidv4();
      const newTransaction: Omit<Transaction, 'id' | 'createdAt'> = {
        stockId: listedStockId,
        tickerSymbol: tickerSymbol,
        type: 'sell',
        date: sellDate,
        numberOfShares: numberOfSharesToSell,
        pricePerShare: sellPricePerShare,
        fees: fees,
        totalAmount: totalProceeds,
        profitOrLoss: profitOrLoss,
      };
      
      const transactionWithTimestamp = {
          ...newTransaction,
          createdAt: serverTimestamp(),
      }

      const batch = writeBatch(db);
      const transactionDocRef = doc(db, `users/${userId}/transactions`, transactionId);
      batch.set(transactionDocRef, transactionWithTimestamp);

      let sharesToDeduct = numberOfSharesToSell;
      for (const investment of userStockInvestments) {
        if (sharesToDeduct <= 0) break;

        const investmentDocRef = doc(db, `users/${userId}/investments`, investment.id);
        const sharesInThisLot = investment.numberOfShares || 0;

        if (sharesInThisLot >= sharesToDeduct) {
          // This lot has enough shares
          const newShareCount = sharesInThisLot - sharesToDeduct;
          if (newShareCount === 0) {
            batch.delete(investmentDocRef); // Delete if all shares from this lot are sold
          } else {
            batch.update(investmentDocRef, { numberOfShares: newShareCount });
            // Note: We are NOT adjusting amountInvested here to simplify.
            // True P/L tracking would require this.
          }
          sharesToDeduct = 0;
        } else {
          // Sell all shares from this lot and continue to the next
          batch.delete(investmentDocRef);
          sharesToDeduct -= sharesInThisLot;
        }
      }
      await batch.commit();
    },
    [userId, isAuthenticated, investments]
  );


  return (
    <InvestmentContext.Provider value={{ 
        investments, 
        addInvestment, 
        getInvestmentsByType, 
        isLoading, 
        currencyAnalyses,
        recordSellStockTransaction,
        transactions 
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
