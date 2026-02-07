import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TransactionService } from "./transaction-service";
import { eventBus, TransactionEvent } from "@/lib/services/events";
import {
  DashboardSummary,
  defaultDashboardSummary,
  Transaction,
} from "@/lib/types";
import { DASHBOARD_COLLECTION_PATH } from "@/lib/constants";
import { formatPath } from "@/lib/utils";
import { dateConverter } from "@/lib/firestore-converters";

/**
 * TODO:
 * 1. revisit delete transaction and investment service should subscribe to transaction delete event (start with assuming deleting the last transaction)
 *  a. fire event transaction:deleted with the deleted transaction and investment service needs to listen to it and update the investment average purchase price with the "last transaction"
 *  b. fire event transaction:updated with the updated transaction and investment service needs to listen to it and update the investment average purchase price with the updated transaction
 * 2. Transaction page show calendar to select the month and year to show the expenses for that month and year
 * 3. Debt interest should effect the cash balance automatically (scheduler or same useEffect for handleMaturedDebtInstruments)
 * 4. we could disable some fields in edit mode of investment form
 * 5. refactor investment-form to be each form has its own submit button and logic
 * 6. we could list all installements during adding expenses of type credit card
 * 7. demo account with some transactions and investments to show the features of the app
 */

export class DashboardService {
  private userId: string;
  private transactionService: TransactionService;
  private unsubscribeCallbacks: (() => void)[] = [];

  constructor(userId: string, transactionService: TransactionService) {
    this.userId = userId;
    if (!userId) {
      throw new Error("User ID is required for DashboardService");
    }
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
    return this.getDashboardDocRefRaw().withConverter(dateConverter);
  }

  private getDashboardDocRefRaw() {
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
    const dashboardRef = this.getDashboardDocRefRaw();
    if (!dashboardRef) return;

    try {
      const amount = transaction.amount;
      const quantity = transaction.quantity;
      const averagePurchasePrice = transaction.averagePurchasePrice;
      const profitOrLoss = transaction.profitOrLoss || 0;

      // Build Firestore atomic updates using increment where possible. For reductions that
      // could go below zero we explicitly set to 0 when needed.
      const firestoreUpdates: Partial<Record<string, any>> = {
        updatedAt: Timestamp.fromDate(new Date()),
      };

      switch (transaction.type) {
        case "BUY":
        case "PAYMENT":
          firestoreUpdates.totalInvested = increment(amount);
          firestoreUpdates.totalCashBalance = increment(-amount);
          break;

        case "EXPENSE":
          firestoreUpdates.totalCashBalance = increment(amount);
          break;

        case "SELL": {
          const costBasis = averagePurchasePrice * Math.abs(quantity); // Use absolute value for quantity

          firestoreUpdates.totalInvested = increment(-costBasis);

          firestoreUpdates.totalCashBalance = increment(amount);

          if (typeof profitOrLoss === "number" && profitOrLoss !== 0) {
            firestoreUpdates.totalRealizedPnL = increment(profitOrLoss);
          }

          break;
        }

        case "DIVIDEND":
        case "INTEREST":
        case "INCOME":
          firestoreUpdates.totalCashBalance = increment(amount);
          break;

        case "MATURED_DEBT": {
          firestoreUpdates.totalInvested = increment(-amount);

          firestoreUpdates.totalCashBalance = increment(amount);
          break;
        }
      }

      // Apply updates to the dashboard atomically using Firestore increments when possible
      await setDoc(dashboardRef, firestoreUpdates, { merge: true });
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
    updates: DashboardSummary,
  ): Promise<DashboardSummary> {
    const dashboardRef = this.getDashboardDocRef();

    // Merge updates with current data
    const newData: DashboardSummary = {
      ...updates,
      updatedAt: new Date(),
    };

    await setDoc(dashboardRef, newData, { merge: true });
    return newData;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const dashboardDoc = await getDoc(this.getDashboardDocRef());
    return dashboardDoc.exists()
      ? (dashboardDoc.data() as DashboardSummary)
      : defaultDashboardSummary;
  }

  /**
   * Subscribes to real-time updates for the dashboard summary
   * @param callback - Callback function called with updated summary
   * @returns Unsubscribe function
   */
  subscribeToDashboardSummary(
    callback: (summary: DashboardSummary) => void,
  ): () => void {
    const dashboardRef = this.getDashboardDocRef();
    const unsubscribe = onSnapshot(dashboardRef, (doc) => {
      if (doc.exists()) {
        const summary = doc.data() as DashboardSummary;
        callback(summary);
      } else {
        callback(defaultDashboardSummary);
      }
    });
    return unsubscribe;
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
      const amount = txn.amount;

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
          totalInvested -= amount;
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

    const totalCashBalance = cashFlow.income + cashFlow.expense;

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
