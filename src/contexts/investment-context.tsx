
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Investment, CurrencyFluctuationAnalysisResult, StockInvestment, Transaction, DashboardSummary, GoldInvestment, GoldType, DebtInstrumentInvestment, IncomeRecord, ExpenseRecord, MonthlySettings } from '@/lib/types';
import { db as firestoreInstance } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, Timestamp, writeBatch, orderBy, getDocs, deleteDoc, where, runTransaction, getDoc, increment } from 'firebase/firestore';
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
  updateMonthlySettings: (settings: MonthlySettings) => Promise<void>;
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
        let currentData: DashboardSummary = summaryDoc.exists() ? summaryDoc.data() as DashboardSummary : { ...defaultDashboardSummary };
        
        const newDataForUpdate: Partial<DashboardSummary> = {}; 
        let docNeedsCreation = !summaryDoc.exists();

        for (const key in updates) {
            const typedKey = key as keyof DashboardSummary;
            const updateValue = updates[typedKey];

            if (typeof updateValue === 'number') {
                if (summaryDoc.exists()) {
                    newDataForUpdate[typedKey] = increment(updateValue) as any;
                } else {
                    const currentFieldValue = (currentData[typedKey] as number | undefined) || 0;
                    (currentData[typedKey] as number) = currentFieldValue + updateValue;
                }
            }
        }
        if (docNeedsCreation) {
            transaction.set(summaryDocRef, currentData); // Use currentData which has been updated
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
    const investmentsCollectionPath = `users/${userId}/investments`;
    const analysesCollectionPath = `users/${userId}/currencyAnalyses`;
    const transactionsCollectionPath = `users/${userId}/transactions`;
    const incomeCollectionPath = `users/${userId}/incomeRecords`;
    const expensesCollectionPath = `users/${userId}/expenseRecords`;
    
    const summaryDocRef = getDashboardSummaryDocRef();
    const monthlySettingsDocRef = getMonthlySettingsDocRef();

    let unsubSummary = () => {};
    if (summaryDocRef) {
        unsubSummary = onSnapshot(summaryDocRef, (docSnap) => {
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
            });
    } else {
        setDashboardSummary(defaultDashboardSummary);
    }

    let unsubMonthlySettings = () => {};
    if (monthlySettingsDocRef) {
      unsubMonthlySettings = onSnapshot(monthlySettingsDocRef, (docSnap) => {
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
      });
    } else {
        setMonthlySettings(defaultMonthlySettings);
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

    const qIncomeRecords = query(collection(firestoreInstance, incomeCollectionPath), orderBy("date", "desc"));
    const unsubIncomeRecords = onSnapshot(qIncomeRecords, (querySnapshot) => {
        const fetchedIncomeRecords: IncomeRecord[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedIncomeRecords.push({
                id: docSnap.id,
                ...data,
                date: data.date,
                createdAt: data.createdAt && data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
            } as IncomeRecord);
        });
        setIncomeRecords(fetchedIncomeRecords);
    }, (error) => {
        console.error("Error fetching income records:", error);
        setIncomeRecords([]);
    });

    const qExpenseRecords = query(collection(firestoreInstance, expensesCollectionPath), orderBy("date", "desc"));
    const unsubExpenseRecords = onSnapshot(qExpenseRecords, (querySnapshot) => {
        const fetchedExpenseRecords: ExpenseRecord[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedExpenseRecords.push({
                id: docSnap.id,
                ...data,
                date: data.date,
                createdAt: data.createdAt && data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
            } as ExpenseRecord);
        });
        setExpenseRecords(fetchedExpenseRecords);
    }, (error) => {
        console.error("Error fetching expense records:", error);
        setExpenseRecords([]);
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

    const dataFetchPromises: Promise<any>[] = [
        getDocs(qInvestments).catch(() => null),
        getDocs(qTransactions).catch(() => null),
        getDocs(qIncomeRecords).catch(() => null),
        getDocs(qExpenseRecords).catch(() => null),
        getDocs(qAnalyses).catch(() => null)
    ];
    if (summaryDocRef) dataFetchPromises.push(getDoc(summaryDocRef).catch(() => null));
    if (monthlySettingsDocRef) dataFetchPromises.push(getDoc(monthlySettingsDocRef).catch(() => null));


    Promise.all(dataFetchPromises).then(() => {
        setIsLoading(false);
    }).catch(() => {
        setIsLoading(false);
    });


    return () => {
      unsubscribeInvestments();
      unsubscribeAnalyses();
      unsubTransactions();
      unsubIncomeRecords();
      unsubExpenseRecords();
      unsubSummary();
      unsubMonthlySettings();
    };
  }, [userId, isAuthenticated, authIsLoading, getDashboardSummaryDocRef, getMonthlySettingsDocRef]);

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
        id: investmentId, // Ensure the ID is part of the object passed to Firestore
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

  const addIncomeRecord = useCallback(async (incomeData: Omit<IncomeRecord, 'id' | 'createdAt' | 'userId'>) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("AddIncomeRecord: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const incomeId = uuidv4();
    const incomeWithMetadata = {
      ...incomeData,
      id: incomeId,
      userId: userId,
      createdAt: serverTimestamp(),
    };

    try {
      const incomeDocRef = doc(firestoreInstance, `users/${userId}/incomeRecords`, incomeId);
      await setDoc(incomeDocRef, incomeWithMetadata);
    } catch (error) {
      console.error("Error adding income record to Firestore:", error);
      throw error;
    }
  }, [userId, isAuthenticated]);

  const addExpenseRecord = useCallback(async (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("AddExpenseRecord: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const expenseId = uuidv4();
    const expenseWithMetadata = {
      ...expenseData,
      id: expenseId,
      userId: userId,
      createdAt: serverTimestamp(),
    };
    try {
      const expenseDocRef = doc(firestoreInstance, `users/${userId}/expenseRecords`, expenseId);
      await setDoc(expenseDocRef, expenseWithMetadata);
    } catch (error) {
      console.error("Error adding expense record to Firestore:", error);
      throw error;
    }
  }, [userId, isAuthenticated]);

  const updateMonthlySettings = useCallback(async (settings: MonthlySettings) => {
    if (!isAuthenticated || !userId || !firestoreInstance) {
      console.error("UpdateMonthlySettings: User not authenticated, userId missing, or Firestore not available.");
      throw new Error("User not authenticated or Firestore not available.");
    }
    const settingsDocRef = getMonthlySettingsDocRef();
    if (!settingsDocRef) return;

    try {
      // Ensure numeric values or use null for deletion if undefined
      const dataToSave = {
        estimatedLivingExpenses: settings.estimatedLivingExpenses ?? null,
        estimatedZakat: settings.estimatedZakat ?? null,
        estimatedCharity: settings.estimatedCharity ?? null,
      };
      await setDoc(settingsDocRef, dataToSave, { merge: true });
    } catch (error) {
      console.error("Error updating monthly settings:", error);
      throw error;
    }
  }, [userId, isAuthenticated, getMonthlySettingsDocRef]);


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

      userStockInvestments.sort((a, b) => {
          const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
          const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
          return dateA - dateB;
      });


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

  const correctedUpdateStockInvestment = useCallback(async (
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
      await batch.commit();
      if (totalAmountInvestedRemoved !== 0) {
          await updateDashboardSummaryDoc({ totalInvestedAcrossAllAssets: -totalAmountInvestedRemoved });
      }
    } else if (itemType === 'fund') {
      const tickerSymbol = identifier;
      await removeStockInvestmentsBySymbol(tickerSymbol);
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
        updateStockInvestment: correctedUpdateStockInvestment,
        deleteSellTransaction,
        removeGoldInvestments,
        removeDirectDebtInvestment,
        dashboardSummary,
        incomeRecords,
        addIncomeRecord,
        expenseRecords,
        addExpenseRecord,
        monthlySettings,
        updateMonthlySettings,
    }}>
      {children}
    </InvestmentContext.Provider>
  );
};
