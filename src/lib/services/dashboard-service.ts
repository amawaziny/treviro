import { doc, getDoc, runTransaction, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InvestmentService } from "./investment-service";
import { TransactionService } from "./transaction-service";
import { eventBus, TransactionEvent } from "@/lib/services/events";
import { Investment, Transaction } from "@/lib/investment-types";
import { DashboardSummary } from "@/lib/types";
import { DASHBOARD_COLLECTION_PATH } from "@/lib/constants";
import { formatPath } from "@/lib/utils";

/**
 * TODO:
 * 1. Constants class for collection names
 * 2. Organize types and investment-types
 * 3. FixedEstimates we can implement confirmation then user confirm it
 * 4. MaturedDebt should have scheduler or a way to calculate them on specific dates
 * 5. Check getDocRef we pass ids
 * 6. check fees in sell in transaction profitOrLoss
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
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions() {
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
    return doc(db, formatPath(DASHBOARD_COLLECTION_PATH, { userId: this.userId }));
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
          : this.getDefaultDashboardSummary();

        const updates: Partial<DashboardSummary> = {
          updatedAt: new Date().toISOString(),
        };

        const amount = transaction.amount || 0;
        const quantity = transaction.quantity || 0;
        const averagePurchasePrice = transaction.averagePurchasePrice || 0;
        const profitOrLoss = transaction.profitOrLoss || 0;

        switch (transaction.type) {
          case 'BUY':
          case 'PAYMENT':
            updates.totalInvested = (currentData.totalInvested || 0) + amount;
            updates.totalCashBalance = (currentData.totalCashBalance || 0) - amount;
            break;

          case 'EXPENSE':
            updates.totalCashBalance = (currentData.totalCashBalance || 0) - amount;
            break;

          case 'SELL': {
            const costBasis = averagePurchasePrice * Math.abs(quantity); // Use absolute value for quantity
            const sellAmount = amount - (transaction.fees || 0);
            
            updates.totalInvested = Math.max(0, (currentData.totalInvested || 0) - costBasis);
            updates.totalCashBalance = (currentData.totalCashBalance || 0) + sellAmount;
            
            // Update realized P&L if there's a profit or loss
            if (profitOrLoss !== 0) {
              updates.totalRealizedPnL = (currentData.totalRealizedPnL || 0) + profitOrLoss;
            }
            break;
          }

          case 'DIVIDEND':
          case 'INTEREST':
            updates.totalCashBalance = (currentData.totalCashBalance || 0) + amount;
            break;

          case 'MATURED_DEBT':
            updates.totalInvested = Math.max(0, (currentData.totalInvested || 0) - amount);
            updates.totalCashBalance = (currentData.totalCashBalance || 0) + amount;
            updates.totalMaturedDebt = (currentData.totalMaturedDebt || 0) + amount;
            break;
        }

        // Apply updates to the dashboard
        firestoreTransaction.set(dashboardRef, { ...currentData, ...updates }, { merge: true });
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
      updatedAt: new Date().toISOString(),
    };

    await setDoc(dashboardRef, newData, { merge: true });
    return newData;
  }

  /**
   * Returns a default dashboard summary with all values set to 0
   */
  private getDefaultDashboardSummary(): DashboardSummary {
    return {
      totalInvested: 0,
      totalRealizedPnL: 0,
      totalCashBalance: 0,
      totalMaturedDebt: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const dashboardRef = this.getDashboardDocRef();
    const dashboardSnap = await getDoc(dashboardRef);
    
    if (dashboardSnap.exists()) {
      const data = dashboardSnap.data() as Partial<DashboardSummary>;
      return {
        totalInvested: data.totalInvested ?? 0,
        totalRealizedPnL: data.totalRealizedPnL ?? 0,
        totalCashBalance: data.totalCashBalance ?? 0,
        totalMaturedDebt: data.totalMaturedDebt ?? 0,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      };
    }
    
    return this.getDefaultDashboardSummary();
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
    const totalInvested = investments.reduce(
      (sum, investment) => sum + (investment.totalInvested || 0),
      0,
    );

    const summary: DashboardSummary = {
      totalInvested,
      totalRealizedPnL,
      totalCashBalance,
      totalMaturedDebt
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
