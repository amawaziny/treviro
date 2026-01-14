import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InvestmentService } from "./investment-service";
import { TransactionService } from "./transaction-service";
import { eventBus, TransactionEvent } from "@/lib/services/events";
import {
  DashboardSummaries,
  DashboardSummary,
  defaultDashboardSummaries,
  defaultDashboardSummary,
  Transaction,
} from "@/lib/types";
import { DASHBOARD_COLLECTION_PATH } from "@/lib/constants";
import { formatPath } from "@/lib/utils";

/**
 * TODO:
 * 1. revisit delete transaction and investment service should subscribe to transaction delete event (start with assuming deleting the last transaction)
 *  a. fire event transaction:deleted with the deleted transaction and investment service needs to listen to it and update the investment average purchase price with the "last transaction"
 *  b. fire event transaction:updated with the updated transaction and investment service needs to listen to it and update the investment average purchase price with the updated transaction
 * 2. FixedEstimates we can implement confirmation then user confirm it
 * 3. Expense of type credit card should have isClosed property and it should be false until the user confirm the payment of last installment
 * 4. Expense of type credit card should be splited into expenses records on monthly basis
 * 5. Expenses and incomes page show calendar to select the month and year to show the expenses for that month and year
 * 6. Debt interest should effect the cash balance automatically (scheduler or same useEffect for handleMaturedDebtInstruments)
 * 7. always compose the description of the transaction and description of expense, income, fixed estimate
 * 8. we could disable some fields in edit mode of investment form
 * 9. refactor investment-form to be each form has its own submit button and logic
 * 10. check if we need context for investment, transaction, expense, income, fixed estimate
 * 11. remove useEffect from hooks and use React.use to call the functions
 */

export class DashboardService {
  private userId: string;
  private investmentService: InvestmentService;
  private transactionService: TransactionService;
  private unsubscribeCallbacks: (() => void)[] = [];

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

  setupEventSubscriptions() {
    const transactionCreatedUnsubscribe = eventBus.subscribe(
      "transaction:created",
      async (event: TransactionEvent) => {
        await this.partialUpdateDashboardSummary(event.transaction);
      },
    );
    this.unsubscribeCallbacks.push(transactionCreatedUnsubscribe);

    const transactionUpdatedUnsubscribe = eventBus.subscribe(
      "transaction:updated",
      async (event: TransactionEvent) => {
        await this.recalculateDashboardSummary();
      },
    );
    this.unsubscribeCallbacks.push(transactionUpdatedUnsubscribe);

    const transactionDeletedUnsubscribe = eventBus.subscribe(
      "transaction:deleted",
      async (event: TransactionEvent) => {
        await this.recalculateDashboardSummary();
      },
    );
    this.unsubscribeCallbacks.push(transactionDeletedUnsubscribe);
  }

  private getDashboardDocRef() {
    return doc(
      db,
      formatPath(DASHBOARD_COLLECTION_PATH, { userId: this.userId }),
    );
  }

  /**
   * Partially updates the dashboard summary based on a single transaction
   * @param transaction The transaction to process
   */
  async partialUpdateDashboardSummary(transaction: Transaction): Promise<void> {
    const dashboardRef = this.getDashboardDocRef();
    if (!dashboardRef) return;

    try {
      await runTransaction(db, async (firestoreTransaction) => {
        const dashboardDoc = await firestoreTransaction.get(dashboardRef);
        const currentData = dashboardDoc.exists()
          ? (dashboardDoc.data() as DashboardSummary)
          : defaultDashboardSummary;

        const updates: Partial<DashboardSummary> = {
          updatedAt: new Date(),
        };

        const amount = transaction.amount || 0;
        const quantity = transaction.quantity || 0;
        const averagePurchasePrice = transaction.averagePurchasePrice || 0;
        const profitOrLoss = transaction.profitOrLoss || 0;

        switch (transaction.type) {
          case "BUY":
          case "PAYMENT":
            updates.totalInvested = (currentData.totalInvested || 0) + amount;
            updates.totalCashBalance =
              (currentData.totalCashBalance || 0) - amount;
            break;

          case "EXPENSE":
            updates.totalCashBalance =
              (currentData.totalCashBalance || 0) - amount;
            break;

          case "SELL": {
            const costBasis = averagePurchasePrice * Math.abs(quantity); // Use absolute value for quantity

            updates.totalInvested = Math.max(
              0,
              (currentData.totalInvested || 0) - costBasis,
            );
            updates.totalCashBalance =
              (currentData.totalCashBalance || 0) + amount;

            updates.totalRealizedPnL =
              (currentData.totalRealizedPnL || 0) + profitOrLoss;
            break;
          }

          case "DIVIDEND":
          case "INTEREST":
          case "INCOME":
            updates.totalCashBalance =
              (currentData.totalCashBalance || 0) + amount;
            break;

          case "MATURED_DEBT": {
            updates.totalInvested = Math.max(
              0,
              (currentData.totalInvested || 0) - amount,
            );
            updates.totalCashBalance =
              (currentData.totalCashBalance || 0) + amount;
            break;
          }
        }

        // Apply updates to the dashboard
        firestoreTransaction.set(
          dashboardRef,
          { ...currentData, ...updates },
          { merge: true },
        );
      });
    } catch (error) {
      console.error("Error in partialUpdateDashboardSummary:", error);
      throw error;
    }
  }

