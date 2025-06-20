"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from "react";
import type {
  Investment,
  CurrencyFluctuationAnalysisResult,
  StockInvestment,
  Transaction,
  DashboardSummary,
  GoldInvestment,
  GoldType,
  DebtInstrumentInvestment,
  IncomeRecord,
  ExpenseRecord,
  FixedEstimateRecord,
  RealEstateInvestment,
  AppSettings,
} from "@/lib/types";
import { db as firestoreInstance } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  orderBy,
  getDocs,
  deleteDoc,
  where,
  runTransaction,
  getDoc,
  increment,
  FieldValue,
} from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { v4 as uuidv4 } from "uuid";

export interface InvestmentContextType {
  updateIncomeRecord: (
    incomeId: string,
    updatedFields: Partial<IncomeRecord>,
  ) => Promise<void>;
  investments: Investment[];
  addInvestment: (
    investmentData: Omit<Investment, "createdAt" | "id">,
    analysis?: CurrencyFluctuationAnalysisResult,
  ) => Promise<void>;
  getInvestmentsByType: (type: string) => Investment[];
  isLoading: boolean;
  currencyAnalyses: Record<string, CurrencyFluctuationAnalysisResult>;
  recordSellStockTransaction: (
    listedsecurityId: string,
    tickerSymbol: string,
    numberOfSharesToSell: number,
    sellPricePerShare: number,
    sellDate: string,
    fees: number,
  ) => Promise<void>;
  transactions: Transaction[];
  removeStockInvestmentsBySymbol: (tickerSymbol: string) => Promise<void>;
  updateStockInvestment: (
    investmentId: string,
    dataToUpdate: Pick<
      StockInvestment,
      | "numberOfShares"
      | "purchasePricePerShare"
      | "purchaseDate"
      | "purchaseFees"
    >,
    oldAmountInvested: number,
  ) => Promise<void>;
  deleteSellTransaction: (transaction: Transaction) => Promise<void>;
  removeGoldInvestments: (
    identifier: string,
    itemType: "physical" | "fund",
  ) => Promise<void>;
  removeDirectDebtInvestment: (investmentId: string) => Promise<void>;
  removeRealEstateInvestment: (investmentId: string) => Promise<void>;
  dashboardSummary: DashboardSummary | null;
  incomeRecords: IncomeRecord[];
  addIncomeRecord: (
    incomeData: Omit<IncomeRecord, "id" | "createdAt" | "userId">,
  ) => Promise<void>;
  deleteIncomeRecord: (incomeId: string) => Promise<void>;
  expenseRecords: ExpenseRecord[];
  addExpenseRecord: (
    expenseData: Omit<ExpenseRecord, "id" | "createdAt" | "userId">,
  ) => Promise<void>;
  deleteExpenseRecord: (expenseId: string) => Promise<void>;
  updateExpenseRecord: (
    expenseId: string,
    updatedFields: Partial<ExpenseRecord>,
  ) => Promise<void>;
  fixedEstimates: FixedEstimateRecord[];
  addFixedEstimate: (
    estimateData: Omit<
      FixedEstimateRecord,
      "id" | "createdAt" | "userId" | "updatedAt"
    >,
  ) => Promise<void>;
  deleteFixedEstimate: (id: string) => Promise<void>;
  recalculateDashboardSummary: () => Promise<void>;
  updateRealEstateInvestment: (
    investmentId: string,
    dataToUpdate: Partial<RealEstateInvestment>,
  ) => Promise<void>;
  appSettings: AppSettings | null;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const InvestmentContext = createContext<
  InvestmentContextType | undefined
>(undefined);

const defaultDashboardSummary: DashboardSummary = {
  totalInvestedAcrossAllAssets: 0,
  totalRealizedPnL: 0,
  totalCashBalance: 0, // Initialize totalCashBalance
};

const defaultAppSettings: AppSettings = {
  financialYearStartMonth: 1, // Default to January
};

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  // ... existing state and hooks

  const updateIncomeRecord = async (
    incomeId: string,
    updatedFields: Partial<IncomeRecord>,
  ) => {
    if (!firestoreInstance || !userId) {
      throw new Error("Firestore instance or user ID is not initialized");
    }
    try {
      const incomeDocRef = doc(
        firestoreInstance,
        `users/${userId}/incomeRecords/${incomeId}`,
      );
      await setDoc(incomeDocRef, updatedFields, { merge: true });
      setIncomeRecords((prev) =>
        prev.map((rec) =>
          rec.id === incomeId ? { ...rec, ...updatedFields } : rec,
        ),
      );
    } catch (error) {
      console.error("Error updating income record:", error);
      throw error;
    }
  };
  // ... existing state and hooks
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>(
    [],
  );
  const [currencyAnalyses, setCurrencyAnalyses] = useState<
    Record<string, CurrencyFluctuationAnalysisResult>
  >({});
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummary | null>(defaultDashboardSummary);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(
    defaultAppSettings,
  );
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const userId = user?.uid;

