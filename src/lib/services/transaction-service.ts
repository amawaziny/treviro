import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
  orderBy,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import {
  type Transaction,
  type TransactionType,
  type CurrencyCode,
  type BaseRecord,
  type ExpenseRecord,
  type FixedEstimateRecord,
  TRANSACTION_TYPE_META,
} from "@/lib/types";
import {
  eventBus,
  FinancialRecordEvent,
  InvestmentEvent,
} from "@/lib/services/events";

import { TRANSACTIONS_COLLECTION_PATH } from "@/lib/constants";
import { formatPath } from "@/lib/utils";
import { dateConverter } from "@/lib/firestore-converters";

/**
 * Service for managing financial transactions in Firestore.
 *
 * This service provides methods to create, retrieve, and manage financial transactions
 * across different investment types. It handles transaction validation, event subscriptions,
 * and maintains data consistency with related investments and financial records.
 *
 * Transactions can be of various types including BUY, SELL, INCOME, EXPENSE, etc.,
 * and are linked to specific investments or financial records through source IDs.
 */
export class TransactionService {
  private userId: string;
  private unsubscribeCallbacks: (() => void)[] = [];

  /**
   * Creates a new TransactionService instance for a specific user.
   *
   * @param {string} userId - The unique identifier of the user
   * @throws {Error} If userId is not provided or invalid
   */
  constructor(userId: string) {
    if (!userId) {
      throw new Error("User ID is required to initialize TransactionService");
    }
    this.userId = userId;
  }

