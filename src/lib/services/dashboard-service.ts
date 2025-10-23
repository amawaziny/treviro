import { IncomeRecord, ExpenseRecord, DashboardSummary } from "@/lib/types";
import { db as firestoreInstance } from "@/lib/firebase";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { Investment, Transaction } from "@/lib/investment-types";
/**
 * TODO:
 * 1. DashboardService should consume events from TransactionService
 * 2. Dashboard recalculateDashboardSummary should recalculate dashboard summary on every transaction
 * 3. Constants class for collection names
 * 4. Organize types and investment-types
 * 5. FixedEstimates & MaturedDebt should have scheduler or a way to calculate them on specific dates
 */
const DASHBOARD_PATH = "dashboard_aggregates/summary";
export class DashboardService {
  private userId: string;

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
      `users/${this.userId}/${DASHBOARD_PATH}`,
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
   * TODO:
   * 1. totalCashBalance = (sum of all INCOME and DIVIDEND and INTEREST and SELL and MATURED_DEBT - sum of all EXPENSE and PAYMENT and BUY) from transactions collection
   * 2. totalInvestedAcrossAllAssets = sum of all totalInvested amount from investment collection
   * 3. totalPortfolioValue = totalCashBalance + totalInvestedAcrossAllAssets
   * 4. totalRealizedPnL = sum of all profitOrLoss from transactions collection
   * Calculates and updates the dashboard summary based on transactions
   * @param transactions Array of all transactions to process
   * @returns Promise that resolves with the updated DashboardSummary
   */
  async recalculateDashboardSummary(
    transactions: Transaction[],
  ): Promise<DashboardSummary> {
    // Initialize summary values
    let totalInvested = 0;
    let totalRealizedPnL = 0;
    let totalCashBalance = 0;

    // Group transactions by source (investment)
    const transactionsBySource = transactions.reduce<
      Record<string, Transaction[]>
    >((acc, txn) => {
      if (txn.sourceId) {
        if (!acc[txn.sourceId]) {
          acc[txn.sourceId] = [];
        }
        acc[txn.sourceId].push(txn);
      }
      return acc;
    }, {});

    // Process transactions by source
    Object.entries(transactionsBySource).forEach(
      ([sourceId, sourceTransactions]) => {
        // Sort transactions by date to process them in chronological order
        const sortedTransactions = [...sourceTransactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // Process each transaction for this source
        for (const txn of sortedTransactions) {
          const amount = txn.amount || 0;
          const shares = txn.quantity || 0;

          switch (txn.type) {
            case "BUY":
              totalInvested += amount;
              break;

            case "SELL":
              totalInvested -= amount;
              totalRealizedPnL += amount;
              totalCashBalance += amount;
              break;

            case "DIVIDEND":
            case "INTEREST":
            case "INCOME":
              totalCashBalance += amount;
              break;

            case "EXPENSE":
              totalCashBalance -= amount;
              break;

            case "PAYMENT":
              // Track payments as part of investment cost
              totalInvested += amount;
              break;

            case "MATURED_DEBT":
              totalCashBalance += amount;
              break;
          }
        }
      },
    );

    const summary: DashboardSummary = {
      totalInvestedAcrossAllAssets: totalInvested,
      totalRealizedPnL: totalRealizedPnL,
      totalCashBalance: totalCashBalance,
      updatedAt: new Date().toISOString(),
    };

    // Update the dashboard in Firebase
    await this.updateDashboardSummary(summary);

    return summary;
  }
}