  const getDashboardSummaryDocRef = useCallback(() => {
    if (!userId || !firestoreInstance) return null;
    return doc(
      firestoreInstance,
      `users/${userId}/dashboard_aggregates/summary`,
    );
  }, [userId]);

  const getAppSettingsDocRef = useCallback(() => {
    if (!userId || !firestoreInstance) return null;
    return doc(firestoreInstance, `users/${userId}/settings/appSettings`);
  }, [userId]);

  const updateDashboardSummaryDoc = useCallback(
    async (updates: Partial<DashboardSummary>) => {
      if (!userId || !firestoreInstance) {
        console.warn(
          "UpdateDashboardSummaryDoc: User ID or Firestore instance missing.",
        );
        return;
      }
      const summaryDocRef = getDashboardSummaryDocRef();
      if (!summaryDocRef) return;

      try {
        await runTransaction(firestoreInstance, async (transaction) => {
          const summaryDoc = await transaction.get(summaryDocRef);
          const currentData: DashboardSummary = summaryDoc.exists()
            ? (summaryDoc.data() as DashboardSummary)
            : { ...defaultDashboardSummary };

          const newDataForUpdate: { [key: string]: FieldValue | number } = {};
          let docNeedsCreation = !summaryDoc.exists();

          for (const key in updates) {
            const typedKey = key as keyof DashboardSummary;
            const updateValue = updates[typedKey];

            if (typeof updateValue === "number") {
              if (summaryDoc.exists()) {
                if (updateValue !== 0) {
                  newDataForUpdate[typedKey] = increment(updateValue);
                }
              } else {
                // If doc doesn't exist, apply update to in-memory default before setting
                (currentData[typedKey] as number) =
                  ((currentData[typedKey] as number | undefined) || 0) +
                  updateValue;
              }
            }
          }

          if (docNeedsCreation) {
            transaction.set(summaryDocRef, currentData); // Use potentially modified currentData
          } else if (Object.keys(newDataForUpdate).length > 0) {
            transaction.update(summaryDocRef, newDataForUpdate);
          }
        });
      } catch (e) {
        console.error("Dashboard summary transaction failed: ", e);
      }
    },
    [userId, getDashboardSummaryDocRef, firestoreInstance],
  );

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
      setAppSettings(defaultAppSettings);
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

    const setupListener = <T,>(
      path: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      orderByField = "createdAt",
      orderDirection: "asc" | "desc" = "desc",
    ) => {
      if (!firestoreInstance) return;
      const q = query(
        collection(firestoreInstance, path),
        orderBy(orderByField, orderDirection),
      );
      dataFetchPromises.push(getDocs(q).catch(() => null));
      unsubscribers.push(
        onSnapshot(
          q,
          (querySnapshot) => {
            const fetchedItems: T[] = [];
            querySnapshot.forEach((documentSnapshot) => {
              const data = documentSnapshot.data();
              fetchedItems.push({
                id: documentSnapshot.id,
                ...data,
                createdAt:
                  data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt:
                  data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
              } as T);
            });
            setter(fetchedItems);
          },
          (error) => {
            console.error(`Error fetching from ${path}:`, error);
            setter([]);
          },
        ),
      );
    };

    setupListener<Investment>(
      collectionsPaths.investments,
      setInvestments,
      "purchaseDate",
      "asc",
    );
    setupListener<Transaction>(
      collectionsPaths.transactions,
      setTransactions,
      "date",
    );
    setupListener<IncomeRecord>(
      collectionsPaths.incomeRecords,
      setIncomeRecords,
      "date",
    );
    setupListener<ExpenseRecord>(
      collectionsPaths.expenseRecords,
      setExpenseRecords,
      "date",
    );
    setupListener<FixedEstimateRecord>(
      collectionsPaths.fixedEstimates,
      setFixedEstimates,
      "type",
    );

    const qAnalyses = query(
      collection(firestoreInstance, collectionsPaths.currencyAnalyses),
    );
    dataFetchPromises.push(getDocs(qAnalyses).catch(() => null));
    unsubscribers.push(
      onSnapshot(
        qAnalyses,
        (querySnapshot) => {
          const fetchedAnalyses: Record<
            string,
            CurrencyFluctuationAnalysisResult
          > = {};
          querySnapshot.forEach((doc) => {
            fetchedAnalyses[doc.id] =
              doc.data() as CurrencyFluctuationAnalysisResult;
          });
          setCurrencyAnalyses(fetchedAnalyses);
        },
        (error) => {
          console.error("Error fetching currency analyses:", error);
          setCurrencyAnalyses({});
        },
      ),
    );

