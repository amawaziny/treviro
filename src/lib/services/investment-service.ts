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
  deleteDoc,
  DocumentReference,
  DocumentData,
  DocumentSnapshot
} from "firebase/firestore";
import {Transaction as FirebaseTransaction} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { 
  Investment, 
  Transaction, 
  TransactionType,
  isSecurityInvestment,
  isGoldInvestment,
  isCurrencyInvestment,
  isRealEstateInvestment,
  isDebtInstrumentInvestment,
  SecurityInvestment
} from "@/lib/investment-types";
import { CurrencyCode, InvestmentType } from "../types";
import { RealEstateInvestment } from "../investment-types";

type TransactionUpdate = {
  totalShares: number;
  totalInvested: number;
  averagePurchasePrice: number;
};

type InvestmentWithId = Investment & { id: string };

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
   * Finds an investment by its security ID
   * @private
   */
  private async findInvestmentBySecurityId(securityId: string): Promise<InvestmentWithId | null> {
    if (!securityId) return null;
    
    const investmentsRef = this.getInvestmentsCollection();
    const q = query(investmentsRef, where('securityId', '==', securityId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as InvestmentWithId;
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
    const realEstateInvestment: RealEstateInvestment  = {
      id: uuidv4(),
      userId: this.userId,
      firstPurchaseDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      name: 'Luxury Apartment in New Cairo',
      type: 'Real Estate',
      propertyType: 'Commercial' ,
      propertyAddress: '123 Palm Hills, New Cairo, Egypt',
      currency: 'EGP',
      // For real estate, you might want to set these based on your payment plan
      totalShares: 1, // Typically 1 for real estate
      totalInvested: 5000000, // Total property price in EGP
      averagePurchasePrice: 5000000, // Same as totalInvested for real estate
      // Installment plan details
      installmentFrequency: 'Monthly' ,
      installmentAmount: 50000, // Monthly payment amount
      totalInstallmentPrice: 6000000, // Total price including interest
      installmentStartDate: '2023-01-01', // Start date of installments
      installmentEndDate: '2024-12-01', // End date of installments
      downPayment: 1000000, // Down payment amount
      maintenanceAmount: 50000, // Maintenance amount
      maintenancePaymentDate: '2023-01-01', // Maintenance payment date
      builtUpArea: 100, // Built-up area in square meters
      hasGarden: true, // Whether the property has a garden
      // Add any other metadata
      metadata: {
        // Any additional metadata here
      }
    };
    this.buyNew(realEstateInvestment); 
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
  /**
   * Creates a new investment or updates an existing one if securityId matches.
   * Ensures only one record exists per security and creates a transaction for the initial purchase.
   * 
   * @param investmentData - The investment data to create
   * @returns The created/updated investment with all required fields
   */
  async buyNew<T extends Investment>(
    investmentData: Omit<T, 'id' | 'lastUpdated' | 'totalShares' | 'totalInvested' | 'averagePurchasePrice' | 'currency' | 'userId'> & {
      type: T['type'];
      securityId?: string;
      currency?: CurrencyCode;
      quantity?: number;
      pricePerUnit?: number;
      fees?: number;
    }
  ): Promise<{ investment: T & { id: string }; transaction: Transaction | null }> {
    const { securityId, type, quantity = 0, pricePerUnit = 0, fees = 0, currency = 'EGP' } = investmentData as any;
    const amount = quantity * pricePerUnit + fees;
    
    // Validate required fields for security types
    if (type === 'Securities' && !securityId) {
      throw new Error('securityId is required for stock and fund investments');
    }
    
    return runTransaction(db, async (transaction: FirebaseTransaction) => {
      const now = new Date().toISOString();
      let investment: any;
      let investmentId = uuidv4();

      // Create base investment with required fields
      investment = {
        ...investmentData,
        id: investmentId,
        userId: this.userId,
        securityId: securityId || '',
        currency,
        lastUpdated: now,
        totalShares: quantity,
        totalInvested: amount,
        averagePurchasePrice: quantity > 0 ? amount / quantity : 0,
        metadata: {
          ...(investmentData.metadata || {})
        }
      };
      
      // Handle type-specific fields
      if (isRealEstateInvestment(investment)) {
        // Handle real estate specific fields if needed
        if (investment.metadata?.installmentFrequency) {
          const { generateInstallmentSchedule } = require("@/lib/installment-utils");
          const installments = generateInstallmentSchedule(investment, []);
          if (installments?.length > 0) {
            investment.installments = installments;
          }
        }
      }
      
      // Save the new investment
      const investmentRef = this.getInvestmentRef(investmentId);
      transaction.set(investmentRef, investment);
      
      let transactionData: Transaction | null = null;
      if(!isRealEstateInvestment(investment)) {
        transactionData = await this.buy(investmentId, securityId, type, quantity, pricePerUnit, fees, currency);
      }

      return { 
        investment: investment as T & { id: string }, 
        transaction: transactionData 
      };
    });
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

  /**
   * Records a transaction and updates the associated investment.
   * This is the main method for recording any type of transaction.
   * 
   * @param transactionData - The transaction data (excluding auto-generated fields)
   * @param transactionData.investmentType - The type of investment (e.g., 'Stocks', 'Real Estate')
   * @param transactionData.installmentNumber - For installment payments, the number of the installment being paid
   * @returns The created transaction with all fields populated
   * 
   * @throws {Error} If the investment is not found or there are insufficient shares to sell
   * 
   * @example
   * // Example of a stock purchase
   * await investmentService.recordTransaction({
   *   investmentId: 'inv-123',
   *   securityId: 'stock-aapl',
   *   investmentType: 'Stocks',
   *   type: 'BUY',
   *   date: '2025-10-05',
   *   amount: 1000,
   *   quantity: 10,
   *   pricePerUnit: 100,
   *   fees: 10,
   *   currency: 'EGP',
   *   metadata: { note: 'Initial purchase' }
   * });
   * 
   * @example
   * // Example of a real estate installment payment
   * await investmentService.recordTransaction({
   *   investmentId: 'real-estate-123',
   *   investmentType: 'Real Estate',
   *   type: 'PAYMENT',
   *   installmentNumber: 1,
   *   date: '2025-10-05',
   *   amount: 5000,
   *   description: 'Monthly installment payment',
   *   currency: 'EGP'
   * });
   */
  private async recordTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    // Ensure required fields are present
    if (!transactionData.investmentId) {
      throw new Error('investmentId is required');
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

    return runTransaction(db, async (transaction: FirebaseTransaction) => {
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
          const updatedInstallments = realEstateInvestment.installments.map(installment => {
            if (installment.number === transactionData.installmentNumber) {
              return {
                ...installment,
                status: 'Paid',
                paymentDate: now
              };
            }
            return installment;
          });

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
   * await investmentService.buy(
   *   'inv-123', 'stock-aapl', 10, 100, 10, '2025-10-05',
   *   { note: 'Monthly investment' }
   * );
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
      investmentId,
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
   * @param quantity - Number of units/shares being sold
   * @param pricePerUnit - Price per unit
   * @param fees - Transaction fees
   * @param date - Transaction date (ISO string)
   * @param metadata - Additional transaction metadata
   * 
   * @example
   * // Record selling 5 shares at $120 each with $10 fees
   * await investmentService.sell(
   *   'inv-123', 'stock-aapl', 5, 120, 10, '2025-10-05',
   *   { note: 'Taking profits' }
   * );
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
      investmentId,
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
   * @param amount - The dividend amount
   * @param date - Dividend payment date (ISO string)
   * @param metadata - Additional metadata about the dividend
   * 
   * @example
   * // Record a $50 dividend payment
   * await investmentService.addDividend(
   *   'inv-123', 'stock-aapl', 50, '2025-10-05',
   *   { period: 'Q3 2025', taxWithheld: 5 }
   * );
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
      investmentId,
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
   * @param installmentNumber - The number of the installment being paid
   * @param amount - The payment amount (positive for income, negative for expense)
   * @param date - Payment date (ISO string)
   * @param metadata - Additional payment metadata
   * 
   * @example
   * // Record a $100 payment for investment fees
   * await investmentService.pay(
   *   'inv-123', 1, -100, '2025-10-05',
   *   { description: 'Annual management fee' }
   * );
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
      investmentId,
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
}
