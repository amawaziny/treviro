import {
  Investment,
  DebtInstrumentInvestment,
  Transaction,
  IncomeRecord,
  ExpenseRecord,
  DashboardSummary,
} from "@/lib/types";
import { db as firestoreInstance } from "@/lib/firebase";
import { doc, getDoc, runTransaction } from "firebase/firestore";
/**
 * TODO:
 * 1. TransactionService collection should consume events from FinancialRecordsService
 * 2. TransactionService collection should consume events from InvestmentService
 * 3. DashboardService should consume events from TransactionService
 * 4. Dashboard recalculateDashboardSummary should recalculate dashboard summary on every transaction
 * 5. Constants class for collection names
 * 6. Organize types and investment-types
 */
export class DashboardService {
  private userId: string;
  private static readonly DASHBOARD_PATH = "dashboard_aggregates/summary";

  constructor(userId: string) {
    if (!userId) {
      throw new Error("User ID is required for DashboardService");
    }
    this.userId = userId;
  }

  private getDashboardDocRef() {
    if (!this.userId || !firestoreInstance) return null;
    return doc(
      firestoreInstance,
      `users/${this.userId}/${DashboardService.DASHBOARD_PATH}`,
    );
  }

  /**
   * Updates the dashboard summary with the provided fields using a transaction
   * @param updates Partial DashboardSummary with fields to update
   */
  async updateDashboardSummary(
    updates: Partial<DashboardSummary>,
  ): Promise<void> {
    const dashboardRef = this.getDashboardDocRef();
    if (!dashboardRef || !firestoreInstance) return;

    try {
      await runTransaction(firestoreInstance, async (transaction) => {
        const summaryDoc = await transaction.get(dashboardRef);

        // Initialize with default values if document doesn't exist
        const currentData: DashboardSummary = summaryDoc.exists()
          ? (summaryDoc.data() as DashboardSummary)
          : {
              totalInvestedAcrossAllAssets: 0,
              totalRealizedPnL: 0,
              totalCashBalance: 0,
              totalMaturedDebt: 0,
              updatedAt: new Date().toISOString(),
            };

        // Merge updates with current data
        const newData = {
          ...currentData,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // Update document
        transaction.set(dashboardRef, newData, { merge: true });
      });
    } catch (error) {
      console.error("Error in updateDashboardSummary transaction:", error);
      throw error;
    }
  }

  async getDashboardSummary(): Promise<DashboardSummary | null> {
    const dashboardRef = this.getDashboardDocRef();
    if (!dashboardRef) return null;

    try {
      const dashboardSnap = await getDoc(dashboardRef);
      return dashboardSnap.exists()
        ? (dashboardSnap.data() as DashboardSummary)
        : null;
    } catch (error) {
      console.error("Error getting dashboard summary:", error);
      throw error;
    }
  }
  /**
   * Calculates and updates the dashboard summary based on investments, transactions, and financial records
   * @param investments Array of all investments
   * @param transactions Array of all transactions
   * @param incomeRecords Array of all income records
   * @param expenseRecords Array of all expense records
   * @returns Promise that resolves with the updated DashboardSummary
   */
  async recalculateDashboardSummary(
    investments: Investment[],
    transactions: Transaction[],
    incomeRecords: IncomeRecord[],
    expenseRecords: ExpenseRecord[],
  ): Promise<DashboardSummary> {
    let calculatedTotalInvested = 0;
    let calculatedTotalRealizedPnL = 0;
    let calculatedTotalCashBalance = 0;
    let totalMaturedDebt = 0;

    // Calculate matured debt
    investments.forEach((inv) => {
      const debtInv = inv as DebtInstrumentInvestment;
      if (inv.type === "Debt Instruments" && debtInv.isMatured) {
        totalMaturedDebt += debtInv.amountInvested || 0;
      }
    });

    // Calculate other investment values
    investments.forEach((inv) => {
      const debtInv = inv as DebtInstrumentInvestment;
      if (!(inv.type === "Debt Instruments" && debtInv.isMatured)) {
        calculatedTotalInvested += inv.amountInvested || 0;
        calculatedTotalCashBalance -= inv.amountInvested || 0; // Investment cost is an outflow
      }
    });

    // Add matured debt to cash balance
    calculatedTotalCashBalance += totalMaturedDebt;

    // Process transactions
    transactions.forEach((txn) => {
      if (txn.type === "sell") {
        calculatedTotalRealizedPnL += txn.profitOrLoss || 0;
        calculatedTotalCashBalance += txn.totalAmount || 0; // Sale proceeds are an inflow
      }
    });

    // Process income records
    incomeRecords.forEach((inc) => {
      calculatedTotalCashBalance += inc.amount || 0; // Income is an inflow
    });

    // Process expense records
    expenseRecords.forEach((exp) => {
      calculatedTotalCashBalance -= exp.amount || 0; // Expense is an outflow
    });

    const summary: DashboardSummary = {
      totalInvestedAcrossAllAssets: calculatedTotalInvested,
      totalRealizedPnL: calculatedTotalRealizedPnL,
      totalCashBalance: calculatedTotalCashBalance,
      totalMaturedDebt,
      updatedAt: new Date().toISOString(),
    };

    // Update the dashboard in Firebase
    await this.updateDashboardSummary(summary);

    return summary;
  }
}
