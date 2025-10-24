import { IncomeRecord, ExpenseRecord, DashboardSummary } from "@/lib/types";
import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { Investment, Transaction } from "@/lib/investment-types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InvestmentService } from "./investment-service";
import { TransactionService } from "./transaction-service";
import {
  eventBus,
  FinancialRecordEvent,
  InvestmentEvent,
  TransactionEvent,
} from "@/lib/services/events";

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
    return doc(db, `users/${this.userId}/${DASHBOARD_PATH}`);
  }

  //TODO:
  // 1. consume update TransactionEvent if transaction type is BUY          increment totalInvested by amount and decrement totalCashBalance by amount 
  // 2. consume update TransactionEvent if transaction type is PAYMENT      increment totalInvested by amount and decrement totalCashBalance by amount 
  // 3. consume update TransactionEvent if transaction type is EXPENSE      decrement totalCashBalance by amount 
  // 4. consume update TransactionEvent if transaction type is SELL         decrement totalInvested by (averagePurchasePrice * quantity) and increment totalCashBalance by amount and plus event if it is negative amount totalRealizedPnL by profitOrLoss
  // 5. consume update TransactionEvent if transaction type is DIVIDEND     increment totalCashBalance by amount 
  // 6. consume update TransactionEvent if transaction type is INTEREST     increment totalCashBalance by amount 
  // 7. consume update TransactionEvent if transaction type is MATURED_DEBT decrement totalInvested by amount and increment totalCashBalance by amount and increment totalMaturedDebt by amount
  async partialUpdateDashboardSummary(
    updates: Partial<DashboardSummary>,
  ): Promise<DashboardSummary> {
    const dashboardRef = this.getDashboardDocRef();
    const currentData = await this.getDashboardSummary();

    // Merge updates with current data
    const newData = {
      ...currentData,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(dashboardRef, newData, { merge: true });
    return newData;
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
    const newData = {
      ...currentData,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(dashboardRef, newData, { merge: true });
    return newData;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const dashboardRef = this.getDashboardDocRef();
    const dashboardSnap = await getDoc(dashboardRef);
    return dashboardSnap.exists()
      ? (dashboardSnap.data() as DashboardSummary)
      : {
          totalInvested: 0,
          totalRealizedPnL: 0,
          totalCashBalance: 0,
          totalMaturedDebt: 0,
          updatedAt: new Date().toISOString(),
        };
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
