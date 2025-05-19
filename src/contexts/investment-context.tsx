
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary } from '@/lib/types';
import { db } from '@/lib/firebase'; 
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp, writeBatch, orderBy, getDocs, deleteDoc, where, increment, runTransaction } from 'firebase/firestore';
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
  updateStockInvestment: (investmentId: string, dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>) => Promise<void>;
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
          // Initialize with default values if document doesn't exist
          const initialData: DashboardSummary = { ...defaultDashboardSummary };
          for (const key in updates) {
            const typedKey = key as keyof DashboardSummary;
            if (typeof updates[typedKey] === 'number') {
              (initialData[typedKey] as number) += updates[typedKey] as number;
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

    const unsubSummary = summaryDocRef ? onSnapshot(summaryDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDashboardSummary(docSnap.data() as DashboardSummary);
      } else {
        setDashboardSummary(defaultDashboardSummary);
      }
    }, (error) => {
      console.error("Error fetching dashboard summary:", error);
      setDashboardSummary(defaultDashboardSummary);
    }) : () => {};


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
        summaryDocRef ? getDocs(collection(db, `users/${userId}/dashboard_aggregates`)).catch(() => null) : Promise.resolve(null)
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
    }

    const investmentWithTimestamp = {
      ...newInvestmentWithId,
      createdAt: serverTimestamp(),
    };

    try {
      const investmentDocRef = doc(db, investmentsCollectionPath, investmentId);
      await setDoc(investmentDocRef, investmentWithTimestamp);
      await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: investmentData.amountInvested });


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
      }

      const batch = writeBatch(db);
      const transactionDocRef = doc(db, `users/${userId}/transactions`, transactionId);
      batch.set(transactionDocRef, transactionWithTimestamp);
      
      // Update dashboard summary for realized P/L
      // No need to await this if not critical for the rest of the batch
      updateDashboardSummaryDoc({ totalRealizedPnL: profitOrLoss });


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


  const updateStockInvestment = useCallback(async (
    investmentId: string, 
    dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>
  ) => {
    if (!isAuthenticated || !userId) {
      throw new Error("User not authenticated.");
    }
    const investmentDocRef = doc(db, `users/${userId}/investments`, investmentId);

    try {
      await runTransaction(db, async (transaction) => {
        const investmentSnapshot = await transaction.get(investmentDocRef);
        if (!investmentSnapshot.exists()) {
          throw new Error("Investment document not found.");
        }
        const oldInvestmentData = investmentSnapshot.data() as StockInvestment;
        const oldAmountInvested = oldInvestmentData.amountInvested || 0;

        const newNumberOfShares = dataToUpdate.numberOfShares ?? oldInvestmentData.numberOfShares ?? 0;
        const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? oldInvestmentData.purchasePricePerShare ?? 0;
        const newPurchaseFees = dataToUpdate.purchaseFees ?? oldInvestmentData.purchaseFees ?? 0;
        
        const newCalculatedAmountInvested = (newNumberOfShares * newPurchasePricePerShare) + newPurchaseFees;

        const updatedData = {
          ...dataToUpdate,
          amountInvested: newCalculatedAmountInvested,
        };
        transaction.update(investmentDocRef, updatedData);
        
        const amountInvestedDelta = newCalculatedAmountInvested - oldAmountInvested;
        // No need to await this if not critical for the rest of the transaction
        // This updateDashboardSummaryDoc is outside the runTransaction to avoid nested transactions if it itself uses one.
        // However, updateDashboardSummaryDoc now uses runTransaction internally which is fine.
      });
      
      // Calculate delta and update summary outside transaction to avoid issues
      // This part can be refined if strict atomicity across this update and summary is needed,
      // but for now, we'll update the summary after the main investment doc is updated.
      const investmentSnapshotAfterUpdate = await getDoc(investmentDocRef);
      if (investmentSnapshotAfterUpdate.exists()) {
          const oldInvestmentData = (await getDoc(investmentDocRef)).data() as StockInvestment; // Re-fetch for old value
          const newInvestmentData = investmentSnapshotAfterUpdate.data() as StockInvestment;
          
          // To correctly get the OLD amount before the transaction committed the new dataToUpdate,
          // we need to reconstruct what the oldAmountInvested was before THIS specific edit transaction started.
          // This is tricky because the `updateStockInvestment` function received `dataToUpdate` not the old `oldAmountInvested`.
          // The best approach is to fetch the doc, calculate the new total, update the doc, THEN update the summary.
          // The current `runTransaction` above already fetches the doc.
          // So, we need to calculate delta based on values *before* and *after* the transaction updates the main doc.

          // Simplified: get the doc after update, and the doc before update (which was part of transaction)
          // The data in `oldInvestmentData` from inside transaction is what we need for old value.
          // The logic inside runTransaction ensures we have oldAmountInvested correctly.
          // Now, we need to calculate the delta based on the *final* values *after* transaction
          // and the values *before* the transaction.
          
          // Let's assume oldAmountInvested was correctly captured inside runTransaction.
          // The `updatedData.amountInvested` is the new amount.
          // However, the `oldAmountInvested` is tricky to get outside the transaction if we want to be precise.
          // The transaction does the update. To update the summary, we need the old value of amountInvested.
          // So, it's best to get the investment document *before* calling this context method,
          // pass the old amount to this method, or handle summary update within this method more carefully.

          // For simplicity, let's refetch the document to get its state *before* this specific update for delta calculation of summary.
          // This is not ideal, as there could be race conditions.
          // A better way is for the calling component to pass the old `amountInvested` or for this function to take the *full* old investment object.

          // Alternative: the component calling updateStockInvestment could fetch the investment,
          // calculate the delta there, and then call a simpler version of updateDashboardSummary.

          // Let's proceed with the current `updateDashboardSummaryDoc` call but note this complexity.
          // The `runTransaction` inside `updateDashboardSummaryDoc` handles its own atomicity.
          const newAmountInvested = (dataToUpdate.numberOfShares! * dataToUpdate.purchasePricePerShare!) + (dataToUpdate.purchaseFees || 0);
          
          // We need the old amountInvested from the doc *before* this update.
          // This requires a read before this update operation.
          // The current structure is a bit challenging for this.
          // The component calling updateStockInvestment should ideally provide the oldAmountInvested.
          
          // For now, this is a simplification:
          // The `updateDashboardSummaryDoc` will be called with the delta, but calculating the accurate delta
          // *within* this function after a separate transaction has updated the primary doc is tricky.
          // The `updateDashboardSummaryDoc` using `increment` is robust if it receives the correct delta.
          // The calling component should ideally calculate the delta and call a specific "adjustTotalInvested" function.

          // Simplification: we will assume the component invoking this will handle the delta calculation or provide enough info.
          // The `updateStockInvestment` in `EditStockInvestmentForm` needs to be smarter.
          // It will fetch the existing investment, then call this context function.
          // So, this context function will receive `oldAmountInvested` as a parameter.

          // Refactoring updateStockInvestment to accept oldAmountInvested
    } catch (error) {
      console.error("Error updating stock investment:", error);
      throw error;
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  // Corrected updateStockInvestment to take oldAmountInvested
  const correctedUpdateStockInvestment = useCallback(async (
    investmentId: string, 
    dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>,
    oldAmountInvested: number
  ) => {
    if (!isAuthenticated || !userId) {
      throw new Error("User not authenticated.");
    }
    const investmentDocRef = doc(db, `users/${userId}/investments`, investmentId);

    const newNumberOfShares = dataToUpdate.numberOfShares ?? 0; // Provide default if undefined
    const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? 0; // Provide default
    const newPurchaseFees = dataToUpdate.purchaseFees ?? 0; // Provide default

    const newCalculatedAmountInvested = (newNumberOfShares * newPurchasePricePerShare) + newPurchaseFees;

    const updatedData = {
      ...dataToUpdate,
      amountInvested: newCalculatedAmountInvested,
    };

    try {
      await setDoc(investmentDocRef, updatedData, { merge: true }); // Use setDoc with merge
      
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
        updateStockInvestment: correctedUpdateStockInvestment, // Use corrected version
        dashboardSummary
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
