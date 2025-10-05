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
}

export const InvestmentContext = React.createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider = ({ children }: { children: ReactNode }) => {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const { user } = useAuth();
  const userId = user?.uid;

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

  // TODO: Wire up userId from auth
  const investmentService = userId ? new InvestmentService(userId) : null;

  // Utility to get dashboard summary doc ref
  const getDashboardSummaryDocRef = () => {
    if (!userId || !firestoreInstance) return null;
    return doc(firestoreInstance, `users/${userId}/dashboard_aggregates/summary`);
  };

  // Migrate updateDashboardSummaryDoc
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

  return (
    <InvestmentContext.Provider value={{ updateIncomeRecord, addInvestment }}>
      {children}
    </InvestmentContext.Provider>
  );
};
