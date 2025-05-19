
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp, writeBatch, orderBy, getDocs, deleteDoc, where, increment, runTransaction, getDoc } from 'firebase/firestore';
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
  removeStockInvestmentsBySymbol: (tickerSymbol: string) => Promise<void>;
  updateStockInvestment: (investmentId: string, dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>, oldAmountInvested: number) => Promise<void>;
  dashboardSummary: DashboardSummary | null;
}

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

const defaultDashboardSummary: DashboardSummary = {
  totalInvestedAcrossAllAssets: 0,
  totalRealizedPnL: 0,
};

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currencyAnalyses, setCurrencyAnalyses] = useState<Record<string, CurrencyFluctuationAnalysisResult>>({});
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(defaultDashboardSummary);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const userId = user?.uid;

  const getDashboardSummaryDocRef = useCallback(() => {
    if (!userId) return null;
    return doc(db, `users/${userId}/dashboard_aggregates/summary`);
  }, [userId]);

  const updateDashboardSummaryDoc = useCallback(async (updates: Partial<DashboardSummary>) => {
    if (!userId) return;
    const summaryDocRef = getDashboardSummaryDocRef();
    if (!summaryDocRef) return;

    try {
      await runTransaction(db, async (transaction) => {
        const summaryDoc = await transaction.get(summaryDocRef);
        if (!summaryDoc.exists()) {
          const initialData: DashboardSummary = { ...defaultDashboardSummary };
          for (const key in updates) {
            const typedKey = key as keyof DashboardSummary;
            if (typeof updates[typedKey] === 'number') {
              (initialData[typedKey] as number) = (updates[typedKey] as number);
            }
          }
          transaction.set(summaryDocRef, initialData);
        } else {
          const updateData: { [key: string]: any } = {};
          for (const key in updates) {
            const typedKey = key as keyof DashboardSummary;
             if (typeof updates[typedKey] === 'number') {
                updateData[typedKey] = increment(updates[typedKey] as number);
            }
          }
          transaction.update(summaryDocRef, updateData);
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }, [userId, getDashboardSummaryDocRef]);


  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated || !userId) {
      setInvestments([]);
      setTransactions([]);
      setCurrencyAnalyses({});
      setDashboardSummary(defaultDashboardSummary);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;
    const transactionsCollectionPath = `users/${userId}/transactions`;

    const summaryDocRef = getDashboardSummaryDocRef();

    const unsubSummary = summaryDocRef 
      ? onSnapshot(summaryDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setDashboardSummary(docSnap.data() as DashboardSummary);
          } else {
            setDashboardSummary(defaultDashboardSummary);
            const defaultData: DashboardSummary = { ...defaultDashboardSummary };
            setDoc(summaryDocRef, defaultData).catch(err => console.error("Failed to create default summary doc:", err));
          }
        }, (error) => {
          console.error("Error fetching dashboard summary:", error);
          setDashboardSummary(defaultDashboardSummary);
        })
      : () => {};


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
    }, (error) => {
      console.error("Error fetching investments:", error);
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
    }, (error) => {
        console.error("Error fetching transactions:", error);
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

    Promise.all([
        getDocs(qInvestments).catch(() => null),
        getDocs(qTransactions).catch(() => null),
        getDocs(qAnalyses).catch(() => null),
        summaryDocRef ? getDoc(summaryDocRef).catch(() => null) : Promise.resolve(null)
    ]).then(() => {
        setIsLoading(false);
    }).catch(() => {
        setIsLoading(false);
    });


    return () => {
      unsubscribeInvestments();
      unsubscribeAnalyses();
      unsubTransactions();
      unsubSummary();
    };
  }, [userId, isAuthenticated, authIsLoading, getDashboardSummaryDocRef]);

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
    };

    const investmentWithTimestamp = {
      ...newInvestmentWithId,
      createdAt: serverTimestamp(),
    };

    try {
      const investmentDocRef = doc(db, investmentsCollectionPath, investmentId);
      await setDoc(investmentDocRef, investmentWithTimestamp);

      if (investmentData.amountInvested && typeof investmentData.amountInvested === 'number') {
         await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: investmentData.amountInvested });
      }

      if (analysis && investmentData.type === 'Currencies') {
        const analysisDocRef = doc(db, analysesCollectionPath, investmentId);
        await setDoc(analysisDocRef, analysis);
      }
    } catch (error) {
      console.error("Error adding investment to Firestore:", error);
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

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

      userStockInvestments.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

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
      };

      const batch = writeBatch(db);
      const transactionDocRef = doc(db, `users/${userId}/transactions`, transactionId);
      batch.set(transactionDocRef, transactionWithTimestamp);

      if (typeof profitOrLoss === 'number') {
        await updateDashboardSummaryDoc({ totalRealizedPnL: profitOrLoss });
      }

      let sharesToDeduct = numberOfSharesToSell;
      for (const investment of userStockInvestments) {
        if (sharesToDeduct <= 0) break;

        const investmentDocRef = doc(db, `users/${userId}/investments`, investment.id);
        const sharesInThisLot = investment.numberOfShares || 0;

        if (sharesInThisLot >= sharesToDeduct) {
          const newShareCount = sharesInThisLot - sharesToDeduct;
          if (newShareCount === 0) {
            batch.delete(investmentDocRef);
          } else {
            batch.update(investmentDocRef, { numberOfShares: newShareCount });
          }
          sharesToDeduct = 0;
        } else {
          batch.delete(investmentDocRef);
          sharesToDeduct -= sharesInThisLot;
        }
      }
      await batch.commit();
    },
    [userId, isAuthenticated, investments, updateDashboardSummaryDoc]
  );

  const removeStockInvestmentsBySymbol = useCallback(async (tickerSymbol: string) => {
    if (!isAuthenticated || !userId) {
      console.error("User not authenticated, cannot remove investments.");
      return;
    }
    const investmentsCollectionPath = `users/${userId}/investments`;
    const q = query(
      collection(db, investmentsCollectionPath),
      where("type", "==", "Stocks"),
      where("tickerSymbol", "==", tickerSymbol)
    );

    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log(`No stock investments found for symbol ${tickerSymbol} to remove.`);
        return;
      }

      let totalAmountInvestedRemoved = 0;
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnapshot) => {
        const investmentData = docSnapshot.data() as StockInvestment;
        totalAmountInvestedRemoved += investmentData.amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();

      if (totalAmountInvestedRemoved !== 0) {
        await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
      }
      console.log(`Successfully removed stock investments for symbol ${tickerSymbol}.`);
    } catch (error) {
      console.error(`Error removing stock investments for symbol ${tickerSymbol}:`, error);
      throw error;
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const correctedUpdateStockInvestment = useCallback(async (
    investmentId: string,
    dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>,
    oldAmountInvested: number
  ) => {
    if (!isAuthenticated || !userId) {
      throw new Error("User not authenticated.");
    }
    const investmentDocRef = doc(db, `users/${userId}/investments`, investmentId);

    const newNumberOfShares = dataToUpdate.numberOfShares ?? 0;
    const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? 0;
    const newPurchaseFees = dataToUpdate.purchaseFees ?? 0;

    const newCalculatedAmountInvested = (newNumberOfShares * newPurchasePricePerShare) + newPurchaseFees;

    const updatedData = {
      ...dataToUpdate,
      amountInvested: newCalculatedAmountInvested,
    };

    try {
      await setDoc(investmentDocRef, updatedData, { merge: true });

      const amountInvestedDelta = newCalculatedAmountInvested - oldAmountInvested;
      if (amountInvestedDelta !== 0) {
        await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedDelta });
      }
    } catch (error) {
      console.error("Error updating stock investment:", error);
      throw error;
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);


  return (
    <InvestmentContext.Provider value={{
        investments,
        addInvestment,
        getInvestmentsByType,
        isLoading,
        currencyAnalyses,
        recordSellStockTransaction,
        transactions,
        removeStockInvestmentsBySymbol,
        updateStockInvestment: correctedUpdateStockInvestment,
        dashboardSummary
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
    