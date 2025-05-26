
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary, GoldInvestment, GoldType, DebtInstrumentInvestment, IncomeRecord, ExpenseRecord, MonthlySettings } from '@/lib/types';
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
  monthlySettings: MonthlySettings | null;
  updateMonthlySettings: (settings: Partial<MonthlySettings>) => Promise<void>;
}

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

const defaultDashboardSummary: DashboardSummary = {
  totalInvestedAcrossAllAssets: 0,
  totalRealizedPnL: 0,
};

const defaultMonthlySettings: MonthlySettings = {
  estimatedLivingExpenses: undefined,
  estimatedZakat: undefined,
  estimatedCharity: undefined,
};

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [monthlySettings, setMonthlySettings] = useState<MonthlySettings | null>(defaultMonthlySettings);
  const [currencyAnalyses, setCurrencyAnalyses] = useState<Record<string, CurrencyFluctuationAnalysisResult>>({});
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(defaultDashboardSummary);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const userId = user?.uid;

  const getDashboardSummaryDocRef = useCallback(() => {
    if (!userId || !firestoreInstance) return null;
    return doc(firestoreInstance, `users/${userId}/dashboard_aggregates/summary`);
  }, [userId]);

  const getMonthlySettingsDocRef = useCallback(() => {
    if (!userId || !firestoreInstance) return null;
    return doc(firestoreInstance, `users/${userId}/settings/monthly`);
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
            if (summaryDoc.exists()) {
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
      return () => {};
    }

    if (!isAuthenticated || !userId) {
      setInvestments([]);
      setTransactions([]);
      setIncomeRecords([]);
      setExpenseRecords([]);
      setMonthlySettings(defaultMonthlySettings);
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
    };
    
    const summaryDocRef = getDashboardSummaryDocRef();
    const monthlySettingsDocRef = getMonthlySettingsDocRef();

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

    if (monthlySettingsDocRef) {
      unsubscribers.push(onSnapshot(monthlySettingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setMonthlySettings(docSnap.data() as MonthlySettings);
        } else {
          setMonthlySettings(defaultMonthlySettings);
           setDoc(monthlySettingsDocRef, { ...defaultMonthlySettings }, { merge: true })
             .catch(err => console.error("Failed to create default monthly settings doc:", err));
        }
      }, (error) => {
        console.error("Error fetching monthly settings:", error);
        setMonthlySettings(defaultMonthlySettings);
      }));
    } else {
      setMonthlySettings(defaultMonthlySettings);
    }

    const qInvestments = query(collection(firestoreInstance, collectionsPaths.investments), orderBy("purchaseDate", "asc"));
    unsubscribers.push(onSnapshot(qInvestments, (querySnapshot) => {
      const fetchedInvestments: Investment[] = [];
      querySnapshot.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();
        fetchedInvestments.push({
          id: documentSnapshot.id,
          ...data,
          purchaseDate: data.purchaseDate,
          createdAt: data.createdAt && data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        } as Investment);
      });
      setInvestments(fetchedInvestments);
    }, (error) => console.error("Error fetching investments:", error)));

    const qTransactions = query(collection(firestoreInstance, collectionsPaths.transactions), orderBy("date", "desc"));
    unsubscribers.push(onSnapshot(qTransactions, (querySnapshot) => {
      const fetchedTransactions: Transaction[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedTransactions.push({
          id: docSnap.id, ...data,
          date: data.date,
          createdAt: data.createdAt && data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        } as Transaction);
      });
      setTransactions(fetchedTransactions);
    }, (error) => console.error("Error fetching transactions:", error)));

    const qIncomeRecords = query(collection(firestoreInstance, collectionsPaths.incomeRecords), orderBy("date", "desc"));
    unsubscribers.push(onSnapshot(qIncomeRecords, (querySnapshot) => {
        const fetchedIncomeRecords: IncomeRecord[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedIncomeRecords.push({
                id: docSnap.id, ...data, date: data.date,
                createdAt: data.createdAt && data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            } as IncomeRecord);
        });
        setIncomeRecords(fetchedIncomeRecords);
    }, (error) => console.error("Error fetching income records:", error)));

    const qExpenseRecords = query(collection(firestoreInstance, collectionsPaths.expenseRecords), orderBy("date", "desc"));
    unsubscribers.push(onSnapshot(qExpenseRecords, (querySnapshot) => {
        const fetchedExpenseRecords: ExpenseRecord[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedExpenseRecords.push({
                id: docSnap.id, ...data, date: data.date,
                createdAt: data.createdAt && data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            } as ExpenseRecord);
        });
        setExpenseRecords(fetchedExpenseRecords);
    }, (error) => console.error("Error fetching expense records:", error)));

    const qAnalyses = query(collection(firestoreInstance, collectionsPaths.currencyAnalyses));
    unsubscribers.push(onSnapshot(qAnalyses, (querySnapshot) => {
      const fetchedAnalyses: Record<string, CurrencyFluctuationAnalysisResult> = {};
      querySnapshot.forEach((doc) => { fetchedAnalyses[doc.id] = doc.data() as CurrencyFluctuationAnalysisResult; });
      setCurrencyAnalyses(fetchedAnalyses);
    }, (error) => console.error("Error fetching currency analyses:", error)));

    const dataFetchPromises: Promise<any>[] = [
      getDocs(qInvestments).catch(() => null),
      getDocs(qTransactions).catch(() => null),
      getDocs(qIncomeRecords).catch(() => null),
      getDocs(qExpenseRecords).catch(() => null),
      getDocs(qAnalyses).catch(() => null)
    ];
    if (summaryDocRef) dataFetchPromises.push(getDoc(summaryDocRef).catch(() => null));
    if (monthlySettingsDocRef) dataFetchPromises.push(getDoc(monthlySettingsDocRef).catch(() => null));

    Promise.all(dataFetchPromises).then(() => setIsLoading(false)).catch(() => setIsLoading(false));

    return () => unsubscribers.forEach(unsub => unsub());
  }, [userId, isAuthenticated, authIsLoading, getDashboardSummaryDocRef, getMonthlySettingsDocRef]);

  const addInvestment = useCallback(async (investmentData: Omit<Investment, 'createdAt' | 'id'>, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const investmentId = uuidv4();
    const investmentWithTimestamp = { ...investmentData, id: investmentId, createdAt: serverTimestamp() };
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

  const updateMonthlySettings = useCallback(async (settings: Partial<MonthlySettings>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const settingsDocRef = getMonthlySettingsDocRef();
    if (!settingsDocRef) return;
    const dataToSave = {
      estimatedLivingExpenses: settings.estimatedLivingExpenses === undefined ? null : settings.estimatedLivingExpenses,
      estimatedZakat: settings.estimatedZakat === undefined ? null : settings.estimatedZakat,
      estimatedCharity: settings.estimatedCharity === undefined ? null : settings.estimatedCharity,
    };
    await setDoc(settingsDocRef, dataToSave, { merge: true });
  }, [userId, isAuthenticated, getMonthlySettingsDocRef]);

  const getInvestmentsByType = useCallback((type: string) => investments.filter(inv => inv.type === type), [investments]);

  const recordSellStockTransaction = useCallback(async (listedStockId: string, tickerSymbol: string, numberOfSharesToSell: number, sellPricePerShare: number, sellDate: string, fees: number) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
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
    const newTransaction = { stockId: listedStockId, tickerSymbol, type: 'sell' as 'sell', date: sellDate, numberOfShares: numberOfSharesToSell, pricePerShare: sellPricePerShare, fees, totalAmount: totalProceeds, profitOrLoss, createdAt: serverTimestamp() };
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
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    const newNumberOfShares = dataToUpdate.numberOfShares ?? 0;
    const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? 0;
    const newPurchaseFees = dataToUpdate.purchaseFees ?? 0;
    const newCalculatedAmountInvested = (newNumberOfShares * newPurchasePricePerShare) + newPurchaseFees;
    const updatedInvestmentData = { ...dataToUpdate, amountInvested: newCalculatedAmountInvested };
    await setDoc(investmentDocRef, updatedInvestmentData, { merge: true });
    const amountInvestedDelta = newCalculatedAmountInvested - oldAmountInvested;
    if (amountInvestedDelta) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedDelta });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const deleteSellTransaction = useCallback(async (transactionToDelete: Transaction) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    if (transactionToDelete.type !== 'sell') throw new Error("Can only delete 'sell' transactions.");
    await deleteDoc(doc(firestoreInstance, `users/${userId}/transactions`, transactionToDelete.id));
    if (transactionToDelete.profitOrLoss !== undefined) await updateDashboardSummaryDoc({ totalRealizedPnL: -transactionToDelete.profitOrLoss });
    const costBasisOfSoldShares = transactionToDelete.totalAmount - (transactionToDelete.profitOrLoss || 0);
    if (costBasisOfSoldShares) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: costBasisOfSoldShares });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc]);

  const removeStockInvestmentsBySymbol = useCallback(async (tickerSymbol: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
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
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
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
      // For gold funds, 'identifier' is the tickerSymbol. Re-use removeStockInvestmentsBySymbol.
      // This will correctly sum the amountInvested of the funds being removed.
      await removeStockInvestmentsBySymbol(identifier);
      return; // updateDashboardSummaryDoc is handled by removeStockInvestmentsBySymbol
    }
    if (totalAmountInvestedRemoved) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, removeStockInvestmentsBySymbol]);

  const removeDirectDebtInvestment = useCallback(async (investmentId: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
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
      monthlySettings, updateMonthlySettings,
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
    
    