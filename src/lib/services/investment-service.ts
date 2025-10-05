import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  runTransaction, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  writeBatch,
  deleteDoc
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { 
  Investment, 
  Transaction, 
  TransactionType,
  isSecurityInvestment,
  isGoldInvestment,
  isCurrencyInvestment,
  isRealEstateInvestment,
  isDebtInstrumentInvestment
} from "@/lib/investment-types";
import { CurrencyCode } from "../types";

type TransactionUpdate = {
  totalShares: number;
  totalInvested: number;
  averagePurchasePrice: number;
};

const INVESTMENTS_COLLECTION = 'investments';
const TRANSACTIONS_COLLECTION = 'transactions';

/**
 * Service for managing investments and transactions in Firestore.
 * Handles all CRUD operations for investments and their associated transactions.
 */
export class InvestmentService {
  private userId: string;

  /**
   * Creates a new InvestmentService instance for a specific user.
   * @param userId - The ID of the user to manage investments for
   */
  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Gets a reference to the user's investments collection
   * @private
   */
  private getInvestmentsCollection() {
    return collection(db, `users/${this.userId}/${INVESTMENTS_COLLECTION}`);
  }

  /**
   * Gets a reference to the user's transactions collection
   * @private
   */
  private getTransactionsCollection() {
    return collection(db, `users/${this.userId}/${TRANSACTIONS_COLLECTION}`);
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
   * Gets a reference to a specific transaction document
   * @param transactionId - The ID of the transaction
   * @private
   * @returns A reference to the transaction document
   */
  private getTransactionRef(transactionId: string) {
    return doc(db, `users/${this.userId}/${TRANSACTIONS_COLLECTION}/${transactionId}`);
  }

  /**
   * Creates a new investment with default values.
   * Use this when a user adds a new investment to their portfolio.
   * 
   * @template T - The specific investment type (e.g., SecurityInvestment, GoldInvestment)
   * @param investmentData - The investment data (excluding auto-generated fields)
   * @returns The newly created investment with all required fields populated
   * 
   * @example
   * const newStock = await investmentService.createInvestment<SecurityInvestment>({
   *   type: 'Stocks',
   *   name: 'Apple Inc.',
   *   tickerSymbol: 'AAPL',
   *   securityId: 'stock-aapl',
   *   metadata: { sector: 'Technology' }
   * });
   */
  async createInvestment<T extends Investment>(
    investmentData: Omit<T, 'id' | 'lastUpdated' | 'firstPurchaseDate' | 'totalShares' | 'totalInvested' | 'averagePurchasePrice' | 'currency' | 'userId'> & {
      type: T['type'];
      currency?: CurrencyCode;
    }
  ): Promise<T> {
    const investmentId = uuidv4();
    const now = new Date().toISOString();
    
    // Create base investment with required fields
    let baseInvestment = {
      id: investmentId,
      userId: this.userId, // Add userId to the investment
      lastUpdated: now,
      firstPurchaseDate: now,
      totalShares: 0,         // Will be updated with transactions
      totalInvested: 0,       // Will be updated with transactions
      averagePurchasePrice: 0, // Will be calculated based on transactions
      currency: (investmentData.currency || 'EGP') as CurrencyCode, // Use provided currency or default to EGP
      ...investmentData,
      metadata: {
        // Ensure metadata exists and is an object
        ...(investmentData.metadata || {})
      }
    };

    // Attach installment schedule if Real Estate and schedule fields are present
    if (investmentData.type === 'Real Estate') {
      // Import here to avoid circular deps if any
      const { generateInstallmentSchedule } = require("@/lib/installment-utils");
      const installments = generateInstallmentSchedule(baseInvestment, []);
      if (installments && installments.length > 0) {
        baseInvestment = {
          ...baseInvestment,
          installments,
        };
      }
    }

    // Type assertion to the specific investment type
    const newInvestment = baseInvestment as unknown as T;

    await setDoc(this.getInvestmentRef(investmentId), newInvestment);
    return newInvestment;
  }

  /**
   * Calculates the updated investment values based on a transaction.
   * This is an internal method used by recordTransaction.
   * 
   * @param current - Current investment state
   * @param transaction - The transaction being processed
   * @returns Updated investment values
   * @private
   */
  private calculateInvestmentUpdate(
    current: { totalShares: number; totalInvested: number; averagePurchasePrice: number },
    transaction: Pick<Transaction, 'type' | 'quantity' | 'amount' | 'pricePerUnit' | 'fees'>
  ): TransactionUpdate {
    const { type, quantity, amount } = transaction;
    let { totalShares, totalInvested, averagePurchasePrice } = current;

    switch (type) {
      case 'BUY':
        totalShares += quantity;
        totalInvested += amount;
        averagePurchasePrice = totalInvested / totalShares;
        break;

      case 'SELL':
        if (quantity > current.totalShares) {
          throw new Error('Not enough shares to sell');
        }
        totalShares -= quantity;
        // Cost basis remains the same, we just reduce the quantity
        break;

      case 'DIVIDEND':
      case 'PAYMENT':
        // These don't affect the cost basis or share count
        break;

      case 'TRANSFER':
        // For transfers, we'll handle the source and target separately
        // This method only handles one side of the transfer
        totalShares -= quantity;
        totalInvested -= (quantity * current.averagePurchasePrice);
        break;
    }

    return {
      totalShares,
      totalInvested,
      averagePurchasePrice: totalShares > 0 ? totalInvested / totalShares : 0,
    };
  }

  /**
   * Records a transaction and updates the associated investment.
   * This is the main method for recording any type of transaction.
   * 
   * @param transactionData - The transaction data (excluding auto-generated fields)
   * @returns The created transaction with all fields populated
   * 
   * @throws {Error} If the investment is not found or there are insufficient shares to sell
   * 
   * @example
   * await investmentService.recordTransaction({
   *   investmentId: 'inv-123',
   *   securityId: 'stock-aapl',
   *   type: 'BUY',
   *   date: '2025-10-05',
   *   amount: 1000,
   *   quantity: 10,
   *   pricePerUnit: 100,
   *   fees: 10,
   *   currency: 'EGP',
   *   metadata: { note: 'Initial purchase' }
   * });
   */
  async recordTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    // Ensure required fields are present
    if (!transactionData.investmentId) {
      throw new Error('investmentId is required');
    }
    if (!transactionData.securityId) {
      throw new Error('securityId is required');
    }
    if (transactionData.quantity === undefined || transactionData.quantity === null) {
      throw new Error('quantity is required');
    }
    if (transactionData.amount === undefined || transactionData.amount === null) {
      throw new Error('amount is required');
    }
    if (!transactionData.type) {
      throw new Error('type is required');
    }

    return runTransaction(db, async (transaction) => {
      const transactionId = uuidv4();
      const now = new Date().toISOString();
      
      // Create the transaction with all required fields
      const newTransaction: Transaction = {
        ...transactionData,
        id: transactionId,
        userId: this.userId,
        createdAt: now,
        updatedAt: now,
        // Ensure metadata exists and has the correct shape
        metadata: {
          ...(transactionData.metadata || {})
        },
        // Ensure all required fields have default values if not provided
        pricePerUnit: transactionData.pricePerUnit || 0,
        fees: transactionData.fees || 0,
        currency: transactionData.currency || 'EGP' as CurrencyCode,
        description: transactionData.description || ''
      };

      // Handle transfers (which affect two investments)
      if (transactionData.type === 'TRANSFER') {
        const metadata = transactionData.metadata || {};
        const sourceInvestmentId = metadata.sourceInvestmentId as string;
        const targetInvestmentId = metadata.targetInvestmentId as string;
        
        if (!sourceInvestmentId || !targetInvestmentId) {
          throw new Error('Transfer requires sourceInvestmentId and targetInvestmentId in metadata');
        }

        // Get both investments
        const sourceRef = this.getInvestmentRef(sourceInvestmentId);
        const targetRef = this.getInvestmentRef(targetInvestmentId);
        
        const [sourceDoc, targetDoc] = await Promise.all([
          transaction.get(sourceRef),
          transaction.get(targetRef)
        ]);

        if (!sourceDoc.exists() || !targetDoc.exists()) {
          throw new Error('Source or target investment not found');
        }

        const sourceInvestment = sourceDoc.data() as Investment;
        const targetInvestment = targetDoc.data() as Investment;
        
        // Calculate source update (reducing position)
        const sourceUpdate = this.calculateInvestmentUpdate({
          totalShares: sourceInvestment.totalShares,
          totalInvested: sourceInvestment.totalInvested,
          averagePurchasePrice: sourceInvestment.averagePurchasePrice
        }, {
          type: 'TRANSFER',
          quantity: -transactionData.quantity, // Negative for source
          amount: -transactionData.amount,     // Negative for source
          pricePerUnit: transactionData.pricePerUnit || 0,
          fees: transactionData.fees || 0
        });

        // Update source investment
        transaction.update(sourceRef, {
          totalShares: sourceUpdate.totalShares,
          totalInvested: sourceUpdate.totalInvested,
          averagePurchasePrice: sourceUpdate.averagePurchasePrice,
          lastUpdated: now,
        });

        // Update target investment (as a BUY)
        const targetUpdate = this.calculateInvestmentUpdate({
          totalShares: targetInvestment.totalShares,
          totalInvested: targetInvestment.totalInvested,
          averagePurchasePrice: targetInvestment.averagePurchasePrice
        }, {
          type: 'BUY',
          quantity: transactionData.quantity,
          amount: transactionData.amount,
          pricePerUnit: transactionData.pricePerUnit || 0,
          fees: transactionData.fees || 0
        });

        transaction.update(targetRef, {
          totalShares: targetUpdate.totalShares,
          totalInvested: targetUpdate.totalInvested,
          averagePurchasePrice: targetUpdate.averagePurchasePrice,
          lastUpdated: now,
        });
      } else {
        // Handle all other transaction types (single investment)
        const investmentRef = this.getInvestmentRef(transactionData.investmentId);
        const investmentDoc = await transaction.get(investmentRef);
        
        if (!investmentDoc.exists()) {
          throw new Error('Investment not found');
        }

        const investment = investmentDoc.data() as Investment;
        const update = this.calculateInvestmentUpdate({
          totalShares: investment.totalShares,
          totalInvested: investment.totalInvested,
          averagePurchasePrice: investment.averagePurchasePrice
        }, {
          type: transactionData.type,
          quantity: transactionData.quantity,
          amount: transactionData.amount,
          pricePerUnit: transactionData.pricePerUnit || 0,
          fees: transactionData.fees || 0
        });

        // Update the investment
        transaction.update(investmentRef, {
          totalShares: update.totalShares,
          totalInvested: update.totalInvested,
          averagePurchasePrice: update.averagePurchasePrice,
          lastUpdated: now,
        });
      }

      // Add the transaction
      transaction.set(this.getTransactionRef(transactionId), newTransaction);

      return newTransaction;
    });
  }

