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
 * 6. investment after submit shows blank screen with fail to detect investment type
 * 7. we could list all installements during adding expenses of type credit card
 * 8. demo account with some transactions and investments to show the features of the app
 * 9. work offline support and caching for transactions and dashboard summary and securities
 * 10. cache stock and gold prices and currency exchange rates and update them if user click update or endofday
 * 11. sell for currecies
 * 12. sell for gold
 * 13. sell for realestate
 * 14. meter price for realestate
 * 15. remove price history collection no need any more with the integration of tradingview widget and we can get the price history from the widget and we will only keep the current price in the securities collection
 * 16. fix investment distribution
 * 17. fix investment breakdown by type in dashboard
 * 18. add noshares field for dividends and its default value is the current no of shares for the security
 * 20. sucess message after buyNew check translation
 * 21. navigation from stock details to my stock or securities explore
 * 22. cashflow icons based on transaction type
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

      firestoreUpdates.totalCashBalance = increment(amount);

      switch (transaction.type) {
        case "SELL": {
          const costBasis = averagePurchasePrice * Math.abs(quantity);
          firestoreUpdates.totalInvested = increment(costBasis);

          if (typeof profitOrLoss === "number" && profitOrLoss !== 0) {
            firestoreUpdates.totalRealizedPnL = increment(profitOrLoss);
          }

          break;
        }

        case "BUY":
        case "PAYMENT":
        case "MATURED_DEBT":
          firestoreUpdates.totalInvested = increment(amount);
          break;
      }

      // Apply updates to the dashboard atomically using Firestore increments when possible
      await setDoc(dashboardRef, firestoreUpdates, { merge: true });
    } catch (error) {
      console.error("Error in partialUpdateDashboardSummary:", error);
      throw error;
    }
  }

  /**
   * Calculates and updates the dashboard summary based on transactions
   * transaction collection/table is designed to sum amount in all transactions to get cashbalance
   * and sum all transaction types related to investment to get totalInvested
   * @returns Promise that resolves with the updated DashboardSummary
   */
  async recalculateDashboardSummary(): Promise<DashboardSummary> {
    let totalRealizedPnL = 0;
    let totalCashBalance = 0;
    let totalInvested = 0;

    const transactions = await this.transactionService.getTransactions();

    for (const txn of transactions) {
      const amount = txn.amount;

      totalCashBalance += amount;

      switch (txn.type) {
        case "SELL": {
          const costBasis = txn.averagePurchasePrice * Math.abs(txn.quantity);
          totalInvested += costBasis;

          if (typeof txn.profitOrLoss === "number") {
            totalRealizedPnL += txn.profitOrLoss;
          }
          break;
        }

        case "BUY":
        case "PAYMENT":
        case "MATURED_DEBT":
          totalInvested += amount;
          break;
      }
    }

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
