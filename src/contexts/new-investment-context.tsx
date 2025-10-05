import React, { createContext, useState, useCallback, useEffect, ReactNode } from "react";
import type {
  Investment,
  SecurityInvestment,
  RealEstateInvestment,
  GoldInvestment,
  CurrencyInvestment,
  DebtInstrumentInvestment,
  Transaction,
} from "@/lib/investment-types";
import type {
  DashboardSummary,
  IncomeRecord,
  ExpenseRecord,
  FixedEstimateRecord,
  AppSettings,
} from "@/lib/types";
import { db as firestoreInstance } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
  where,
  runTransaction,
  increment,
  FieldValue,
  Timestamp,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { InvestmentService } from "@/lib/services/investment-service";

// Initial context type (empty, to be filled method by method)
export interface InvestmentContextType {
  updateIncomeRecord: (
    incomeId: string,
    updatedFields: Partial<IncomeRecord>
  ) => Promise<void>;
  addInvestment: (
    investmentData: Omit<Investment, "createdAt" | "id">,
  ) => Promise<void>;
  /**
   * Deletes an investment by ID, updates dashboard summary accordingly.
   * @param investmentId - The investment's ID
   */
  deleteInvestment: (investmentId: string) => Promise<void>;
}

export const InvestmentContext = React.createContext<InvestmentContextType | undefined>(undefined);

/**
 * InvestmentProvider context supplies investment-related actions and state to consumers.
 * Handles adding investments, updating dashboard summary, and updating income records.
 */
export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  /**
   * State for income records (used for local updates after Firestore writes)
   */
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);

  /**
   * Authenticated user info from useAuth hook
   */
  const { user } = useAuth();
  const userId = user?.uid;

  /**
   * Updates an income record in Firestore and local state.
   * @param incomeId - ID of the income record to update
   * @param updatedFields - Fields to update
   */
  const updateIncomeRecord = useCallback(
    async (incomeId: string, updatedFields: Partial<IncomeRecord>) => {
      if (!firestoreInstance || !userId) {
        throw new Error("Firestore instance or user ID is not initialized");
      }
      try {
        const incomeDocRef = doc(
          firestoreInstance,
          `users/${userId}/incomeRecords/${incomeId}`
        );
        await setDoc(incomeDocRef, updatedFields, { merge: true });
        setIncomeRecords((prev) =>
          prev.map((rec) =>
            rec.id === incomeId ? { ...rec, ...updatedFields } : rec
          )
        );
      } catch (error) {
        console.error("Error updating income record:", error);
        throw error;
      }
    },
    [userId]
  );

  /**
   * Service for all investment CRUD and business logic, scoped to current user.
   */
  const investmentService = userId ? new InvestmentService(userId) : null;

  /**
   * Utility to get a Firestore reference to the user's dashboard summary document.
   * Used for updating portfolio aggregates after investment changes.
   */
  const getDashboardSummaryDocRef = () => {
    if (!userId || !firestoreInstance) return null;
    return doc(firestoreInstance, `users/${userId}/dashboard_aggregates/summary`);
  };

  /**
   * Updates the dashboard summary aggregate document in Firestore.
   * Increments or sets fields based on the updates object.
   * Used after investment add, update, or delete.
   * @param updates - Partial<DashboardSummary> with fields to increment
   */
  const updateDashboardSummaryDoc = useCallback(
    async (updates: Partial<DashboardSummary>) => {
      if (!userId || !firestoreInstance) {
        console.warn("UpdateDashboardSummaryDoc: User ID or Firestore instance missing.");
        return;
      }
      const summaryDocRef = getDashboardSummaryDocRef();
      if (!summaryDocRef) return;
      try {
        await runTransaction(firestoreInstance, async (transaction) => {
          const summaryDoc = await transaction.get(summaryDocRef);
          const currentData: DashboardSummary = summaryDoc.exists()
            ? (summaryDoc.data() as DashboardSummary)
            : { totalInvestedAcrossAllAssets: 0, totalRealizedPnL: 0, totalCashBalance: 0 };

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
    },
    [userId, firestoreInstance]
  );

  /**
   * Adds a new investment of any supported type (stocks, gold, currencies, real estate, debt instruments).
   * Delegates business logic and Firestore writes to InvestmentService.
   * Updates the dashboard summary after successful creation.
   * @param investmentData - Investment data (without id/createdAt)
   */
  const addInvestment = useCallback(
    async (investmentData: Omit<Investment, "createdAt" | "id">) => {
      if (!investmentService)
        throw new Error("InvestmentService not initialized or user not authenticated");

      const result = await investmentService.createInvestment({
        ...investmentData,
        currency: (investmentData as any).currency,
        type: investmentData.type,
      } as any);

      // Update dashboard summary after adding an investment
      if (result && typeof result.totalInvested === "number" && result.totalInvested !== 0) {
        await updateDashboardSummaryDoc({
          totalInvestedAcrossAllAssets: result.totalInvested,
          totalCashBalance: -result.totalInvested,
        });
      }
    },
    [investmentService, updateDashboardSummaryDoc]
  );

  /**
   * Provider for the investment context. Supplies all investment actions and state.
   */
  /**
   * Deletes an investment by ID, updates dashboard summary accordingly.
   * @param investmentId - The investment's ID
   */
  const deleteInvestment = useCallback(
    async (investmentId: string) => {
      if (!investmentService) throw new Error("InvestmentService not initialized or user not authenticated");
      const investmentData = await investmentService.deleteInvestment(investmentId);
      const totalInvested = (investmentData as any)?.totalInvested;
      if (typeof totalInvested === "number" && totalInvested !== 0) {
        await updateDashboardSummaryDoc({
          totalInvestedAcrossAllAssets: -totalInvested,
          totalCashBalance: totalInvested,
        });
      }
    },
    [investmentService, updateDashboardSummaryDoc]
  );

  /**
   * Provider for the investment context. Supplies all investment actions and state.
   */
  return (
    <InvestmentContext.Provider value={{ updateIncomeRecord, addInvestment, deleteInvestment }}>
      {children}
    </InvestmentContext.Provider>
  );
};