  /**
   * Retrieves an investment by its ID.
   * 
   * @param investmentId - The ID of the investment to retrieve
   * @returns The investment if found, or null if not found
   * 
   * @example
   * const investment = await investmentService.getInvestment('inv-123');
   * if (investment) {
   *   console.log('Found investment:', investment.name);
   * }
   */
  async getInvestment(investmentId: string): Promise<Investment | null> {
    const docSnap = await getDoc(this.getInvestmentRef(investmentId));
    return docSnap.exists() ? (docSnap.data() as Investment) : null;
  }

  /**
   * Retrieves all investments of a specific type for the user.
   * 
   * @param type - The type of investments to retrieve
   * @returns Array of investments matching the specified type
   * 
   * @example
   * const stockInvestments = await investmentService.getInvestmentsByType('Stocks');
   * console.log('Stocks:', stockInvestments);
   */
  async getInvestmentsByType(type: Investment['type']): Promise<Investment[]> {
    const q = query(
      this.getInvestmentsCollection(),
      where('type', '==', type)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Investment);
  }

  /**
   * Retrieves all transactions for a specific investment.
   * 
   * @param investmentId - The ID of the investment to get transactions for
   * @returns Array of transactions for the specified investment
   * 
   * @example
   * const transactions = await investmentService.getTransactionsForInvestment('inv-123');
   * console.log('Transaction history:', transactions);
   */
  async getTransactionsForInvestment(investmentId: string): Promise<Transaction[]> {
    const q = query(
      this.getTransactionsCollection(),
      where('investmentId', '==', investmentId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Transaction);
  }

  /**
   * Updates the current market value of an investment.
   * Use this when you want to update the current market value without recording a transaction.
   * 
   * @param investmentId - The ID of the investment to update
   * @param currentValue - The new current market value
   * 
   * @example
   * // Update the current value of an investment
   * await investmentService.updateCurrentValue('inv-123', 1500);
   */
  async updateCurrentValue(investmentId: string, currentValue: number): Promise<void> {
    const investmentRef = this.getInvestmentRef(investmentId);
    await updateDoc(investmentRef, {
      currentValue,
      lastUpdated: new Date().toISOString()
    });
  }

  // Helper methods for specific transaction types
  /**
   * Records a buy transaction for an investment.
   * This is a convenience method that wraps recordTransaction with BUY-specific logic.
   * 
   * @param investmentId - The ID of the investment being purchased
   * @param securityId - The ID of the security being purchased
   * @param quantity - Number of units/shares being purchased
   * @param pricePerUnit - Price per unit
   * @param fees - Transaction fees
   * @param date - Transaction date (ISO string)
   * @param metadata - Additional transaction metadata
   * 
   * @example
   * // Record buying 10 shares at $100 each with $10 fees
   * await investmentService.recordBuyTransaction(
   *   'inv-123', 'stock-aapl', 10, 100, 10, '2025-10-05',
   *   { note: 'Monthly investment' }
   * );
   */
  async recordBuyTransaction(
    investmentId: string,
    securityId: string,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit + fees;
    
    return this.recordTransaction({
      userId: this.userId,
      investmentId,
      securityId,
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
   * @param quantity - Number of units/shares being sold
   * @param pricePerUnit - Price per unit
   * @param fees - Transaction fees
   * @param date - Transaction date (ISO string)
   * @param metadata - Additional transaction metadata
   * 
   * @example
   * // Record selling 5 shares at $120 each with $10 fees
   * await investmentService.recordSellTransaction(
   *   'inv-123', 'stock-aapl', 5, 120, 10, '2025-10-05',
   *   { note: 'Taking profits' }
   * );
   */
  async recordSellTransaction(
    investmentId: string,
    securityId: string,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit - fees;
    
    return this.recordTransaction({
      userId: this.userId,
      investmentId,
      securityId,
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
   * @param amount - The dividend amount
   * @param date - Dividend payment date (ISO string)
   * @param metadata - Additional metadata about the dividend
   * 
   * @example
   * // Record a $50 dividend payment
   * await investmentService.recordDividend(
   *   'inv-123', 'stock-aapl', 50, '2025-10-05',
   *   { period: 'Q3 2025', taxWithheld: 5 }
   * );
   */
  async recordDividend(
    investmentId: string,
    securityId: string,
    amount: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    return this.recordTransaction({
      userId: this.userId,
      investmentId,
      securityId,
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
   * @param securityId - The ID of the related security
   * @param amount - The payment amount (positive for income, negative for expense)
   * @param date - Payment date (ISO string)
   * @param paymentMethod - How the payment was made (e.g., 'Credit Card', 'Bank Transfer')
   * @param reference - A reference number or ID for the payment
   * @param metadata - Additional payment metadata
   * 
   * @example
   * // Record a $100 payment for investment fees
   * await investmentService.recordPayment(
   *   'inv-123', 'fund-xyz', -100, '2025-10-05',
   *   'Bank Transfer', 'TRX-123456',
   *   { description: 'Annual management fee' }
   * );
   */
  async recordPayment(
    investmentId: string,
    securityId: string,
    amount: number,
    date: string,
    paymentMethod: string,
    reference: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    return this.recordTransaction({
      userId: this.userId,
      investmentId,
      securityId,
      type: 'PAYMENT',
      date,
      amount: -amount, // Negative for outgoing payment
      quantity: 0,
      pricePerUnit: 0,
      fees: 0,
      currency: 'EGP',
      metadata: {
        ...metadata,
        paymentMethod,
        reference,
      },
    });
  }

  /**
   * Records a transfer of assets between two investments.
   * This is used when moving assets from one investment to another (e.g., between accounts).
   * 
   * @param sourceInvestmentId - The ID of the investment the assets are coming from
   * @param targetInvestmentId - The ID of the investment the assets are going to
   * @param securityId - The ID of the security being transferred
   * @param quantity - Number of units/shares being transferred
   * @param pricePerUnit - Current market price per unit (for valuation)
   * @param fees - Any transfer fees
   * @param date - Transfer date (ISO string)
   * @param metadata - Additional transfer metadata
   * 
   * @example
   * // Transfer 10 shares from one account to another
   * await investmentService.recordTransfer(
   *   'inv-from-123', 'inv-to-456', 'stock-aapl',
   *   10, 100, 5, '2025-10-05',
   *   { reason: 'Account consolidation' }
   * );
   */
  async recordTransfer(
    sourceInvestmentId: string,
    targetInvestmentId: string,
    securityId: string,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit;
    
    return this.recordTransaction({
      userId: this.userId,
      investmentId: sourceInvestmentId, // Source investment
      securityId,
      type: 'TRANSFER',
      date,
      amount: -amount, // Negative for source
      quantity: -quantity, // Negative for source
      pricePerUnit,
      fees,
      currency: 'EGP',
      metadata: {
        ...metadata,
        sourceInvestmentId,
        targetInvestmentId,
      },
    });
  }

  // Add more specific transaction recording methods as needed (dividends, interest, etc.)

  /**
   * Deletes an investment by ID and returns the deleted investment data if it existed.
   * @param investmentId - The investment's ID
   * @returns The deleted investment data, or null if not found
   */
  async deleteInvestment(investmentId: string): Promise<Investment | null> {
    const investmentRef = this.getInvestmentRef(investmentId);
    const docSnap = await getDoc(investmentRef);
    if (!docSnap.exists()) return null;
    const investmentData = docSnap.data() as Investment;
    await deleteDoc(investmentRef);
    return investmentData;
  }
}