  /**
   * Updates the dashboard summary with the provided fields using a transaction
   * @param updates Partial DashboardSummary with fields to update
   */
  async updateDashboardSummary(
    updates: Partial<DashboardSummary>,
  ): Promise<DashboardSummary> {
    const dashboardRef = this.getDashboardDocRef();
    const currentData = await this.getDashboardSummary();

    // Merge updates with current data
    const newData: DashboardSummary = {
      ...currentData,
      ...updates,
      updatedAt: new Date(),
    };

    await setDoc(dashboardRef, newData, { merge: true });
    return newData;
  }

  async getDashboardSummary(): Promise<DashboardSummaries> {
    const dashboardRef = this.getDashboardDocRef();
    const dashboardSnap = await getDoc(dashboardRef);

    if (dashboardSnap.exists()) {
      const data = dashboardSnap.data() as Partial<DashboardSummary>;
      const totalInvested =
        data.totalInvested ?? defaultDashboardSummaries.totalInvested;
      const totalCashBalance =
        data.totalCashBalance ?? defaultDashboardSummaries.totalCashBalance;
      const unrealizedPnL =
        await this.investmentService.calculateUnrealizedPnL();
      const marketTotalInvested =
        totalInvested + unrealizedPnL.portfolio.unrealizedPnL;
      const totalPortfolio = marketTotalInvested + totalCashBalance;
      return {
        totalInvested,
        totalRealizedPnL:
          data.totalRealizedPnL ?? defaultDashboardSummaries.totalRealizedPnL,
        totalCashBalance,
        totalUnrealizedPnL: unrealizedPnL.portfolio.unrealizedPnL,
        marketTotalInvested,
        totalPortfolio,
        updatedAt: data.updatedAt ?? defaultDashboardSummaries.updatedAt,
      };
    }

    return defaultDashboardSummaries;
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
    let totalInvested = 0;

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

        case "SELL":
          cashFlow.income += amount;
          totalInvested -= txn.sourceType === "Investment" ? amount : 0;
          break;

        case "MATURED_DEBT":
          cashFlow.income += amount;
          totalMaturedDebt += amount;
          totalInvested -= txn.sourceType === "Investment" ? amount : 0;
          break;

        case "EXPENSE":
          cashFlow.expense += amount;
          break;

        case "PAYMENT":
        case "BUY":
          cashFlow.expense += amount;
          totalInvested += txn.sourceType === "Investment" ? amount : 0;
          break;
      }

      // Sum up realized P&L from transactions
      if (typeof txn.profitOrLoss === "number") {
        totalRealizedPnL += txn.profitOrLoss;
      }
    }

    const totalCashBalance = cashFlow.income - cashFlow.expense;

    const summary: DashboardSummary = {
      totalInvested,
      totalRealizedPnL,
      totalCashBalance,
    };

    // Update the dashboard in Firebase
    return await this.updateDashboardSummary(summary);
  }

  cleanup() {
    // Unsubscribe from all event listeners
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
  }
}
