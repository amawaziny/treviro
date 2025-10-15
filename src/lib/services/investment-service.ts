import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  runTransaction as runFirestoreTransaction,
  Transaction as FirestoreTransaction,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import {
  Investment,
  Transaction,
  isRealEstateInvestment,
} from "@/lib/investment-types";
import { CurrencyCode, InvestmentType } from "../types";
import { TransactionService } from "./transaction-service";

const INVESTMENTS_COLLECTION = "investments";

/**
 * Service for managing investments and transactions in Firestore.
 * Handles all CRUD operations for investments and their associated transactions.
 */
export class InvestmentService {
  private userId: string;
  private transactionService: TransactionService;

  /**
   * Creates a new InvestmentService instance for a specific user.
   * @param userId - The ID of the user to manage investments for
   */
  constructor(userId: string) {
    this.userId = userId;
    this.transactionService = new TransactionService(userId);
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
   * Gets a reference to a specific investment document
   * @param investmentId - The ID of the investment
   * @private
   */
  private getInvestmentRef(investmentId: string) {
    return doc(
      db,
      `users/${this.userId}/${INVESTMENTS_COLLECTION}/${investmentId}`,
    );
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
    investmentData: Omit<
      T,
      | "id"
      | "lastUpdated"
      | "totalShares"
      | "totalInvested"
      | "averagePurchasePrice"
      | "currency"
      | "userId"
    > & {
      type: T["type"];
      securityId?: string;
      currency?: CurrencyCode;
      quantity?: number;
      pricePerUnit?: number;
      fees?: number;
    },
  ): Promise<{
    investment: T & { id: string };
    transaction: Transaction | null;
  }> {
    const {
      securityId,
      type,
      quantity = 0,
      pricePerUnit = 0,
      fees = 0,
      currency = "EGP",
    } = investmentData as any;
    const amount = quantity * pricePerUnit + fees;

    // Validate required fields for security types
    if (type === "Securities" && !securityId) {
      throw new Error("securityId is required for stock and fund investments");
    }

    return runFirestoreTransaction(
      db,
      async (firestoreTransaction: FirestoreTransaction) => {
        const now = new Date().toISOString();
        let investment: any;
        let investmentId = uuidv4();

        // Create base investment with required fields
        investment = {
          ...investmentData,
          id: investmentId,
          userId: this.userId,
          securityId: securityId || "",
          currency,
          lastUpdated: now,
          totalShares: quantity,
          totalInvested: amount,
          averagePurchasePrice: quantity > 0 ? amount / quantity : 0,
          metadata: {
            ...(investmentData.metadata || {}),
          },
        };

        // Handle type-specific fields
        if (isRealEstateInvestment(investment)) {
          // Handle real estate specific fields if needed
          if (investment.metadata?.installmentFrequency) {
            const {
              generateInstallmentSchedule,
            } = require("@/lib/installment-utils");
            const installments = generateInstallmentSchedule(investment, []);
            if (installments?.length > 0) {
              investment.installments = installments;
            }
          }
        }

        // Save the new investment
        const investmentRef = this.getInvestmentRef(investmentId);
        firestoreTransaction.set(investmentRef, investment);

        let transactionData: Transaction | null = null;
        if (!isRealEstateInvestment(investment)) {
          transactionData = await this.buy(
            investmentId,
            securityId,
            type,
            quantity,
            pricePerUnit,
            fees,
            currency,
          );
        }

        return {
          investment: investment as T & { id: string },
          transaction: transactionData,
        };
      },
    );
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
    metadata: Record<string, any> = {},
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit + fees;

    return this.transactionService.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      securityId,
      investmentType,
      type: "BUY",
      date,
      amount,
      quantity,
      pricePerUnit,
      fees,
      currency: "EGP",
      metadata,
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
    metadata: Record<string, any> = {},
  ): Promise<Transaction> {
    const amount = quantity * pricePerUnit - fees;

    return this.transactionService.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      securityId,
      investmentType,
      type: "SELL",
      date,
      amount: -amount, // Negative amount for sales
      quantity: -quantity, // Negative quantity for sales
      pricePerUnit,
      fees,
      currency: "EGP",
      metadata,
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
    metadata: Record<string, any> = {},
  ): Promise<Transaction> {
    return this.transactionService.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      securityId,
      investmentType,
      type: "DIVIDEND",
      date,
      amount,
      quantity: 0, // No change in share count
      pricePerUnit: 0,
      fees: 0,
      currency: "EGP",
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
    metadata: Record<string, any> = {},
  ): Promise<Transaction> {
    return this.transactionService.recordTransaction({
      userId: this.userId,
      sourceId: investmentId,
      investmentType,
      installmentNumber,
      type: "PAYMENT",
      date,
      amount: -amount, // Negative for outgoing payment
      quantity: 0,
      pricePerUnit: 0,
      fees: 0,
      currency: "EGP",
      metadata: {
        ...metadata,
      },
    });
  }
}