    const summaryDocRef = getDashboardSummaryDocRef();
    if (summaryDocRef) {
      dataFetchPromises.push(
        getDoc(summaryDocRef)
          .then((docSnap) => {
            if (docSnap.exists()) {
              setDashboardSummary(docSnap.data() as DashboardSummary);
            } else {
              setDashboardSummary(defaultDashboardSummary);
              return setDoc(
                summaryDocRef,
                { ...defaultDashboardSummary },
                { merge: true },
              );
            }
          })
          .catch((error) => {
            console.error(
              "Error initial fetching/creating dashboard summary:",
              error,
            );
            setDashboardSummary(defaultDashboardSummary);
          }),
      );
      unsubscribers.push(
        onSnapshot(
          summaryDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setDashboardSummary(docSnap.data() as DashboardSummary);
            } else {
              setDashboardSummary(defaultDashboardSummary);
              setDoc(
                summaryDocRef,
                { ...defaultDashboardSummary },
                { merge: true },
              ).catch((err) =>
                console.error(
                  "Failed to re-create default summary doc on snapshot non-existence:",
                  err,
                ),
              );
            }
          },
          (error) => {
            console.error("Error listening to dashboard summary:", error);
            setDashboardSummary(defaultDashboardSummary);
          },
        ),
      );
    } else {
      setDashboardSummary(defaultDashboardSummary);
    }

    const appSettingsDocRef = getAppSettingsDocRef();
    if (appSettingsDocRef) {
      dataFetchPromises.push(
        getDoc(appSettingsDocRef)
          .then((docSnap) => {
            if (docSnap.exists()) {
              setAppSettings(docSnap.data() as AppSettings);
            } else {
              setAppSettings(defaultAppSettings);
              return setDoc(
                appSettingsDocRef,
                { ...defaultAppSettings },
                { merge: true },
              );
            }
          })
          .catch((error) => {
            console.error(
              "Error initial fetching/creating app settings:",
              error,
            );
            setAppSettings(defaultAppSettings);
          }),
      );
      unsubscribers.push(
        onSnapshot(
          appSettingsDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setAppSettings(docSnap.data() as AppSettings);
            } else {
              setAppSettings(defaultAppSettings);
              setDoc(
                appSettingsDocRef,
                { ...defaultAppSettings },
                { merge: true },
              ).catch((err) =>
                console.error(
                  "Failed to re-create default app settings doc on snapshot non-existence:",
                  err,
                ),
              );
            }
          },
          (error) => {
            console.error("Error listening to app settings:", error);
            setAppSettings(defaultAppSettings);
          },
        ),
      );
    } else {
      setAppSettings(defaultAppSettings);
    }

    Promise.all(dataFetchPromises)
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [
    userId,
    isAuthenticated,
    authIsLoading,
    getDashboardSummaryDocRef,
    getAppSettingsDocRef,
    firestoreInstance,
  ]);

  const addInvestment = useCallback(
    async (
      investmentData: Omit<Investment, "createdAt" | "id">,
      analysis?: CurrencyFluctuationAnalysisResult,
    ) => {
      if (!firestoreInstance || !isAuthenticated || !userId)
        throw new Error("User not authenticated or Firestore not available.");
      const investmentId = uuidv4();
      const investmentWithTimestamp = {
        ...investmentData,
        id: investmentId,
        userId,
        createdAt: serverTimestamp(),
      };
      await setDoc(
        doc(firestoreInstance, `users/${userId}/investments`, investmentId),
        investmentWithTimestamp,
      );

      const amountInvestedValue = Number(investmentData.amountInvested);
      if (!isNaN(amountInvestedValue) && amountInvestedValue !== 0) {
        await updateDashboardSummaryDoc({
          totalInvestedAcrossAllAssets: amountInvestedValue,
          totalCashBalance: -amountInvestedValue, // Decrease cash balance by investment amount
        });
      }
      if (analysis && investmentData.type === "Currencies")
        await setDoc(
          doc(
            firestoreInstance,
            `users/${userId}/currencyAnalyses`,
            investmentId,
          ),
          analysis,
        );
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const addIncomeRecord = useCallback(
    async (incomeData: Omit<IncomeRecord, "id" | "createdAt" | "userId">) => {
      if (!firestoreInstance || !isAuthenticated || !userId)
        throw new Error("User not authenticated or Firestore not available.");
      const incomeId = uuidv4();
      await setDoc(
        doc(firestoreInstance, `users/${userId}/incomeRecords`, incomeId),
        { ...incomeData, id: incomeId, userId, createdAt: serverTimestamp() },
      );
      const incomeAmount = Number(incomeData.amount);
      if (!isNaN(incomeAmount) && incomeAmount !== 0) {
        await updateDashboardSummaryDoc({ totalCashBalance: incomeAmount }); // Increase cash balance
      }
    },
    [userId, isAuthenticated, firestoreInstance, updateDashboardSummaryDoc],
  );

  const addExpenseRecord = useCallback(
    async (expenseData: Omit<ExpenseRecord, "id" | "createdAt" | "userId">) => {
      if (!firestoreInstance || !isAuthenticated || !userId)
        throw new Error("User not authenticated or Firestore not available.");
      const expenseId = uuidv4();
      await setDoc(
        doc(firestoreInstance, `users/${userId}/expenseRecords`, expenseId),
        { ...expenseData, id: expenseId, userId, createdAt: serverTimestamp() },
      );
      const expenseAmount = Number(expenseData.amount);
      if (!isNaN(expenseAmount) && expenseAmount !== 0) {
        await updateDashboardSummaryDoc({ totalCashBalance: -expenseAmount }); // Decrease cash balance
      }
    },
    [userId, isAuthenticated, firestoreInstance, updateDashboardSummaryDoc],
  );

  const deleteExpenseRecord = useCallback(
    async (expenseId: string) => {
      if (!firestoreInstance || !isAuthenticated || !userId)
        throw new Error("User not authenticated or Firestore not available.");
      const expenseDocRef = doc(
        firestoreInstance,
        `users/${userId}/expenseRecords`,
        expenseId,
      );
      const docSnap = await getDoc(expenseDocRef);
      if (docSnap.exists()) {
        const expenseData = docSnap.data() as ExpenseRecord;
        await deleteDoc(expenseDocRef);
        const expenseAmount = Number(expenseData.amount);
        if (!isNaN(expenseAmount) && expenseAmount !== 0) {
          await updateDashboardSummaryDoc({ totalCashBalance: expenseAmount }); // Increase cash balance (reverse expense)
        }
      }
    },
    [userId, isAuthenticated, firestoreInstance, updateDashboardSummaryDoc],
  );

  const updateExpenseRecord = useCallback(
    async (expenseId: string, updatedFields: Partial<ExpenseRecord>) => {
      if (!firestoreInstance || !isAuthenticated || !userId)
        throw new Error("User not authenticated or Firestore not available.");
      const expenseDocRef = doc(
        firestoreInstance,
        `users/${userId}/expenseRecords`,
        expenseId,
      );
      const docSnap = await getDoc(expenseDocRef);
      if (docSnap.exists()) {
        const oldExpenseData = docSnap.data() as ExpenseRecord;
        
        // Create a clean update object
        const updateData: any = {
          ...updatedFields,
          updatedAt: serverTimestamp()
        };
        
        // Remove numberOfInstallments if it's undefined
        if (updateData.numberOfInstallments === undefined) {
          delete updateData.numberOfInstallments;
        }
        
        await setDoc(
          expenseDocRef,
          updateData,
          { merge: true },
        );

        const oldAmount = Number(oldExpenseData.amount);
        const newAmount =
          updatedFields.amount !== undefined
            ? Number(updatedFields.amount)
            : oldAmount;
        const amountDelta = newAmount - oldAmount; // If new is higher, delta is positive (more expense)
        if (!isNaN(amountDelta) && amountDelta !== 0) {
          await updateDashboardSummaryDoc({ totalCashBalance: -amountDelta }); // Decrease cash balance if expense increased, increase if decreased
        }
      }
    },
    [userId, isAuthenticated, firestoreInstance, updateDashboardSummaryDoc],
  );

  const addFixedEstimate = useCallback(
    async (
      estimateData: Omit<
        FixedEstimateRecord,
        "id" | "createdAt" | "userId" | "updatedAt"
      >,
    ) => {
      if (!firestoreInstance || !isAuthenticated || !userId)
        throw new Error("User not authenticated or Firestore not available.");
      const estimateId = uuidv4();
      const finalEstimateData: FixedEstimateRecord = {
        ...estimateData,
        id: estimateId,
        userId,
        createdAt: serverTimestamp() as unknown as string,
        updatedAt: serverTimestamp() as unknown as string,
      };
      await setDoc(
        doc(firestoreInstance, `users/${userId}/fixedEstimates`, estimateId),
        finalEstimateData,
      );
    },
    [userId, isAuthenticated, firestoreInstance],
  );

  const getInvestmentsByType = useCallback(
    (type: string) => investments.filter((inv) => inv.type === type),
    [investments],
  );

  const recordSellStockTransaction = useCallback(
    async (
      listedsecurityId: string,
      tickerSymbol: string,
      numberOfSharesToSell: number,
      sellPricePerShare: number,
      sellDate: string,
      fees: number,
    ) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const userStockInvestments = investments.filter(
        (inv) => inv.type === "Stocks" && inv.tickerSymbol === tickerSymbol,
      ) as StockInvestment[];
      userStockInvestments.sort(
        (a, b) =>
          new Date(a.purchaseDate || 0).getTime() -
          new Date(b.purchaseDate || 0).getTime(),
      );
      const totalOwnedShares = userStockInvestments.reduce(
        (sum, inv) => sum + (inv.numberOfShares || 0),
        0,
      );
      if (numberOfSharesToSell > totalOwnedShares)
        throw new Error("Not enough shares to sell.");

      let costOfSharesBeingSold = 0;
      let sharesRemainingToAccountFor = numberOfSharesToSell;
      for (const lot of userStockInvestments) {
        if (sharesRemainingToAccountFor <= 0) break;
        const sharesFromThisLot = Math.min(
          lot.numberOfShares || 0,
          sharesRemainingToAccountFor,
        );
        costOfSharesBeingSold +=
          sharesFromThisLot * (lot.purchasePricePerShare || 0);
        sharesRemainingToAccountFor -= sharesFromThisLot;
      }

      const totalProceeds = numberOfSharesToSell * sellPricePerShare - fees;
      const profitOrLoss = totalProceeds - costOfSharesBeingSold;

      const transactionId = uuidv4();
      const newTransaction: Omit<Transaction, "createdAt"> & {
        createdAt: FieldValue;
      } = {
        id: transactionId,
        securityId: listedsecurityId,
        tickerSymbol,
        type: "sell",
        date: sellDate,
        numberOfShares: numberOfSharesToSell,
        pricePerShare: sellPricePerShare,
        fees,
        totalAmount: totalProceeds,
        profitOrLoss,
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(firestoreInstance);
      batch.set(
        doc(firestoreInstance, `users/${userId}/transactions`, transactionId),
        newTransaction,
      );

      let sharesToDeduct = numberOfSharesToSell;
      let costBasisReductionFromPortfolio = 0;

      for (const investment of userStockInvestments) {
        if (sharesToDeduct <= 0) break;
        const investmentDocRef = doc(
          firestoreInstance,
          `users/${userId}/investments`,
          investment.id,
        );
        const sharesInThisLot = investment.numberOfShares || 0;
        const costOfThisLot = investment.amountInvested;

        if (sharesInThisLot >= sharesToDeduct) {
          const newShareCount = sharesInThisLot - sharesToDeduct;
          const proportionSoldFromLot =
            costOfThisLot > 0 && sharesInThisLot > 0
              ? sharesToDeduct / sharesInThisLot
              : 0;
          const costBasisOfSoldPortionFromLot =
            costOfThisLot * proportionSoldFromLot;
          costBasisReductionFromPortfolio += costBasisOfSoldPortionFromLot;

          if (newShareCount === 0) batch.delete(investmentDocRef);
          else
            batch.update(investmentDocRef, {
              numberOfShares: newShareCount,
              amountInvested: costOfThisLot - costBasisOfSoldPortionFromLot,
            });
          sharesToDeduct = 0;
        } else {
          costBasisReductionFromPortfolio += costOfThisLot;
          batch.delete(investmentDocRef);
          sharesToDeduct -= sharesInThisLot;
        }
      }

      await batch.commit();

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (!isNaN(profitOrLoss)) summaryUpdates.totalRealizedPnL = profitOrLoss;
      if (
        !isNaN(costBasisReductionFromPortfolio) &&
        costBasisReductionFromPortfolio !== 0
      )
        summaryUpdates.totalInvestedAcrossAllAssets =
          -costBasisReductionFromPortfolio;
      if (!isNaN(totalProceeds) && totalProceeds !== 0)
        summaryUpdates.totalCashBalance = totalProceeds; // Increase cash by proceeds

      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);

      if (profitOrLoss > 0) {
        const incomeData: Omit<IncomeRecord, "id" | "createdAt" | "userId"> = {
          type: "Profit Share",
          source: `Sale of ${tickerSymbol}`,
          amount: profitOrLoss,
          date: sellDate,
          description: `Profit from selling ${numberOfSharesToSell} units of ${tickerSymbol}.`,
        };
        // Note: addIncomeRecord will also update totalCashBalance, so profitOrLoss is effectively added twice if not careful.
        // Here, we've already accounted for totalProceeds. If income tracking is separate, this is fine.
        // If P/L from sales is not considered direct income for cash flow but rather reinvested or tracked differently,
        // then adding it to IncomeRecords might be optional or handled with a specific type.
        // For now, assuming P/L from sales does contribute to overall income and thus cash.
        // The `addIncomeRecord` already handles its own cash balance update.
        // To avoid double counting with `totalProceeds`, we might consider if `addIncomeRecord` should only be for non-sale income
        // OR ensure `totalProceeds` is net of cost basis if `profitOrLoss` is added as income.
        // Current logic: `totalProceeds` is gross. `profitOrLoss` is net. `addIncomeRecord` adds `profitOrLoss`.
        // So, Cash Balance increases by `totalProceeds` (from sale) AND by `profitOrLoss` (from income record). This is likely incorrect.
        // Correct approach: Cash balance should increase by `totalProceeds`. `totalRealizedPnL` increases by `profitOrLoss`.
        // The separate `addIncomeRecord` for P/L might be redundant if sale proceeds directly impact cash.
        // Let's stick to the primary cash impact: the proceeds. The P/L is for performance tracking.
        // So, we won't call `addIncomeRecord` here to avoid double-counting cash impact.
      }
    },
    [
      userId,
      isAuthenticated,
      investments,
      updateDashboardSummaryDoc,
      firestoreInstance,
    ],
  );

  const correctedUpdateStockInvestment = useCallback(
    async (
      investmentId: string,
      dataToUpdate: Pick<
        StockInvestment,
        | "numberOfShares"
        | "purchasePricePerShare"
        | "purchaseDate"
        | "purchaseFees"
      >,
      oldAmountInvested: number,
    ) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const investmentDocRef = doc(
        firestoreInstance,
        `users/${userId}/investments`,
        investmentId,
      );
      const newNumberOfShares = dataToUpdate.numberOfShares ?? 0;
      const newPurchasePricePerShare = dataToUpdate.purchasePricePerShare ?? 0;
      const newPurchaseFees = dataToUpdate.purchaseFees ?? 0;
      const newCalculatedAmountInvested =
        newNumberOfShares * newPurchasePricePerShare + newPurchaseFees;
      const updatedInvestmentData = {
        ...dataToUpdate,
        amountInvested: newCalculatedAmountInvested,
        updatedAt: serverTimestamp(),
      };
      await setDoc(investmentDocRef, updatedInvestmentData, { merge: true });

      const amountInvestedDelta =
        newCalculatedAmountInvested - oldAmountInvested;
      const cashBalanceDelta = -amountInvestedDelta; // If investment cost increases, cash decreases

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (!isNaN(amountInvestedDelta) && amountInvestedDelta !== 0)
        summaryUpdates.totalInvestedAcrossAllAssets = amountInvestedDelta;
      if (!isNaN(cashBalanceDelta) && cashBalanceDelta !== 0)
        summaryUpdates.totalCashBalance = cashBalanceDelta;

      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const deleteSellTransaction = useCallback(
    async (transactionToDelete: Transaction) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      if (transactionToDelete.type !== "sell")
        throw new Error("Can only delete 'sell' transactions.");

      const transactionDocRef = doc(
        firestoreInstance,
        `users/${userId}/transactions`,
        transactionToDelete.id,
      );
      await deleteDoc(transactionDocRef);

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (
        transactionToDelete.profitOrLoss !== undefined &&
        !isNaN(transactionToDelete.profitOrLoss)
      ) {
        summaryUpdates.totalRealizedPnL = -transactionToDelete.profitOrLoss;
      }
      if (
        !isNaN(transactionToDelete.totalAmount) &&
        transactionToDelete.totalAmount !== 0
      ) {
        summaryUpdates.totalCashBalance = -transactionToDelete.totalAmount; // Reverse cash inflow from sale
      }
      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const removeStockInvestmentsBySymbol = useCallback(
    async (tickerSymbol: string) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const q = query(
        collection(firestoreInstance, `users/${userId}/investments`),
        where("type", "==", "Stocks"),
        where("tickerSymbol", "==", tickerSymbol),
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(firestoreInstance);
      let totalAmountInvestedRemoved = 0;
      querySnapshot.forEach((docSnapshot) => {
        const investmentData = docSnapshot.data() as StockInvestment;
        totalAmountInvestedRemoved += investmentData.amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (
        !isNaN(totalAmountInvestedRemoved) &&
        totalAmountInvestedRemoved !== 0
      ) {
        summaryUpdates.totalInvestedAcrossAllAssets =
          -totalAmountInvestedRemoved;
        summaryUpdates.totalCashBalance = totalAmountInvestedRemoved; // Cash increases as investment is "returned"
      }
      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const removeGoldInvestments = useCallback(
    async (identifier: string, itemType: "physical" | "fund") => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      let totalAmountInvestedRemoved = 0;
      const investmentsCollectionPath = `users/${userId}/investments`;
      const batch = writeBatch(firestoreInstance);
      let q;

      if (itemType === "physical") {
        const goldType = identifier as GoldType;
        q = query(
          collection(firestoreInstance, investmentsCollectionPath),
          where("type", "==", "Gold"),
          where("goldType", "==", goldType),
        );
      } else {
        // itemType === 'fund'
        q = query(
          collection(firestoreInstance, investmentsCollectionPath),
          where("type", "==", "Stocks"),
          where("tickerSymbol", "==", identifier),
        );
      }

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnapshot) => {
        totalAmountInvestedRemoved +=
          (docSnapshot.data() as Investment).amountInvested || 0;
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (
        !isNaN(totalAmountInvestedRemoved) &&
        totalAmountInvestedRemoved !== 0
      ) {
        summaryUpdates.totalInvestedAcrossAllAssets =
          -totalAmountInvestedRemoved;
        summaryUpdates.totalCashBalance = totalAmountInvestedRemoved;
      }
      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const removeDirectDebtInvestment = useCallback(
    async (investmentId: string) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const investmentDocRef = doc(
        firestoreInstance,
        `users/${userId}/investments`,
        investmentId,
      );
      const docSnap = await getDoc(investmentDocRef);
      if (!docSnap.exists()) return;
      const investmentData = docSnap.data() as Investment; // Assuming common fields are enough
      if (investmentData.type !== "Debt Instruments") return;

      const amountInvested = investmentData.amountInvested;
      await deleteDoc(investmentDocRef);

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (!isNaN(amountInvested) && amountInvested !== 0) {
        summaryUpdates.totalInvestedAcrossAllAssets = -amountInvested;
        summaryUpdates.totalCashBalance = amountInvested;
      }
      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const removeRealEstateInvestment = useCallback(
    async (investmentId: string) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const investmentDocRef = doc(
        firestoreInstance,
        `users/${userId}/investments`,
        investmentId,
      );
      const docSnap = await getDoc(investmentDocRef);
      if (!docSnap.exists()) return;
      const investmentData = docSnap.data() as Investment;
      if (investmentData.type !== "Real Estate") return;
      const amountInvested = investmentData.amountInvested;
      await deleteDoc(investmentDocRef);

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (!isNaN(amountInvested) && amountInvested !== 0) {
        summaryUpdates.totalInvestedAcrossAllAssets = -amountInvested;
        summaryUpdates.totalCashBalance = amountInvested;
      }
      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const updateRealEstateInvestment = useCallback(
    async (
      investmentId: string,
      dataToUpdate: Partial<RealEstateInvestment>,
    ) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const investmentDocRef = doc(
        firestoreInstance,
        `users/${userId}/investments`,
        investmentId,
      );
      const docSnap = await getDoc(investmentDocRef);
      if (!docSnap.exists()) throw new Error("Investment not found.");
      const oldData = docSnap.data() as RealEstateInvestment;
      if (oldData.type !== "Real Estate")
        throw new Error("Not a real estate investment.");

      const oldAmountInvested = oldData.amountInvested || 0;
      // `dataToUpdate.amountInvested` could be string from form, so coerce to number
      const newAmountInvested =
        typeof dataToUpdate.amountInvested === "string"
          ? parseFloat(dataToUpdate.amountInvested)
          : typeof dataToUpdate.amountInvested === "number"
            ? dataToUpdate.amountInvested
            : oldAmountInvested;

      if (isNaN(newAmountInvested)) {
        throw new Error("Invalid amountInvested provided for update.");
      }

      const updatedInvestmentData = {
        ...dataToUpdate,
        amountInvested: newAmountInvested,
        updatedAt: serverTimestamp(),
      };
      await setDoc(investmentDocRef, updatedInvestmentData, { merge: true });

      const amountInvestedDelta = newAmountInvested - oldAmountInvested;
      const cashBalanceDelta = -amountInvestedDelta; // If investment cost increases, cash decreases

      const summaryUpdates: Partial<DashboardSummary> = {};
      if (!isNaN(amountInvestedDelta) && amountInvestedDelta !== 0)
        summaryUpdates.totalInvestedAcrossAllAssets = amountInvestedDelta;
      if (!isNaN(cashBalanceDelta) && cashBalanceDelta !== 0)
        summaryUpdates.totalCashBalance = cashBalanceDelta;

      if (Object.keys(summaryUpdates).length > 0)
        await updateDashboardSummaryDoc(summaryUpdates);
    },
    [userId, isAuthenticated, updateDashboardSummaryDoc, firestoreInstance],
  );

  const recalculateDashboardSummary = useCallback(async () => {
    if (!userId || !firestoreInstance) return;

    let calculatedTotalInvested = 0;
    let calculatedTotalRealizedPnL = 0;
    let calculatedTotalCashBalance = 0;

    investments.forEach((inv) => {
      calculatedTotalInvested += inv.amountInvested || 0;
      calculatedTotalCashBalance -= inv.amountInvested || 0; // Investment cost is an outflow
    });

    transactions.forEach((txn) => {
      if (txn.type === "sell") {
        calculatedTotalRealizedPnL += txn.profitOrLoss || 0;
        calculatedTotalCashBalance += txn.totalAmount || 0; // Sale proceeds are an inflow
      }
    });

    incomeRecords.forEach((inc) => {
      calculatedTotalCashBalance += inc.amount || 0; // Income is an inflow
    });

    expenseRecords.forEach((exp) => {
      calculatedTotalCashBalance -= exp.amount || 0; // Expense is an outflow
    });

    const summaryDocRef = getDashboardSummaryDocRef();
    if (summaryDocRef) {
      await setDoc(
        summaryDocRef,
        {
          totalInvestedAcrossAllAssets: calculatedTotalInvested,
          totalRealizedPnL: calculatedTotalRealizedPnL,
          totalCashBalance: calculatedTotalCashBalance,
        },
        { merge: true },
      ); // Use merge:true to not overwrite other potential fields accidentally
    }
  }, [
    userId,
    firestoreInstance,
    investments,
    transactions,
    incomeRecords,
    expenseRecords,
    getDashboardSummaryDocRef,
  ]);

  const updateAppSettings = useCallback(
    async (settings: Partial<AppSettings>) => {
      if (!userId || !firestoreInstance) {
        console.error(
          "Cannot update app settings: User not authenticated or Firestore not available.",
        );
        throw new Error("User not authenticated or Firestore not available.");
      }
      const settingsDocRef = getAppSettingsDocRef();
      if (!settingsDocRef) {
        console.error(
          "Cannot update app settings: Settings document reference is null.",
        );
        throw new Error("Settings document reference is null.");
      }
      try {
        await setDoc(settingsDocRef, settings, { merge: true });
      } catch (error) {
        console.error("Error updating app settings in Firestore:", error);
        throw error;
      }
    },
    [userId, firestoreInstance, getAppSettingsDocRef],
  );

  const deleteIncomeRecord = useCallback(
    async (incomeId: string) => {
      if (!firestoreInstance || !userId) {
        throw new Error("Firestore instance or user ID is not initialized");
      }
      try {
        await deleteDoc(
          doc(firestoreInstance, `users/${userId}/incomeRecords/${incomeId}`),
        );
      } catch (error) {
        console.error("Error deleting income record:", error);
      }
    },
    [userId, firestoreInstance],
  );

  const deleteFixedEstimate = useCallback(
    async (id: string) => {
      if (!firestoreInstance || !isAuthenticated || !userId) {
        throw new Error("User not authenticated or Firestore not available.");
      }
      const estimateDocRef = doc(
        firestoreInstance,
        `users/${userId}/fixedEstimates`,
        id,
      );
      await deleteDoc(estimateDocRef);

      const estimate = fixedEstimates.find((est) => est.id === id);
      if (estimate) {
        const summaryUpdates: Partial<DashboardSummary> = {
          totalInvestedAcrossAllAssets: -estimate.amount,
          totalCashBalance: -estimate.amount,
        };
        await updateDashboardSummaryDoc(summaryUpdates);
      }
    },
    [
      userId,
      isAuthenticated,
      firestoreInstance,
      fixedEstimates,
      updateDashboardSummaryDoc,
    ],
  );

  return (
    <InvestmentContext.Provider
      value={{
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
        removeRealEstateInvestment,
        updateRealEstateInvestment,
        dashboardSummary,
        incomeRecords,
        addIncomeRecord,
        deleteIncomeRecord,
        updateIncomeRecord,
        expenseRecords,
        addExpenseRecord,
        deleteExpenseRecord,
        updateExpenseRecord,
        fixedEstimates,
        addFixedEstimate,
        deleteFixedEstimate,
        recalculateDashboardSummary,
        appSettings,
        updateAppSettings,
      }}
    >
      {children}
    </InvestmentContext.Provider>
  );
};
