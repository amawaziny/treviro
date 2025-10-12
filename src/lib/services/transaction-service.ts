import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  runTransaction as firestoreRunTransaction,
  query,
  where,
  getDocs,
  Transaction as FirebaseTransaction,
  setDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import type { 
  InvestmentType,
  CurrencyCode,
  BaseRecord,
} from "@/lib/types";
import { RealEstateInvestment, Transaction, TransactionType } from "@/lib/investment-types";
import { eventBus, FinancialRecordEvent } from "@/lib/services/events";

type TransactionUpdate = {
  totalShares: number;
  totalInvested: number;
  averagePurchasePrice: number;
};

const TRANSACTIONS_COLLECTION = 'transactions';
const INVESTMENTS_COLLECTION = 'investments';

/**
 * Service for managing investment transactions in Firestore.
 * Handles all transaction-related operations for investments.
 */
export class TransactionService {
  private userId: string;
  private unsubscribeCallbacks: (() => void)[] = [];

  /**
   * Creates a new TransactionService instance for a specific user.
   * @param userId - The ID of the user to manage transactions for
   */
  constructor(userId: string) {
    this.userId = userId;
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions() {
    // Subscribe to income events
    const unsubscribe = eventBus.subscribe(async (event: FinancialRecordEvent) => {
      if (event.type === 'income:added' || event.type === 'income:updated') {
        await this.setFinancialRecordTransaction(event.record, 'INCOME');
      } else if (event.type === 'expense:added' || event.type === 'expense:updated') {
        await this.setFinancialRecordTransaction(event.record, 'EXPENSE');
      }else if(event.type=="income:deleted" || event.type=="expense:deleted"){
        await this.deleteFinancialRecordTransaction(event.recordId);
      }
    });
    
    this.unsubscribeCallbacks.push(unsubscribe);
  }

  /**
   * Gets a reference to the user's transactions collection
   * @private
   */
  private getTransactionsCollection() {
    return collection(db, `users/${this.userId}/${TRANSACTIONS_COLLECTION}`);
  }

  /**
   * Gets a reference to a specific transaction document
   * @param transactionId - The ID of the transaction
   * @private
   * @returns A reference to the transaction document
   */
  private getTransactionRef(transactionId: string) {
    return doc(db, `users/${this.userId}/${TRANSACTIONS_COLLECTION}/${transactionId}`);
  }

  /**
   * Gets a reference to a specific investment document
   * @param investmentId - The ID of the investment
   * @private
   */
  private getInvestmentRef(investmentId: string) {
    return doc(db, `users/${this.userId}/${INVESTMENTS_COLLECTION}/${investmentId}`);
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
  async getTransactionsForInvestment(investmentId: string): Promise<Transaction[]> {
    const q = query(
      this.getTransactionsCollection(),
      where('investmentId', '==', investmentId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));
  }

  private async getTransactionBySourceId(sourceId: string): Promise<Transaction[] | null> {
    const q = query(
      this.getTransactionsCollection(),
      where('sourceId', '==', sourceId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));
  }

  /**
   * Calculates the updated investment values based on a transaction.
   * 
   * @param current - Current investment state
   * @param transaction - The transaction being processed
   * @returns Updated investment values
   */
  calculateInvestmentUpdate(
    current: { totalShares: number; totalInvested: number; averagePurchasePrice: number },
    transaction: Pick<Transaction, 'type' | 'quantity' | 'amount' | 'pricePerUnit' | 'fees' | 'investmentType' | 'installmentNumber'>
  ): TransactionUpdate {
    const { type, quantity = 0, amount = 0, pricePerUnit = 0, fees = 0, investmentType } = transaction;
    let { totalShares, totalInvested, averagePurchasePrice } = current;

    switch (type) {
      case 'BUY':
        totalShares += quantity;
        totalInvested += amount;
        averagePurchasePrice = totalShares > 0 ? totalInvested / totalShares : 0;
        break;

      case 'SELL':
        if (quantity > current.totalShares) {
          throw new Error('Not enough shares to sell');
        }
        totalShares -= quantity;
        // For real estate, we don't reduce totalInvested when selling
        if (investmentType !== 'Real Estate') {
          totalInvested -= (current.averagePurchasePrice * quantity);
        }
        break;

      case 'PAYMENT':
        if (investmentType === 'Real Estate' && transaction.installmentNumber !== undefined) {
          // For real estate installments, we don't modify shares or average price
          // Just update the total invested amount
          totalInvested += Math.abs(amount);
        } else {
          totalInvested += amount;
        }
        break;

      case 'DIVIDEND':
        // Dividends don't affect the cost basis or share count
        break;
    }

    return {
      totalShares,
      totalInvested,
      averagePurchasePrice: totalShares > 0 ? totalInvested / totalShares : 0,
    };
  }

  private async setFinancialRecordTransaction(record: BaseRecord, type: TransactionType) {
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
      type: type,
      date: record.date || now,
      amount: type === 'EXPENSE' ? -record.amount : record.amount,
      description: record.description,
      currency: 'EGP',
      quantity: 0,
      pricePerUnit: 0,
      fees: 0,
      createdAt: now,
      metadata: {
        source: 'financial-records',
      }
    };

    await setDoc(this.getTransactionRef(transactionId), newTransaction);

  } catch (error) {
    console.error('Failed to create income transaction', error);
    throw new Error('Failed to create income transaction');
  }
}

private async deleteFinancialRecordTransaction(recordId: string) {
  try {
    await deleteDoc(this.getTransactionRef(recordId));
  } catch (error) {
    console.error('Failed to delete income transaction', error);
    throw new Error('Failed to delete income transaction');
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
    transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    // Ensure required fields are present
    if (!transactionData.sourceId) {
      throw new Error('sourceId is required');
    }
    if (!transactionData.securityId && transactionData.type !== 'PAYMENT') {
      throw new Error('securityId is required for non-payment transactions');
    }
    if ((transactionData.quantity === undefined || transactionData.quantity === null) && transactionData.type !== 'PAYMENT') {
      throw new Error('quantity is required for non-payment transactions');
    }
    if (transactionData.amount === undefined || transactionData.amount === null) {
      throw new Error('amount is required');
    }
    if (!transactionData.type) {
      throw new Error('type is required');
    }

    return firestoreRunTransaction(db, async (transaction: FirebaseTransaction) => {
      const transactionId = uuidv4();
      const now = new Date().toISOString();
      
      // Create the transaction with all required fields
      const newTransaction: Transaction = {
        ...transactionData,
        id: transactionId,
        userId: this.userId,
        createdAt: now,
        metadata: {
          ...(transactionData.metadata || {})
        },
        pricePerUnit: transactionData.pricePerUnit || 0,
        fees: transactionData.fees || 0,
        currency: transactionData.currency || 'EGP' as CurrencyCode,
        description: transactionData.description || '',
        quantity: transactionData.quantity || 0,
      };

      const investmentRef = this.getInvestmentRef(transactionData.sourceId);
      const investmentDoc = await transaction.get(investmentRef);
      
      if (!investmentDoc.exists()) {
        throw new Error('Investment not found');
      }

      const investment = investmentDoc.data() as any;
      const update = this.calculateInvestmentUpdate({
        totalShares: investment.totalShares || 0,
        totalInvested: investment.totalInvested || 0,
        averagePurchasePrice: investment.averagePurchasePrice || 0
      }, {
        type: transactionData.type,
        quantity: transactionData.quantity || 0,
        amount: transactionData.amount,
        pricePerUnit: transactionData.pricePerUnit || 0,
        fees: transactionData.fees || 0,
        investmentType: transactionData.investmentType,
        installmentNumber: transactionData.installmentNumber
      });

      // Prepare update data
      const updateData: any = {
        totalShares: update.totalShares,
        totalInvested: update.totalInvested,
        averagePurchasePrice: update.averagePurchasePrice,
        lastUpdated: now,
      };

      // If this is a payment for a real estate installment, mark it as paid
      if (transactionData.type === 'PAYMENT' && 
          transactionData.investmentType === 'Real Estate' && 
          transactionData.installmentNumber !== undefined) {
        
        const realEstateInvestment = investment as RealEstateInvestment;
        if (realEstateInvestment.installments) {
          const updatedInstallments = realEstateInvestment.installments.map(installment => ({
            ...installment,
            ...(installment.number === transactionData.installmentNumber ? {
              status: 'Paid',
              paymentDate: now
            } : {})
          }));

          updateData.installments = updatedInstallments;
        }
      }

      // Update the investment
      transaction.update(investmentRef, updateData);

      // Add the transaction
      transaction.set(this.getTransactionRef(transactionId), newTransaction);

      return newTransaction;
    });
  }

  /**
   * Records a buy transaction for an investment.
   * This is a convenience method that wraps recordTransaction with BUY-specific logic.
   * 
   * @param investmentId - The ID of the investment being purchased
   * @param securityId - The ID of the security being purchased
   * @param investmentType - The type of investment
   * @param quantity - Number of units/shares being purchased
   * @param pricePerUnit - Price per unit
   * @param fees - Transaction fees
   * @param date - Transaction date (ISO string)
   * @param metadata - Additional transaction metadata
   * @returns The created transaction
   */
  async buy(
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit + fees;
    
    return this.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      securityId,
      investmentType,
      type: 'BUY',
      date,
      amount,
      quantity,
      pricePerUnit,
      fees,
      currency: 'EGP',
      metadata
    });
  }

  /**
   * Records a sell transaction for an investment.
   * This is a convenience method that wraps recordTransaction with SELL-specific logic.
   * 
   * @param investmentId - The ID of the investment being sold
   * @param securityId - The ID of the security being sold
   * @param investmentType - The type of investment
   * @param quantity - Number of units/shares being sold
   * @param pricePerUnit - Price per unit
   * @param fees - Transaction fees
   * @param date - Transaction date (ISO string)
   * @param metadata - Additional transaction metadata
   * @returns The created transaction
   */
  async sell(
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit - fees;
    
    return this.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      securityId,
      investmentType,
      type: 'SELL',
      date,
      amount: -amount, // Negative amount for sales
      quantity: -quantity, // Negative quantity for sales
      pricePerUnit,
      fees,
      currency: 'EGP',
      metadata
    });
  }

  /**
   * Records a dividend payment for an investment.
   * 
   * @param investmentId - The ID of the investment receiving the dividend
   * @param securityId - The ID of the security paying the dividend
   * @param investmentType - The type of investment
   * @param amount - The dividend amount
   * @param date - Dividend payment date (ISO string)
   * @param metadata - Additional metadata about the dividend
   * @returns The created transaction
   */
  async addDividend(
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    amount: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    return this.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      securityId,
      investmentType,
      type: 'DIVIDEND',
      date,
      amount,
      quantity: 0, // No change in share count
      pricePerUnit: 0,
      fees: 0,
      currency: 'EGP',
      metadata: {
        ...metadata,
        isIncome: true,
      },
    });
  }

  /**
   * Records a payment related to an investment.
   * Use this for fees, installments, or other payments not covered by other transaction types.
   * 
   * @param investmentId - The ID of the investment the payment is for
   * @param investmentType - The type of investment
   * @param installmentNumber - The number of the installment being paid
   * @param amount - The payment amount (positive for income, negative for expense)
   * @param date - Payment date (ISO string)
   * @param metadata - Additional payment metadata
   * @returns The created transaction
   */
  async pay(
    investmentId: string,
    investmentType: InvestmentType,
    installmentNumber: number,
    amount: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    return this.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      investmentType,
      installmentNumber,
      type: 'PAYMENT',
      date,
      amount: -amount, // Negative for outgoing payment
      quantity: 0,
      pricePerUnit: 0,
      fees: 0,
      currency: 'EGP',
      metadata: {
        ...metadata,
      },
    });
  }

   cleanup() {
    // Unsubscribe from all event listeners
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    this.unsubscribeCallbacks = [];
  }
}