  /**
   * Sets up event subscriptions for transaction-related operations.
   * Subscribes to various financial events to automatically create/update/delete
   * transactions when related entities change.
   */
  setupEventSubscriptions() {
    const incomeAddedUnsubscribe = eventBus.subscribe(
      "income:added",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "INCOME", true);
      },
    );
    this.unsubscribeCallbacks.push(incomeAddedUnsubscribe);

    const incomeUpdatedUnsubscribe = eventBus.subscribe(
      "income:updated",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "INCOME", false);
      },
    );
    this.unsubscribeCallbacks.push(incomeUpdatedUnsubscribe);

    const expenseAddedUnsubscribe = eventBus.subscribe(
      "expense:added",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "EXPENSE", true);
      },
    );
    this.unsubscribeCallbacks.push(expenseAddedUnsubscribe);

    const expenseUpdatedUnsubscribe = eventBus.subscribe(
      "expense:updated",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(
          event.record,
          "EXPENSE",
          false,
        );
      },
    );
    this.unsubscribeCallbacks.push(expenseUpdatedUnsubscribe);

    const incomeDeletedUnsubscribe = eventBus.subscribe(
      "income:deleted",
      async (event: FinancialRecordEvent) => {
        await this.deleteTransactionsBySourceId(event.record.id);
      },
    );
    this.unsubscribeCallbacks.push(incomeDeletedUnsubscribe);

    const expenseDeletedUnsubscribe = eventBus.subscribe(
      "expense:deleted",
      async (event: FinancialRecordEvent) => {
        await this.deleteTransactionsBySourceId(event.record.id);
      },
    );
    this.unsubscribeCallbacks.push(expenseDeletedUnsubscribe);

    const fixedEstimateConfirmedUnsubscribe = eventBus.subscribe(
      "fixedEstimate:confirmed",
      async (event: FinancialRecordEvent) => {
        const fixedEstimate = event.record as FixedEstimateRecord;
        await this.setFinancialRecordTransaction(
          event.record,
          fixedEstimate.isExpense ? "EXPENSE" : "INCOME",
          true,
        );
      },
    );
    this.unsubscribeCallbacks.push(fixedEstimateConfirmedUnsubscribe);

    const investmentAddedUnsubscribe = eventBus.subscribe(
      "investment:added",
      async (event: InvestmentEvent) => {
        await this.recordTransaction(event.transaction);
      },
    );
    this.unsubscribeCallbacks.push(investmentAddedUnsubscribe);

    const investmentUpdatedUnsubscribe = eventBus.subscribe(
      "investment:updated",
      async (event: InvestmentEvent) => {
        await this.recordTransaction(event.transaction);
      },
    );
    this.unsubscribeCallbacks.push(investmentUpdatedUnsubscribe);

    const investmentDeletedUnsubscribe = eventBus.subscribe(
      "investment:deleted",
      async (event: InvestmentEvent) => {
        await this.deleteTransactionsBySourceId(event.transaction.sourceId);
      },
    );
    this.unsubscribeCallbacks.push(investmentDeletedUnsubscribe);
  }

  /**
   * Gets a reference to the user's transactions collection
   * @private
   */
  private getTransactionsCollection() {
    return collection(
      db,
      formatPath(TRANSACTIONS_COLLECTION_PATH, { userId: this.userId }),
    ).withConverter(dateConverter);
  }

  /**
   * Gets a reference to a specific transaction document
   * @param transactionId - The ID of the transaction
   * @private
   * @returns A reference to the transaction document
   */
  private getTransactionRef(transactionId: string) {
    return doc(
      db,
      `${formatPath(TRANSACTIONS_COLLECTION_PATH, { userId: this.userId })}/${transactionId}`,
    );
  }

  /**
   * Retrieves all transactions for the user within a specific date range
   * @param startDate - The start date of the range
   * @param endDate - The end date of the range
   * @returns Array of transactions within the specified date range
   *
   * @example
   * const transactions = await transactionService.getTransactionsWithin('2025-01-01', '2025-12-31');
   */
  async getTransactionsWithin(
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const q = query(
      this.getTransactionsCollection(),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as Transaction;
    });
  }

  /**
   * Subscribes to real-time updates for transactions within a date range
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @param callback - Callback function called with updated transactions
   * @returns Unsubscribe function
   */
  subscribeToTransactionsWithin(
    startDate: Date,
    endDate: Date,
    callback: (transactions: Transaction[]) => void,
  ): () => void {
    const q = query(
      this.getTransactionsCollection(),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Transaction;
      });
      callback(transactions);
    });
    return unsubscribe;
  }

  /**
   * Retrieves all transactions for the user
   * @returns Array of transactions
   *
   * @example
   * const transactions = await transactionService.getTransactions();
   */
  async getTransactions(): Promise<Transaction[]> {
    const q = query(this.getTransactionsCollection());
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Transaction);
  }

  /**
   * Retrieves all transactions for a specific source (investment, income, expense, fixed estimate).
   *
   * @param sourceId - The ID of the source to get transactions for
   * @returns Array of transactions for the specified source
   *
   * @example
   * const transactions = await transactionService.getTransactionsBySourceId('inv-123');
   * console.log('Transaction history:', transactions);
   */
  async getTransactionsBySourceId(sourceId: string): Promise<Transaction[]> {
    const q = query(
      this.getTransactionsCollection(),
      where("sourceId", "==", sourceId),
      orderBy("date", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Transaction,
    );
  }

  /**
   * Retrieves all transactions for a specific security.
   *
   * @param securityId - The ID of the security to get transactions for
   * @returns Array of transactions for the specified security
   *
   * @example
   * const transactions = await transactionService.getTransactionsBySecurityId('sec-123');
   * console.log('Transaction history:', transactions);
   */
  async getTransactionsBySecurityId(
    securityId: string,
  ): Promise<Transaction[]> {
    const q = query(
      this.getTransactionsCollection(),
      where("securityId", "==", securityId),
      orderBy("date", "desc"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Transaction,
    );
  }

  private async setFinancialRecordTransaction(
    record: BaseRecord,
    type: TransactionType,
    isNew: boolean,
  ) {
    try {
      const now = new Date();

      let transactionId = uuidv4();
      if (!isNew) {
        const transactions = await this.getTransactionsBySourceId(record.id);
        if (transactions && transactions.length > 0) {
          transactionId = transactions[0].id;
        }
      }

      const newTransaction: Omit<Transaction, "createdAt"> = {
        id: transactionId,
        sourceId: record.id,
        sourceType: record.recordType,
        type: type,
        date: record.date || now,
        amount:
          record.type === "Credit Card"
            ? (record as ExpenseRecord)._requiredAmount!
            : record.amount,
        description: record.description,
        currency: "EGP",
        quantity: 0,
        pricePerUnit: 0,
        fees: 0,
        averagePurchasePrice: 0,
        profitOrLoss: 0,
        metadata: {
          sourceSubType: record.type,
          ...record,
        },
      };

      await this.recordTransaction(newTransaction);
    } catch (error) {
      console.error("Failed to create income transaction", error);
      throw new Error("Failed to create income transaction");
    }
  }

  private async deleteTransactionsBySourceId(sourceId: string) {
    try {
      const transactions = await this.getTransactionsBySourceId(sourceId);
      if (transactions) {
        const batch = writeBatch(db);
        transactions.forEach((transaction) => {
          batch.delete(this.getTransactionRef(transaction.id));
        });
        await batch.commit();

        // We publish just one event with any transaction record because:
        // currently the only consumer is the dashboard and it just recalculates the dashboard
        // we don't want to publish an event for each transaction deletion
        await eventBus.publish({
          type: "transaction:deleted",
          transaction: transactions[0],
        });
      }
    } catch (error) {
      console.error("Failed to delete transaction", error);
      throw new Error("Failed to delete transaction");
    }
  }

  /**
   * Records a transaction and updates the associated investment.
   * This is the main method for recording any type of transaction.
   * Any transaction is effecting cash balance account so sell investment is something incrementing cache balance regardless is it profit or loss
   * and sell is negative for investment account
   *
   * @param transactionData - The transaction data (excluding auto-generated fields)
   * @returns The created transaction with all fields populated
   *
   * @throws {Error} If the investment is not found or there are insufficient shares to sell
   */
  async recordTransaction(
    transactionData: Omit<Transaction, "createdAt">,
  ): Promise<Transaction> {
    // Ensure required fields are present
    if (!transactionData.sourceId) {
      throw new Error("sourceId is required");
    }
    if (
      (transactionData.quantity === undefined ||
        transactionData.quantity === null) &&
      transactionData.type !== "PAYMENT"
    ) {
      throw new Error("quantity is required for non-payment transactions");
    }
    if (
      transactionData.amount === undefined ||
      transactionData.amount === null
    ) {
      throw new Error("amount is required");
    }
    if (!transactionData.type) {
      throw new Error("type is required");
    }

    const transactionId = transactionData.id || uuidv4();
    const now = new Date();
    let {
      pricePerUnit = 0,
      profitOrLoss = 0,
      fees = 0,
      quantity = 0,
      amount = 0,
    } = transactionData;

    const sign = TRANSACTION_TYPE_META[transactionData.type].sign;
    amount *= sign;

    if (transactionData.type === "SELL") {
      profitOrLoss =
        amount - Math.abs(quantity) * transactionData.averagePurchasePrice;
    }
    // Create the transaction with all required fields
    const newTransaction: Transaction = {
      ...transactionData,
      id: transactionId,
      createdAt: now,
      pricePerUnit,
      fees,
      quantity,
      amount,
      profitOrLoss,
      currency: transactionData.currency || ("EGP" as CurrencyCode),
      description: transactionData.description || "",
      metadata: {
        ...(transactionData.metadata || {}),
      },
    };

    const transactionDocRef = this.getTransactionRef(transactionId);
    const isNewTransaction = !(await getDoc(transactionDocRef)).exists();

    // Add the transaction
    await setDoc(transactionDocRef, newTransaction);

    // Publish the transaction:created/updated event after successful transaction set
    await eventBus.publish({
      type: isNewTransaction ? "transaction:created" : "transaction:updated",
      transaction: newTransaction,
    });

    return newTransaction;
  }

  async updateTransaction(id: string, data: Partial<Transaction>) {
    try {
      await this.recordTransaction({ ...data, id } as Transaction);
    } catch (error) {
      console.error("Failed to update transaction", error);
      throw new Error("Failed to update transaction");
    }
  }

  //TODO: fire event transaction:deleted with the deleted transaction and investment service needs to listen to it and update the investment average purchase price with the "last transaction"
  async deleteTransaction(id: string) {
    try {
      await deleteDoc(this.getTransactionRef(id));
    } catch (error) {
      console.error("Failed to delete transaction", error);
      throw new Error("Failed to delete transaction");
    }
  }

  cleanup() {
    // Unsubscribe from all event listeners
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
  }
}
