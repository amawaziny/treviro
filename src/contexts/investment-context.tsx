
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary, GoldInvestment, GoldType, DebtInstrumentInvestment } from '@/lib/types';
import { db as firestoreInstance } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp, writeBatch, orderBy, getDocs, deleteDoc, where, runTransaction, getDoc, increment } from 'firebase/firestore';
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
  deleteSellTransaction: (transaction: Transaction) => Promise<void>;
  removeGoldInvestments: (identifier: string, itemType: 'physical' | 'fund') => Promise<void>;
  removeDirectDebtInvestment: (investmentId: string) => Promise<void>;
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
    if (!userId || !firestoreInstance) return null;
    return doc(firestoreInstance, `users/${userId}/dashboard_aggregates/summary`);
  }, [userId]);

  const updateDashboardSummaryDoc = useCallback(async (updates: Partial<DashboardSummary>) => {
    if (!userId || !firestoreInstance) {
        console.warn("UpdateDashboardSummaryDoc: User ID or Firestore instance missing.");
        return;
    }
    const summaryDocRef = getDashboardSummaryDocRef();
    if (!summaryDocRef) return;

    try {
      await runTransaction(firestoreInstance, async (transaction) => {
        const summaryDoc = await transaction.get(summaryDocRef);
        
        let currentData: DashboardSummary;
        if (summaryDoc.exists()) {
            currentData = summaryDoc.data() as DashboardSummary;
        } else {
            // If doc doesn't exist, initialize with defaults before applying updates
            currentData = { ...defaultDashboardSummary };
            // Note: transaction.set for initialization must happen before updates
            // We'll handle this by ensuring the document is created if it doesn't exist
            // or by ensuring initial values if fields are missing.
        }
        
        const newData: Partial<DashboardSummary> = {};
        let docNeedsCreation = !summaryDoc.exists();

        for (const key in updates) {
            const typedKey = key as keyof DashboardSummary;
            const updateValue = updates[typedKey];

            if (typeof updateValue === 'number') {
                // Use Firestore increment for atomic updates if the document exists
                // Otherwise, prepare the value for a set operation.
                if (summaryDoc.exists()) {
                    newData[typedKey] = increment(updateValue) as any; // `increment` is the correct way
                } else {
                    // If doc doesn't exist, just set the initial incremented value
                     const currentFieldValue = (currentData[typedKey] as number | undefined) || 0;
                    (newData[typedKey] as number) = currentFieldValue + updateValue;
                }
            }
        }
        if (docNeedsCreation) {
            // If the doc doesn't exist, create it with the initial summed values
            transaction.set(summaryDocRef, newData); // newData contains the initial computed values
        } else {
            // If doc exists, update with increments (or new values if fields were previously undefined)
            transaction.update(summaryDocRef, newData);
        }
      });
    } catch (e) {
      console.error("Dashboard summary transaction failed: ", e);
    }
  }, [userId, getDashboardSummaryDocRef]);


  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return () => {}; 
    }

    if (!isAuthenticated || !userId || !firestoreInstance) {
      setInvestments([]);
      setTransactions([]);
      setCurrencyAnalyses({});
      setDashboardSummary(defaultDashboardSummary);
      setIsLoading(false);
      console.warn("InvestmentContext: User not authenticated, userId missing, or Firestore not available. Skipping data fetching.");
      return () => {};
    }

    setIsLoading(true);
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;
    const transactionsCollectionPath = `users/${userId}/transactions`;

    const summaryDocRef = getDashboardSummaryDocRef();

    let unsubSummary = () => {};
    if (summaryDocRef) {
        unsubSummary = onSnapshot(summaryDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setDashboardSummary(docSnap.data() as DashboardSummary);
            } else {
                setDashboardSummary(defaultDashboardSummary);
                // Attempt to create the summary document with defaults if it doesn't exist
                const defaultDataForCreation: DashboardSummary = { ...defaultDashboardSummary };
                setDoc(summaryDocRef, defaultDataForCreation, { merge: true })
                  .catch(err => console.error("Failed to create default summary doc:", err));
            }
            }, (error) => {
            console.error("Error fetching dashboard summary:", error);
            setDashboardSummary(defaultDashboardSummary);
            });
    } else {
        setDashboardSummary(defaultDashboardSummary); 
    }


    const qInvestments = query(collection(firestoreInstance, investmentsCollectionPath), orderBy("purchaseDate", "asc"));
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
      setInvestments([]);
    });

    const qTransactions = query(collection(firestoreInstance, transactionsCollectionPath), orderBy("date", "desc"));
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
        setTransactions([]);
    });


    const qAnalyses = query(collection(firestoreInstance, analysesCollectionPath));
    const unsubscribeAnalyses = onSnapshot(qAnalyses, (querySnapshot) => {
      const fetchedAnalyses: Record<string, CurrencyFluctuationAnalysisResult> = {};
      querySnapshot.forEach((doc) => {
        fetchedAnalyses[doc.id] = doc.data() as CurrencyFluctuationAnalysisResult;
      });
      setCurrencyAnalyses(fetchedAnalyses);
    }, (error) => {
      console.error("Error fetching currency analyses:", error);
      setCurrencyAnalyses({});
    });

    // Combine promises to set loading to false once initial data (or attempt) is done
    const dataFetchPromises: Promise<any>[] = [
        getDocs(qInvestments).catch(() => null), // Don't let one error stop others
        getDocs(qTransactions).catch(() => null),
        getDocs(qAnalyses).catch(() => null)
    ];
    if (summaryDocRef) {
        dataFetchPromises.push(getDoc(summaryDocRef).catch(() => null));
    }

    Promise.all(dataFetchPromises).then(() => {
        setIsLoading(false);
    }).catch(() => {
        // Errors are handled by individual listeners, this just manages global loading
        setIsLoading(false); 
    });


    return () => {
      unsubscribeInvestments();
      unsubscribeAnalyses();
      unsubTransactions();
      unsubSummary();
    };
  }, [userId, isAuthenticated, authIsLoading, getDashboardSummaryDocRef, updateDashboardSummaryDoc]);

  const addInvestment = useCallback(async (investmentData: Omit<Investment, 'createdAt' | 'id'>, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("AddInvestment: User not authenticated, userId missing, or Firestore not available.");
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
      const investmentDocRef = doc(firestoreInstance, investmentsCollectionPath, investmentId);
      await setDoc(investmentDocRef, investmentWithTimestamp);

      if (investmentData.amountInvested && typeof investmentData.amountInvested === 'number') {
         await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: investmentData.amountInvested });
      }

      if (analysis && investmentData.type === 'Currencies') {
        const analysisDocRef = doc(firestoreInstance, analysesCollectionPath, investmentId);
        await setDoc(analysisDocRef, analysis);
      }
    } catch (error) {
      console.error("Error adding investment to Firestore:", error);
      throw error;
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
      if (!isAuthenticated || !userId || !firestoreInstance) {
        console.error("RecordSellStockTransaction: User not authenticated, userId missing, or Firestore not available.");
        throw new Error("User not authenticated or Firestore not available.");
      }

      const userStockInvestments = investments.filter(
        (inv) => inv.type === "Stocks" && inv.tickerSymbol === tickerSymbol
      ) as StockInvestment[];

      userStockInvestments.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

      let totalOwnedShares = userStockInvestments.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0);
      if (numberOfSharesToSell > totalOwnedShares) {
        throw new Error("Not enough shares to sell.");
      }

      const totalCostOfAllLots = userStockInvestments.reduce(
        (sum, inv) => sum + (inv.amountInvested || 0),
        0
      );
      const averagePurchasePriceAllLots = totalOwnedShares > 0 ? totalCostOfAllLots / totalOwnedShares : 0;


      const totalProceeds = numberOfSharesToSell * sellPricePerShare - fees;
      const costOfSharesSold = averagePurchasePriceAllLots * numberOfSharesToSell;
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

      const batch = writeBatch(firestoreInstance);
      const transactionDocRef = doc(firestoreInstance, `users/${userId}/transactions`, transactionId);
      batch.set(transactionDocRef, transactionWithTimestamp);

      
      let sharesToDeduct = numberOfSharesToSell;
      let costBasisReductionFromPortfolio = 0;

      for (const investment of userStockInvestments) {
        if (sharesToDeduct <= 0) break;

        const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investment.id);
        const sharesInThisLot = investment.numberOfShares || 0;
        const costOfThisLot = investment.amountInvested;


        if (sharesInThisLot >= sharesToDeduct) {
          const newShareCount = sharesInThisLot - sharesToDeduct;
          const proportionSoldFromLot = sharesToDeduct / sharesInThisLot;
          const costBasisOfSoldPortionFromLot = costOfThisLot * proportionSoldFromLot;
          costBasisReductionFromPortfolio += costBasisOfSoldPortionFromLot;


          if (newShareCount === 0) {
            batch.delete(investmentDocRef);
          } else {
            const newAmountInvestedForLot = costOfThisLot - costBasisOfSoldPortionFromLot;
            batch.update(investmentDocRef, { 
                numberOfShares: newShareCount,
                amountInvested: newAmountInvestedForLot 
            });
          }
          sharesToDeduct = 0;
        } else { 
          costBasisReductionFromPortfolio += costOfThisLot;
          batch.delete(investmentDocRef);
          sharesToDeduct -= sharesInThisLot;
        }
      }
      await batch.commit();

      if (typeof profitOrLoss === 'number') {
        await updateDashboardSummaryDoc({ totalRealizedPnL: profitOrLoss });
      }
      if (costBasisReductionFromPortfolio !== 0) {
        await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -costBasisReductionFromPortfolio });
      }

    },
    [userId, isAuthenticated, investments, updateDashboardSummaryDoc]
  );

  const removeStockInvestmentsBySymbol = useCallback(async (tickerSymbol: string) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("RemoveStockInvestmentsBySymbol: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentsCollectionPath = `users/${userId}/investments`;
    const q = query(
      collection(firestoreInstance, investmentsCollectionPath),
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
      const batch = writeBatch(firestoreInstance);
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
    dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>,
    oldAmountInvested: number
  ) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("UpdateStockInvestment: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);

    const newNumberOfShares = dataToUpdate.numberOfShares ?? 0;
    const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? 0;
    const newPurchaseFees = dataToUpdate.purchaseFees ?? 0;

    const newCalculatedAmountInvested = (newNumberOfShares * newPurchasePricePerShare) + newPurchaseFees;

    const updatedInvestmentData = {
      ...dataToUpdate,
      amountInvested: newCalculatedAmountInvested,
    };

    try {
      await setDoc(investmentDocRef, updatedInvestmentData, { merge: true });

      const amountInvestedDelta = newCalculatedAmountInvested - oldAmountInvested;
      if (amountInvestedDelta !== 0) {
        await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedDelta });
      }
    } catch (error) {
      console.error("Error updating stock investment:", error);
      throw error;
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const deleteSellTransaction = useCallback(async (transactionToDelete: Transaction) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("DeleteSellTransaction: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    if (transactionToDelete.type !== 'sell') {
      throw new Error("Can only delete 'sell' transactions with this function.");
    }

    const transactionDocRef = doc(firestoreInstance, `users/${userId}/transactions`, transactionToDelete.id);

    try {
      await deleteDoc(transactionDocRef);

      if (transactionToDelete.profitOrLoss !== undefined) {
        await updateDashboardSummaryDoc({ totalRealizedPnL: -transactionToDelete.profitOrLoss });
      }
      
      const costBasisOfSoldShares = transactionToDelete.totalAmount - (transactionToDelete.profitOrLoss || 0);
      if (costBasisOfSoldShares !== 0) { 
          await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: costBasisOfSoldShares });
      }

      console.log(`Successfully deleted sell transaction ${transactionToDelete.id}. Shares are NOT automatically re-added to holdings.`);

    } catch (error) {
      console.error(`Error deleting sell transaction ${transactionToDelete.id}:`, error);
      throw error;
    }

  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const removeGoldInvestments = useCallback(async (identifier: string, itemType: 'physical' | 'fund') => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("RemoveGoldInvestments: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }

    let totalAmountInvestedRemoved = 0;
    const batch = writeBatch(firestoreInstance);
    const investmentsCollectionPath = `users/${userId}/investments`;

    if (itemType === 'physical') {
      const goldType = identifier as GoldType;
      const q = query(
        collection(firestoreInstance, investmentsCollectionPath),
        where("type", "==", "Gold"),
        where("goldType", "==", goldType)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnapshot) => {
        const investmentData = docSnapshot.data() as GoldInvestment;
        totalAmountInvestedRemoved += investmentData.amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
      await batch.commit(); // Commit for physical gold deletions
      if (totalAmountInvestedRemoved !== 0) {
          await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
      }
    } else if (itemType === 'fund') {
      const tickerSymbol = identifier;
      // For funds, we rely on removeStockInvestmentsBySymbol which already handles its own batch and summary update.
      await removeStockInvestmentsBySymbol(tickerSymbol);
      // No separate commit or summary update here as it's handled by the called function.
    }
    console.log(`Successfully removed gold investments for identifier: ${identifier} (type: ${itemType}).`);
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, removeStockInvestmentsBySymbol]);

  const removeDirectDebtInvestment = useCallback(async (investmentId: string) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("RemoveDirectDebtInvestment: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    
    try {
      const docSnap = await getDoc(investmentDocRef);
      if (!docSnap.exists()) {
        console.warn(`Direct debt investment ${investmentId} not found for removal.`);
        return;
      }
      const investmentData = docSnap.data() as DebtInstrumentInvestment;
      if (investmentData.type !== 'Debt Instruments') {
         console.warn(`Investment ${investmentId} is not a direct debt instrument.`);
         return;
      }

      await deleteDoc(investmentDocRef);

      if (investmentData.amountInvested && typeof investmentData.amountInvested === 'number') {
        await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -investmentData.amountInvested });
      }
      console.log(`Successfully removed direct debt investment ${investmentId}.`);
    } catch (error) {
      console.error(`Error removing direct debt investment ${investmentId}:`, error);
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
        updateStockInvestment,
        deleteSellTransaction,
        removeGoldInvestments,
        removeDirectDebtInvestment,
        dashboardSummary
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
