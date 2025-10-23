import { IncomeRecord, ExpenseRecord, DashboardSummary } from "@/lib/types";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { Investment, Transaction } from "@/lib/investment-types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InvestmentService } from "./investment-service";
import { TransactionService } from "./transaction-service";

/**
 * TODO:
 * 1. DashboardService should consume events from TransactionService
 * 2. Constants class for collection names
 * 3. Organize types and investment-types
 * 4. FixedEstimates we can implement confirmation then user confirm it
 * 5. MaturedDebt should have scheduler or a way to calculate them on specific dates
 * 6. Check getDocRef we pass ids
 * 7. check fees in sell in transaction profitOrLoss
 */
const DASHBOARD_PATH = "dashboard_aggregates/summary";

export class DashboardService {
  private userId: string;
  private investmentService: InvestmentService;
  private transactionService: TransactionService;

  constructor(
    userId: string,
    investmentService: InvestmentService,
    transactionService: TransactionService,
  ) {
    this.userId = userId;
    if (!userId) {
      throw new Error("User ID is required for DashboardService");
    }
    this.investmentService = investmentService;
    this.transactionService = transactionService;
  }

  private getDashboardDocRef() {
    return doc(db, `users/${this.userId}/${DASHBOARD_PATH}`);
  }

  /**
   * Updates the dashboard summary with the provided fields using a transaction
   * @param updates Partial DashboardSummary with fields to update
   */
  async updateDashboardSummary(
    updates: Partial<DashboardSummary>,
  ): Promise<void> {
    const dashboardRef = this.getDashboardDocRef();
    if (!dashboardRef || !db) return;

    try {
      await runTransaction(db, async (transaction) => {
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
    try {
      const dashboardRef = this.getDashboardDocRef();
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
   * Calculates and updates the dashboard summary based on transactions and investments
   * @returns Promise that resolves with the updated DashboardSummary
   */
  async recalculateDashboardSummary(): Promise<DashboardSummary> {
    // 1. Calculate totalCashBalance
    const cashFlow = {
      income: 0,
      expense: 0,
    };

    // 4. Calculate totalRealizedPnL (sum of all profitOrLoss from transactions)
    let totalRealizedPnL = 0;
    let totalMaturedDebt = 0;

    const transactions = await this.transactionService.getTransactions();

    // Process all transactions
    for (const txn of transactions) {
      const amount = txn.amount || 0;

      // Add to cash flow calculations
      switch (txn.type) {
        case "INCOME":
        case "DIVIDEND":
        case "INTEREST":
          cashFlow.income += amount;
          break;

        //TODO: check fees in sell in transaction profitOrLoss
        case "SELL":
          cashFlow.income += amount - (txn.fees || 0);
          break;

        case "MATURED_DEBT":
          cashFlow.income += amount;
          totalMaturedDebt += amount;
          break;

        case "EXPENSE":
          cashFlow.expense += amount;
          break;

        case "PAYMENT":
        case "BUY":
          cashFlow.expense += amount;
          break;
      }

      // Sum up realized P&L from transactions
      if (typeof txn.profitOrLoss === "number") {
        totalRealizedPnL += txn.profitOrLoss;
      }
    }

    const totalCashBalance = cashFlow.income - cashFlow.expense;

    // 2. Get totalInvested from investments collection
    const investments = await this.investmentService.getInvestments();
    const totalInvestedAcrossAllAssets = investments.reduce(
      (sum, investment) => sum + (investment.totalInvested || 0),
      0,
    );

    // 3. Calculate total portfolio value
    const totalPortfolioValue = totalCashBalance + totalInvestedAcrossAllAssets;

    const summary: DashboardSummary = {
      totalInvestedAcrossAllAssets,
      totalRealizedPnL,
      totalCashBalance,
      totalMaturedDebt,
      totalPortfolioValue, // Add the new field to your DashboardSummary type if not already present
      updatedAt: new Date().toISOString(),
    };

    // Update the dashboard in Firebase
    await this.updateDashboardSummary(summary);

    return summary;
  }
}
