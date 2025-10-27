import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  runTransaction as runFirestoreTransaction,
  query,
  where,
  getDocs,
  Transaction as FirestoreTransaction,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import type {
  Transaction,
  TransactionType,
  CurrencyCode,
  BaseRecord,
} from "@/lib/types";
import {
  eventBus,
  FinancialRecordEvent,
  InvestmentEvent,
} from "@/lib/services/events";

import { TRANSACTIONS_COLLECTION_PATH } from "@/lib/constants";
import { formatPath } from "../utils";

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
    this.setupEventSubscriptions();
  }

  /**
   * Sets up event subscriptions for transaction-related operations.
   * Subscribes to various financial events to automatically create/update/delete
   * transactions when related entities change.
   *
   * @private
   */
  private setupEventSubscriptions() {
    const incomeAddedUnsubscribe = eventBus.subscribe(
      "income:added",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "INCOME");
      },
    );
    this.unsubscribeCallbacks.push(incomeAddedUnsubscribe);

    const incomeUpdatedUnsubscribe = eventBus.subscribe(
      "income:updated",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "INCOME");
      },
    );
    this.unsubscribeCallbacks.push(incomeUpdatedUnsubscribe);

    const expenseAddedUnsubscribe = eventBus.subscribe(
      "expense:added",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "EXPENSE");
      },
    );
    this.unsubscribeCallbacks.push(expenseAddedUnsubscribe);

    const expenseUpdatedUnsubscribe = eventBus.subscribe(
      "expense:updated",
      async (event: FinancialRecordEvent) => {
        await this.setFinancialRecordTransaction(event.record, "EXPENSE");
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
    );
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

  async getTransactions(): Promise<Transaction[]> {
    const q = query(this.getTransactionsCollection());
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Transaction);
  }

  /**
   * Retrieves all transactions for a specific investment.
   *
   * @param investmentId - The ID of the investment to get transactions for
   * @returns Array of transactions for the specified investment
   *
   * @example
   * const transactions = await transactionService.getTransactionsForInvestment('inv-123');
   * console.log('Transaction history:', transactions);
   */
  async getTransactionsByInvestmentId(
    investmentId: string,
  ): Promise<Transaction[]> {
    const q = query(
      this.getTransactionsCollection(),
      where("investmentId", "==", investmentId),
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

  private async getTransactionBySourceId(
    sourceId: string,
  ): Promise<Transaction[] | null> {
    const q = query(
      this.getTransactionsCollection(),
      where("sourceId", "==", sourceId),
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
  ) {
    try {
      const now = new Date().toISOString();

      let transactionId = uuidv4();
      const transaction = await this.getTransactionBySourceId(record.id);
      if (transaction) {
        transactionId = transaction[0].id;
      }

      const newTransaction: Transaction = {
        id: transactionId,
        userId: this.userId,
        sourceId: record.id,
        sourceType: record.recordType,
        type: type,
        date: record.date || now,
        amount: type === "EXPENSE" ? -record.amount : record.amount,
        description: record.description,
        currency: "EGP",
        quantity: 0,
        pricePerUnit: 0,
        fees: 0,
        createdAt: now,
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
      const transactions = await this.getTransactionBySourceId(sourceId);
      if (transactions) {
        const batch = writeBatch(db);
        transactions.forEach((transaction) => {
          batch.delete(this.getTransactionRef(transaction.id));
        });
        await batch.commit();

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
    if (!transactionData.securityId && transactionData.type !== "PAYMENT") {
      throw new Error("securityId is required for non-payment transactions");
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

    return runFirestoreTransaction(
      db,
      async (firestoreTransaction: FirestoreTransaction) => {
        const transactionId = transactionData.id || uuidv4();
        const now = new Date().toISOString();
        let {
          pricePerUnit = 0,
          profitOrLoss = 0,
          fees = 0,
          quantity = 0,
        } = transactionData;

        if (transactionData.type === "SELL") {
          profitOrLoss =
            quantity * transactionData.averagePurchasePrice -
            transactionData.amount;
        }
        // Create the transaction with all required fields
        const newTransaction: Transaction = {
          ...transactionData,
          id: transactionId,
          userId: this.userId,
          createdAt: now,
          pricePerUnit: pricePerUnit,
          fees: fees,
          quantity: quantity,
          profitOrLoss: profitOrLoss,
          currency: transactionData.currency || ("EGP" as CurrencyCode),
          description: transactionData.description || "",
          metadata: {
            ...(transactionData.metadata || {}),
          },
        };

        // Add the transaction
        firestoreTransaction.set(
          this.getTransactionRef(transactionId),
          newTransaction,
        );

        // Publish the transaction:created event after successful transaction creation
        await eventBus.publish({
          type: transactionData.id
            ? "transaction:updated"
            : "transaction:created",
          transaction: newTransaction,
        });

        return newTransaction;
      },
    );
  }

  cleanup() {
    // Unsubscribe from all event listeners
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
  }
}
