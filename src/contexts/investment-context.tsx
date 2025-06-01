"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary, GoldInvestment, GoldType, DebtInstrumentInvestment, IncomeRecord, ExpenseRecord, FixedEstimateRecord, RealEstateInvestment } from '@/lib/types';
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
  removeRealEstateInvestment: (investmentId: string) => Promise<void>;
  dashboardSummary: DashboardSummary | null;
  incomeRecords: IncomeRecord[];
  addIncomeRecord: (incomeData: Omit<IncomeRecord, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  expenseRecords: ExpenseRecord[];
  addExpenseRecord: (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  fixedEstimates: FixedEstimateRecord[];
  addFixedEstimate: (estimateData: Omit<FixedEstimateRecord, 'id' | 'createdAt' | 'userId' | 'updatedAt'>) => Promise<void>;
  recalculateDashboardSummary: () => Promise<void>;
  updateRealEstateInvestment: (investmentId: string, dataToUpdate: Partial<RealEstateInvestment>) => Promise<void>;
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
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>([]);
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

          if (typeof updateValue === 'number') { // Ensure it's a number
            if (summaryDoc.exists()) {
              // Only add to newDataForUpdate if it's a non-zero change to avoid empty updates
              if (updateValue !== 0) {
                  newDataForUpdate[typedKey] = increment(updateValue);
              }
            } else {
              // For new doc, accumulate directly into currentData
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
  }, [userId, getDashboardSummaryDocRef, firestoreInstance]);


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
      setFixedEstimates([]);
      setCurrencyAnalyses({});
      setDashboardSummary(defaultDashboardSummary);
      setIsLoading(false);
      return () => {};
    }

    setIsLoading(true);
    const collectionsPaths = {
      investments: `users/${userId}/investments`,
      currencyAnalyses: `users/${userId}/currencyAnalyses`,
      transactions: `users/${userId}/transactions`,
      incomeRecords: `users/${userId}/incomeRecords`,
      expenseRecords: `users/${userId}/expenseRecords`,
      fixedEstimates: `users/${userId}/fixedEstimates`,
    };
    
    const unsubscribers: (() => void)[] = [];
    const dataFetchPromises: Promise<any>[] = [];

    const setupListener = <T,>(path: string, setter: React.Dispatch<React.SetStateAction<T[]>>, orderByField = "createdAt", orderDirection: "asc" | "desc" = "desc") => {
      if (!firestoreInstance) return;
      const q = query(collection(firestoreInstance, path), orderBy(orderByField, orderDirection));
      dataFetchPromises.push(getDocs(q).catch(() => null)); 
      unsubscribers.push(onSnapshot(q, (querySnapshot) => {
        const fetchedItems: T[] = [];
        querySnapshot.forEach((documentSnapshot) => {
          const data = documentSnapshot.data();
          fetchedItems.push({
            id: documentSnapshot.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
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
    setupListener<FixedEstimateRecord>(collectionsPaths.fixedEstimates, setFixedEstimates, "type");

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

    // Add initial fetch for dashboard summary
    const summaryDocRef = getDashboardSummaryDocRef();
    if (summaryDocRef) {
      dataFetchPromises.push(
        getDoc(summaryDocRef)
          .then(docSnap => {
            if (docSnap.exists()) {
              setDashboardSummary(docSnap.data() as DashboardSummary);
            } else {
              setDashboardSummary(defaultDashboardSummary);
              // Attempt to create the document if it doesn't exist
              return setDoc(summaryDocRef, { ...defaultDashboardSummary }, { merge: true });
            }
          })
          .catch(error => {
            console.error("Error initial fetching/creating dashboard summary:", error);
            setDashboardSummary(defaultDashboardSummary);
          })
      );
      // The onSnapshot listener will then keep it up-to-date
      unsubscribers.push(onSnapshot(summaryDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setDashboardSummary(docSnap.data() as DashboardSummary);
        } else {
          // Document might have been deleted, reset to default and try to recreate
          setDashboardSummary(defaultDashboardSummary);
          setDoc(summaryDocRef, { ...defaultDashboardSummary }, { merge: true })
            .catch(err => console.error("Failed to re-create default summary doc on snapshot non-existence:", err));
        }
      }, (error) => {
        console.error("Error listening to dashboard summary:", error);
        setDashboardSummary(defaultDashboardSummary);
      }));
    } else {
      setDashboardSummary(defaultDashboardSummary);
      // If no summaryDocRef (e.g. no userId yet), and no other promises, set loading to false
      if(dataFetchPromises.length === 0) setIsLoading(false);
    }
    
    Promise.all(dataFetchPromises)
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false)); 

    return () => unsubscribers.forEach(unsub => unsub());
  }, [userId, isAuthenticated, authIsLoading, getDashboardSummaryDocRef, firestoreInstance]);

  const addInvestment = useCallback(async (investmentData: Omit<Investment, 'createdAt' | 'id'>, analysis?: CurrencyFluctuationAnalysisResult) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const investmentId = uuidv4();
    const investmentWithTimestamp = { ...investmentData, id: investmentId, userId, createdAt: serverTimestamp() };
    await setDoc(doc(firestoreInstance, `users/${userId}/investments`, investmentId), investmentWithTimestamp);
    
    const amountInvestedValue = Number(investmentData.amountInvested);
    if (!isNaN(amountInvestedValue) && amountInvestedValue !== 0) {
      await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedValue });
    }
    if (analysis && investmentData.type === 'Currencies') await setDoc(doc(firestoreInstance, `users/${userId}/currencyAnalyses`, investmentId), analysis);
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  const addIncomeRecord = useCallback(async (incomeData: Omit<IncomeRecord, 'id' | 'createdAt' | 'userId'>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const incomeId = uuidv4();
    await setDoc(doc(firestoreInstance, `users/${userId}/incomeRecords`, incomeId), { ...incomeData, id: incomeId, userId, createdAt: serverTimestamp() });
  }, [userId, isAuthenticated, firestoreInstance]);

  const addExpenseRecord = useCallback(async (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const expenseId = uuidv4();
    await setDoc(doc(firestoreInstance, `users/${userId}/expenseRecords`, expenseId), { ...expenseData, id: expenseId, userId, createdAt: serverTimestamp() });
  }, [userId, isAuthenticated, firestoreInstance]);

  const addFixedEstimate = useCallback(async (estimateData: Omit<FixedEstimateRecord, 'id' | 'createdAt' | 'userId' | 'updatedAt'>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) throw new Error("User not authenticated or Firestore not available.");
    const estimateId = uuidv4();
    const finalEstimateData: FixedEstimateRecord = {
      ...estimateData,
      id: estimateId,
      userId,
      createdAt: serverTimestamp() as unknown as string, // Temp cast for serverTimestamp
      updatedAt: serverTimestamp() as unknown as string, // Temp cast
    };
    await setDoc(doc(firestoreInstance, `users/${userId}/fixedEstimates`, estimateId), finalEstimateData);
  }, [userId, isAuthenticated, firestoreInstance]);

  const getInvestmentsByType = useCallback((type: string) => investments.filter(inv => inv.type === type), [investments]);

  const recordSellStockTransaction = useCallback(async (listedStockId: string, tickerSymbol: string, numberOfSharesToSell: number, sellPricePerShare: number, sellDate: string, fees: number) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      throw new Error("User not authenticated or Firestore not available.");
    }
    const userStockInvestments = investments.filter(inv => inv.type === "Stocks" && inv.tickerSymbol === tickerSymbol) as StockInvestment[];
    userStockInvestments.sort((a, b) => (new Date(a.purchaseDate || 0).getTime()) - (new Date(b.purchaseDate || 0).getTime()));
    const totalOwnedShares = userStockInvestments.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0);
    if (numberOfSharesToSell > totalOwnedShares) throw new Error("Not enough shares to sell.");
    
    let costOfSharesBeingSold = 0;
    let sharesRemainingToAccountFor = numberOfSharesToSell;
    for (const lot of userStockInvestments) {
        if (sharesRemainingToAccountFor <= 0) break;
        const sharesFromThisLot = Math.min(lot.numberOfShares || 0, sharesRemainingToAccountFor);
        costOfSharesBeingSold += sharesFromThisLot * (lot.purchasePricePerShare || 0);
        sharesRemainingToAccountFor -= sharesFromThisLot;
    }
    
    const totalProceeds = numberOfSharesToSell * sellPricePerShare - fees;
    const profitOrLoss = totalProceeds - costOfSharesBeingSold;

    const transactionId = uuidv4();
    const newTransaction: Omit<Transaction, 'createdAt'> & { createdAt: FieldValue } = { 
      id: transactionId,
      stockId: listedStockId, 
      tickerSymbol,
      type: 'sell',
      date: sellDate,
      numberOfShares: numberOfSharesToSell, // changed from 'shares' to 'numberOfShares'
      pricePerShare: sellPricePerShare, // Added missing property
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
        const proportionSoldFromLot = costOfThisLot > 0 && sharesInThisLot > 0 ? sharesToDeduct / sharesInThisLot : 0;
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

    if (!isNaN(profitOrLoss)) await updateDashboardSummaryDoc({ totalRealizedPnL: profitOrLoss });
    if (!isNaN(costBasisReductionFromPortfolio) && costBasisReductionFromPortfolio !== 0) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -costBasisReductionFromPortfolio });

    if (profitOrLoss > 0) {
      const incomeData: Omit<IncomeRecord, 'id' | 'createdAt' | 'userId'> = {
        type: 'Profit Share',
        source: `Sale of ${tickerSymbol}`,
        amount: profitOrLoss,
        date: sellDate,
        description: `Profit from selling ${numberOfSharesToSell} units of ${tickerSymbol}.`,
      };
      await addIncomeRecord(incomeData);
    }

  }, [userId, isAuthenticated, investments, updateDashboardSummaryDoc, addIncomeRecord, firestoreInstance]);

  const correctedUpdateStockInvestment = useCallback(async (investmentId: string, dataToUpdate: Pick<StockInvestment, 'numberOfShares' | 'purchasePricePerShare' | 'purchaseDate' | 'purchaseFees'>, oldAmountInvested: number) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
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
    if (!isNaN(amountInvestedDelta) && amountInvestedDelta !== 0) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedDelta });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  const deleteSellTransaction = useCallback(async (transactionToDelete: Transaction) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
       throw new Error("User not authenticated or Firestore not available.");
    }
    if (transactionToDelete.type !== 'sell') throw new Error("Can only delete 'sell' transactions.");
    await deleteDoc(doc(firestoreInstance, `users/${userId}/transactions`, transactionToDelete.id));
    if (transactionToDelete.profitOrLoss !== undefined && !isNaN(transactionToDelete.profitOrLoss)) {
      await updateDashboardSummaryDoc({ totalRealizedPnL: -transactionToDelete.profitOrLoss });
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  const removeStockInvestmentsBySymbol = useCallback(async (tickerSymbol: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
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
    if (!isNaN(totalAmountInvestedRemoved) && totalAmountInvestedRemoved !== 0) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  const removeGoldInvestments = useCallback(async (identifier: string, itemType: 'physical' | 'fund') => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      throw new Error("User not authenticated or Firestore not available.");
    }
    let totalAmountInvestedRemoved = 0;
    const investmentsCollectionPath = `users/${userId}/investments`;
    const batch = writeBatch(firestoreInstance);

    if (itemType === 'physical') {
      const goldType = identifier as GoldType;
      const q = query(collection(firestoreInstance, investmentsCollectionPath), where("type", "==", "Gold"), where("goldType", "==", goldType));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnapshot) => {
        totalAmountInvestedRemoved += (docSnapshot.data() as GoldInvestment).amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
    } else if (itemType === 'fund') {
      // For funds, 'identifier' is the tickerSymbol.
      // We need to fetch these to sum their amountInvested before deleting.
      const q = query(collection(firestoreInstance, investmentsCollectionPath), where("type", "==", "Stocks"), where("tickerSymbol", "==", identifier));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnapshot) => {
        totalAmountInvestedRemoved += (docSnapshot.data() as StockInvestment).amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
    }
    await batch.commit();
    if (!isNaN(totalAmountInvestedRemoved) && totalAmountInvestedRemoved !== 0) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  const removeDirectDebtInvestment = useCallback(async (investmentId: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    const docSnap = await getDoc(investmentDocRef);
    if (!docSnap.exists()) return;
    const investmentData = docSnap.data() as DebtInstrumentInvestment;
    if (investmentData.type !== 'Debt Instruments') return; // Should not happen if called correctly
    
    const amountInvested = investmentData.amountInvested;
    await deleteDoc(investmentDocRef);
    if (!isNaN(amountInvested) && amountInvested !== 0) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -amountInvested });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  const removeRealEstateInvestment = useCallback(async (investmentId: string) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    const docSnap = await getDoc(investmentDocRef);
    if (!docSnap.exists()) return;
    const investmentData = docSnap.data() as Investment;
    if (investmentData.type !== 'Real Estate') return; // Only allow for real estate
    const amountInvested = investmentData.amountInvested;
    await deleteDoc(investmentDocRef);
    if (!isNaN(amountInvested) && amountInvested !== 0) await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -amountInvested });
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  // Recalculate dashboard summary from all current investments and transactions
  const recalculateDashboardSummary = useCallback(async () => {
    if (!userId || !firestoreInstance) return;
    // Calculate total invested
    const totalInvestedAcrossAllAssets = investments.reduce((sum, inv) => sum + (inv.amountInvested || 0), 0);
    // Calculate total realized PnL
    const totalRealizedPnL = transactions.reduce((sum, txn) => sum + (txn.profitOrLoss || 0), 0);
    // You can expand this logic as needed
    const summaryDocRef = getDashboardSummaryDocRef();
    if (summaryDocRef) {
      await setDoc(summaryDocRef, {
        totalInvestedAcrossAllAssets,
        totalRealizedPnL,
      }, { merge: true });
    }
  }, [userId, firestoreInstance, investments, transactions, getDashboardSummaryDocRef]);

  // Add updateRealEstateInvestment implementation
  const updateRealEstateInvestment = useCallback(async (investmentId: string, dataToUpdate: Partial<RealEstateInvestment>) => {
    if (!firestoreInstance || !isAuthenticated || !userId) {
      throw new Error("User not authenticated or Firestore not available.");
    }
    const investmentDocRef = doc(firestoreInstance, `users/${userId}/investments`, investmentId);
    const docSnap = await getDoc(investmentDocRef);
    if (!docSnap.exists()) throw new Error("Investment not found.");
    const oldData = docSnap.data() as RealEstateInvestment;
    if (oldData.type !== 'Real Estate') throw new Error("Not a real estate investment.");
    const oldAmountInvested = oldData.amountInvested || 0;
    // Calculate new amountInvested if provided, else keep old
    const newAmountInvested = typeof dataToUpdate.amountInvested === 'number' ? dataToUpdate.amountInvested : oldAmountInvested;
    const updatedInvestmentData = { ...dataToUpdate, amountInvested: newAmountInvested, updatedAt: serverTimestamp() };
    await setDoc(investmentDocRef, updatedInvestmentData, { merge: true });
    const amountInvestedDelta = newAmountInvested - oldAmountInvested;
    if (!isNaN(amountInvestedDelta) && amountInvestedDelta !== 0) {
      await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: amountInvestedDelta });
    }
  }, [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance]);

  return (
    <InvestmentContext.Provider value={{
      investments, addInvestment, getInvestmentsByType, isLoading, currencyAnalyses,
      recordSellStockTransaction, transactions, removeStockInvestmentsBySymbol,
      updateStockInvestment: correctedUpdateStockInvestment,
      deleteSellTransaction, removeGoldInvestments, removeDirectDebtInvestment,
      removeRealEstateInvestment, updateRealEstateInvestment,
      dashboardSummary, incomeRecords, addIncomeRecord, expenseRecords, addExpenseRecord,
      fixedEstimates, addFixedEstimate, recalculateDashboardSummary,
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};

