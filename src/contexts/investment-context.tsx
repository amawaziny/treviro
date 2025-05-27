
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary, GoldInvestment, GoldType, DebtInstrumentInvestment, IncomeRecord, ExpenseRecord, FixedEstimateRecord } from '@/lib/types'; // Added FixedEstimateRecord
import { db as firestoreInstance } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp, writeBatch, orderBy, getDocs, deleteDoc, where, runTransaction, getDoc, increment, FieldValue } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from "uuid";

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
  incomeRecords: IncomeRecord[];
  addIncomeRecord: (incomeData: Omit<IncomeRecord, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  expenseRecords: ExpenseRecord[];
  addExpenseRecord: (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  fixedEstimates: FixedEstimateRecord[]; // New state for fixed estimates
  addFixedEstimate: (estimateData: Omit<FixedEstimateRecord, 'id' | 'createdAt' | 'userId' | 'updatedAt'>) => Promise<void>; // New function
  // updateFixedEstimate and removeFixedEstimate can be added later
}

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

const defaultDashboardSummary: DashboardSummary = {
  totalInvestedAcrossAllAssets: 0,
  totalRealizedPnL: 0,
};

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>([]); // New state
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
        const currentData: DashboardSummary = summaryDoc.exists() ? (summaryDoc.data() as DashboardSummary) : { ...defaultDashboardSummary };
        
        const newDataForUpdate: { [key: string]: FieldValue | number } = {};
        let docNeedsCreation = !summaryDoc.exists();

        for (const key in updates) {
          const typedKey = key as keyof DashboardSummary;
          const updateValue = updates[typedKey];

          if (typeof updateValue === 'number') {
            if (summaryDoc.exists() && updateValue !== 0) { // Only increment if doc exists and value is non-zero
              newDataForUpdate[typedKey] = increment(updateValue);
            } else {
              (currentData[typedKey] as number) = ((currentData[typedKey] as number | undefined) || 0) + updateValue;
            }
          }
        }

        if (docNeedsCreation) {
          transaction.set(summaryDocRef, currentData);
        } else if (Object.keys(newDataForUpdate).length > 0) {
          transaction.update(summaryDocRef, newDataForUpdate);
        }
      });
    } catch (e) {
      console.error("Dashboard summary transaction failed: ", e);
    }
  }, [userId, getDashboardSummaryDocRef]);

  useEffect(() => {
    if (authIsLoading || !firestoreInstance) {
      setIsLoading(true);
      console.warn("InvestmentContext: Auth loading or Firestore not available.");
      return () => {};
    }

    if (!isAuthenticated || !userId) {
      setInvestments([]);
      setTransactions([]);
      setIncomeRecords([]);
      setExpenseRecords([]);
      setFixedEstimates([]); // Reset new state
      setCurrencyAnalyses({});
      setDashboardSummary(defaultDashboardSummary);
      setIsLoading(false);
      console.warn("InvestmentContext: User not authenticated, userId missing. Skipping data fetching.");
      return () => {};
    }

    setIsLoading(true);
    const collectionsPaths = {
      investments: `users/${userId}/investments`,
      currencyAnalyses: `users/${userId}/currencyAnalyses`,
      transactions: `users/${userId}/transactions`,
      incomeRecords: `users/${userId}/incomeRecords`,
      expenseRecords: `users/${userId}/expenseRecords`,
      fixedEstimates: `users/${userId}/fixedEstimates`, // New collection path
    };
    
    const summaryDocRef = getDashboardSummaryDocRef();

    const unsubscribers: (() => void)[] = [];

    if (summaryDocRef) {
      unsubscribers.push(onSnapshot(summaryDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setDashboardSummary(docSnap.data() as DashboardSummary);
        } else {
          setDashboardSummary(defaultDashboardSummary);
          setDoc(summaryDocRef, { ...defaultDashboardSummary }, { merge: true })
            .catch(err => console.error("Failed to create default summary doc:", err));
        }
      }, (error) => {
        console.error("Error fetching dashboard summary:", error);
        setDashboardSummary(defaultDashboardSummary);
      }));
    } else {
      setDashboardSummary(defaultDashboardSummary);
    }
    
    const dataFetchPromises: Promise<any>[] = [];

    const setupListener = <T,>(path: string, setter: React.Dispatch<React.SetStateAction<T[]>>, orderByField = "createdAt", orderDirection: "asc" | "desc" = "desc") => {
      if (!firestoreInstance) return;
      const q = query(collection(firestoreInstance, path), orderBy(orderByField, orderDirection));
      dataFetchPromises.push(getDocs(q).catch(() => null)); // For initial loading state
      unsubscribers.push(onSnapshot(q, (querySnapshot) => {
        const fetchedItems: T[] = [];
        querySnapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          fetchedItems.push({
            id: documentSnapshot.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt, // if applicable
            date: data.date, // Assuming 'date' is a common field
          } as T);
        });
        setter(fetchedItems);
      }, (error) => {
        console.error(`Error fetching from ${path}:`, error);
        setter([]);
      }));
    };

    setupListener<Investment>(collectionsPaths.investments, setInvestments, "purchaseDate", "asc");
    setupListener<Transaction>(collectionsPaths.transactions, setTransactions, "date");
    setupListener<IncomeRecord>(collectionsPaths.incomeRecords, setIncomeRecords, "date");
    setupListener<ExpenseRecord>(collectionsPaths.expenseRecords, setExpenseRecords, "date");
    setupListener<FixedEstimateRecord>(collectionsPaths.fixedEstimates, setFixedEstimates, "type"); // Order by type for now


    const qAnalyses = query(collection(firestoreInstance, collectionsPaths.currencyAnalyses));
      dataFetchPromises.push(getDocs(qAnalyses).catch(() => null));
      unsubscribers.push(onSnapshot(qAnalyses, (querySnapshot) => {
        const fetchedAnalyses: Record<string, CurrencyFluctuationAnalysisResult> = {};
        querySnapshot.forEach((doc) => { fetchedAnalyses[doc.id] = doc.data() as CurrencyFluctuationAnalysisResult; });
        setCurrencyAnalyses(fetchedAnalyses);
      }, (error) => {
        console.error("Error fetching currency analyses:", error);
        setCurrencyAnalyses({});
    }));

    Promise.all(dataFetchPromises)
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false)); // Also set loading to false on error

    return () => unsubscribers.forEach(unsub => unsub());
  }, [userId, isAuthenticated, authIsLoading, getDashboardSummaryDocRef]);

  const addInvestment = useCallback(async (investmentData: Omit<Investment, 'createdAt' | 'id'>, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const investmentId = uuidv4();
    const investmentWithTimestamp = { ...investmentData, id: investmentId, userId, createdAt: serverTimestamp() };
    await setDoc(doc(firestoreInstance, `users/${userId}/investments`, investmentId), investmentWithTimestamp);
    if (investmentData.amountInvested) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: investmentData.amountInvested });
    if (analysis && investmentData.type === 'Currencies') await setDoc(doc(firestoreInstance, `users/${userId}/currencyAnalyses`, investmentId), analysis);
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const addIncomeRecord = useCallback(async (incomeData: Omit<IncomeRecord, 'id' | 'createdAt' | 'userId'>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const incomeId = uuidv4();
    await setDoc(doc(firestoreInstance, `users/${userId}/incomeRecords`, incomeId), { ...incomeData, id: incomeId, userId, createdAt: serverTimestamp() });
  }, [userId, isAuthenticated]);

  const addExpenseRecord = useCallback(async (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const expenseId = uuidv4();
    await setDoc(doc(firestoreInstance, `users/${userId}/expenseRecords`, expenseId), { ...expenseData, id: expenseId, userId, createdAt: serverTimestamp() });
  }, [userId, isAuthenticated]);

  // New function to add a fixed estimate
  const addFixedEstimate = useCallback(async (estimateData: Omit<FixedEstimateRecord, 'id' | 'createdAt' | 'userId' | 'updatedAt'>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const estimateId = uuidv4();
    const finalEstimateData = {
      ...estimateData,
      id: estimateId,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(firestoreInstance, `users/${userId}/fixedEstimates`, estimateId), finalEstimateData);
  }, [userId, isAuthenticated]);


  const getInvestmentsByType = useCallback((type: string) => investments.filter(inv => inv.type === type), [investments]);

  const recordSellStockTransaction = useCallback(async (listedStockId: string, tickerSymbol: string, numberOfSharesToSell: number, sellPricePerShare: number, sellDate: string, fees: number) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      console.error("recordSellStockTransaction: Firestore not available or user not authenticated.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const userStockInvestments = investments.filter(inv => inv.type === "Stocks" && inv.tickerSymbol === tickerSymbol) as StockInvestment[];
    userStockInvestments.sort((a, b) => (new Date(a.purchaseDate || 0).getTime()) - (new Date(b.purchaseDate || 0).getTime()));
    const totalOwnedShares = userStockInvestments.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0);
    if (numberOfSharesToSell > totalOwnedShares) throw new Error("Not enough shares to sell.");
    const totalCostOfAllLots = userStockInvestments.reduce((sum, inv) => sum + (inv.amountInvested || 0), 0);
    const averagePurchasePriceAllLots = totalOwnedShares > 0 ? totalCostOfAllLots / totalOwnedShares : 0;
    const totalProceeds = numberOfSharesToSell * sellPricePerShare - fees;
    const costOfSharesSold = averagePurchasePriceAllLots * numberOfSharesToSell;
    const profitOrLoss = totalProceeds - costOfSharesSold;
    const transactionId = uuidv4();
    const newTransaction = { 
      id: transactionId,
      stockId: listedStockId, 
      tickerSymbol, type: 'sell' as 'sell', 
      date: sellDate, 
      numberOfShares: numberOfSharesToSell, 
      pricePerShare: sellPricePerShare, 
      fees, 
      totalAmount: totalProceeds, 
      profitOrLoss, 
      createdAt: serverTimestamp() 
    };
    const batch = writeBatch(firestoreInstance);
    batch.set(doc(firestoreInstance, `users/${userId}/transactions`, transactionId), newTransaction);
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
        if (newShareCount === 0) batch.delete(investmentDocRef);
        else batch.update(investmentDocRef, { numberOfShares: newShareCount, amountInvested: costOfThisLot - costBasisOfSoldPortionFromLot });
        sharesToDeduct = 0;
      } else {
        costBasisReductionFromPortfolio += costOfThisLot;
        batch.delete(investmentDocRef);
        sharesToDeduct -= sharesInThisLot;
      }
    }
    await batch.commit();
    if (profitOrLoss) await updateDashboardSummaryDoc({ totalRealizedPnL: profitOrLoss });
    if (costBasisReductionFromPortfolio) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -costBasisReductionFromPortfolio });
  }, [userId, isAuthenticated, investments, updateDashboardSummaryDoc]);

  const correctedUpdateStockInvestment = useCallback(async (investmentId: string, dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>, oldAmountInvested: number) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      console.error("correctedUpdateStockInvestment: Firestore not available or user not authenticated.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    const newNumberOfShares = dataToUpdate.numberOfShares ?? 0;
    const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? 0;
    const newPurchaseFees = dataToUpdate.purchaseFees ?? 0;
    const newCalculatedAmountInvested = (newNumberOfShares * newPurchasePricePerShare) + newPurchaseFees;
    const updatedInvestmentData = { ...dataToUpdate, amountInvested: newCalculatedAmountInvested, updatedAt: serverTimestamp() };
    await setDoc(investmentDocRef, updatedInvestmentData, { merge: true });
    const amountInvestedDelta = newCalculatedAmountInvested - oldAmountInvested;
    if (amountInvestedDelta) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedDelta });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const deleteSellTransaction = useCallback(async (transactionToDelete: Transaction) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
       console.error("deleteSellTransaction: Firestore not available or user not authenticated.");
       throw new Error("User not authenticated or Firestore not available.");
    }
    if (transactionToDelete.type !== 'sell') throw new Error("Can only delete 'sell' transactions.");
    await deleteDoc(doc(firestoreInstance, `users/${userId}/transactions`, transactionToDelete.id));
    if (transactionToDelete.profitOrLoss !== undefined) await updateDashboardSummaryDoc({ totalRealizedPnL: -transactionToDelete.profitOrLoss });
    const costBasisOfSoldShares = transactionToDelete.totalAmount - (transactionToDelete.profitOrLoss || 0);
    if (costBasisOfSoldShares) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: costBasisOfSoldShares });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const removeStockInvestmentsBySymbol = useCallback(async (tickerSymbol: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      console.error("removeStockInvestmentsBySymbol: Firestore not available or user not authenticated.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const q = query(collection(firestoreInstance, `users/${userId}/investments`), where("type", "==", "Stocks"), where("tickerSymbol", "==", tickerSymbol));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(firestoreInstance);
    let totalAmountInvestedRemoved = 0;
    querySnapshot.forEach((docSnapshot) => {
      const investmentData = docSnapshot.data() as StockInvestment;
      totalAmountInvestedRemoved += investmentData.amountInvested || 0;
      batch.delete(docSnapshot.ref);
    });
    await batch.commit();
    if (totalAmountInvestedRemoved) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const removeGoldInvestments = useCallback(async (identifier: string, itemType: 'physical' | 'fund') => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      console.error("removeGoldInvestments: Firestore not available or user not authenticated.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    let totalAmountInvestedRemoved = 0;
    const investmentsCollectionPath = `users/${userId}/investments`;
    if (itemType === 'physical') {
      const goldType = identifier as GoldType;
      const q = query(collection(firestoreInstance, investmentsCollectionPath), where("type", "==", "Gold"), where("goldType", "==", goldType));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(firestoreInstance);
      querySnapshot.forEach((docSnapshot) => {
        totalAmountInvestedRemoved += (docSnapshot.data() as GoldInvestment).amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();
    } else if (itemType === 'fund') {
      await removeStockInvestmentsBySymbol(identifier); // This already updates summary
      return; 
    }
    if (totalAmountInvestedRemoved && itemType === 'physical') await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, removeStockInvestmentsBySymbol]);

  const removeDirectDebtInvestment = useCallback(async (investmentId: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      console.error("removeDirectDebtInvestment: Firestore not available or user not authenticated.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    const docSnap = await getDoc(investmentDocRef);
    if (!docSnap.exists()) return;
    const investmentData = docSnap.data() as DebtInstrumentInvestment;
    if (investmentData.type !== 'Debt Instruments') return;
    await deleteDoc(investmentDocRef);
    if (investmentData.amountInvested) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -investmentData.amountInvested });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  return (
    <InvestmentContext.Provider value={{
      investments, addInvestment, getInvestmentsByType, isLoading, currencyAnalyses,
      recordSellStockTransaction, transactions, removeStockInvestmentsBySymbol,
      updateStockInvestment: correctedUpdateStockInvestment,
      deleteSellTransaction, removeGoldInvestments, removeDirectDebtInvestment,
      dashboardSummary, incomeRecords, addIncomeRecord, expenseRecords, addExpenseRecord,
      fixedEstimates, addFixedEstimate, // Expose new state and function
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
