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
  RealEstateInvestment,
  Transaction,
  isRealEstateInvestment,
} from "@/lib/investment-types";
import { CurrencyCode, InvestmentType } from "../types";
import { TransactionService } from "./transaction-service";
import { eventBus } from "./events";

const INVESTMENTS_COLLECTION = "investments";

type InvestmentUpdate = {
  totalShares: number;
  totalInvested: number;
  averagePurchasePrice: number;
};

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
   * Creates a new investment and records the initial purchase transaction.
   *
   * This method handles the creation of a new investment with proper initialization of all required fields,
   * including automatic calculation of investment metrics. It also creates the initial purchase transaction
   * and handles type-specific initialization for different investment types.
   *
   * @template T - The specific investment type (e.g., RealEstateInvestment, SecurityInvestment)
   * @param {Object} investmentData - The investment data including type-specific properties
   * @param {string} [investmentData.securityId] - Required for security type investments
   * @param {number} [investmentData.quantity=0] - Number of units/shares being purchased
   * @param {number} [investmentData.pricePerUnit=0] - Price per unit at time of purchase
   * @param {number} [investmentData.fees=0] - Any additional fees associated with the purchase
   * @param {CurrencyCode} [investmentData.currency=EGP] - Currency of the investment
   * @returns {Promise<T & { id: string }>} The newly created investment with all required fields populated
   * @throws {Error} If required fields are missing (e.g., securityId for security investments)
   *
   * @example
   * // Create a new stock investment
   * const newStock = await investmentService.buyNew<SecurityInvestment>({
   *   type: 'Securities',
   *   name: 'Apple Inc.',
   *   securityId: 'AAPL',
   *   tickerSymbol: 'AAPL',
   *   quantity: 10,
   *   pricePerUnit: 150.50,
   *   fees: 10
   * });
   *
   * @example
   * // Create a new real estate investment with installments
   * const property = await investmentService.buyNew<RealEstateInvestment>({
   *   type: 'Real Estate',
   *   name: 'Luxury Apartment',
   *   propertyType: 'Apartment',
   *   totalInstallmentPrice: 5000000,
   *   installmentAmount: 50000,
   *   installmentFrequency: 'Monthly',
   *   downPayment: 1000000,
   *   quantity: 1,
   *   pricePerUnit: 5000000
   * });
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
  ): Promise<T & { id: string }> {
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
        await eventBus.publish({
          type: "investment:added",
          transaction: {
            sourceId: investmentId,
            securityId,
            type: "BUY",
            amount,
            quantity,
            pricePerUnit,
            fees,
            currency,
          } as Transaction,
        });

        return investment as T & { id: string };
      },
    );
  }

  /**
   * Calculates the updated investment values based on a transaction.
   *
   * @param current - Current investment state
   * @param transaction - The transaction being processed
   * @returns Updated investment values
   */
  private calculateInvestmentUpdate(
    current: {
      totalShares: number;
      totalInvested: number;
      averagePurchasePrice: number;
    },
    transaction: Pick<
      Transaction,
      | "type"
      | "quantity"
      | "amount"
      | "pricePerUnit"
      | "fees"
      | "investmentType"
      | "installmentNumber"
    >,
  ): InvestmentUpdate {
    const { type, quantity = 0, amount = 0, investmentType } = transaction;
    let { totalShares, totalInvested } = current;

    switch (type) {
      case "BUY":
        totalShares += quantity;
        totalInvested += amount;
        break;

      case "SELL":
        if (quantity > current.totalShares) {
          throw new Error("Not enough shares to sell");
        }
        totalShares -= quantity;
        // For real estate, we don't reduce totalInvested when selling
        if (investmentType !== "Real Estate") {
          totalInvested -= current.averagePurchasePrice * quantity;
        }
        break;

      case "PAYMENT":
        totalInvested += amount;
        break;
    }

    return {
      totalShares,
      totalInvested,
      averagePurchasePrice: totalShares > 0 ? totalInvested / totalShares : 0,
    };
  }

  private async updateInvestment(
    transactionData: Omit<
      Transaction,
      "id" | "createdAt" | "profitOrLoss" | "averagePurchasePrice"
    >,
  ): Promise<Investment> {
    const investmentRef = this.getInvestmentRef(transactionData.sourceId);
    const now = new Date().toISOString();
    let {
      type,
      quantity = 0,
      amount = 0,
      pricePerUnit = 0,
      fees = 0,
    } = transactionData;
    if (amount == 0) {
      amount = pricePerUnit * quantity + fees;
    }

    pricePerUnit = amount / quantity;

    return runFirestoreTransaction(db, async (firestoreTransaction) => {
      const investmentDoc = await firestoreTransaction.get(investmentRef);

      if (!investmentDoc.exists()) {
        throw new Error("Investment not found");
      }

      const investment = investmentDoc.data() as any;
      const update = this.calculateInvestmentUpdate(
        {
          totalShares: investment.totalShares || 0,
          totalInvested: investment.totalInvested || 0,
          averagePurchasePrice: investment.averagePurchasePrice || 0,
        },
        {
          type,
          quantity,
          amount,
          pricePerUnit,
          fees,
          investmentType: investment.type,
          installmentNumber: transactionData.installmentNumber,
        },
      );

      // Prepare update data
      const updateData: any = {
        totalShares: update.totalShares,
        totalInvested: update.totalInvested,
        averagePurchasePrice: update.averagePurchasePrice,
        lastUpdated: now,
      };

      // If this is a payment for a real estate installment, mark it as paid
      if (
        transactionData.type === "PAYMENT" &&
        transactionData.investmentType === "Real Estate" &&
        transactionData.installmentNumber !== undefined
      ) {
        const realEstateInvestment = investment as RealEstateInvestment;
        if (realEstateInvestment.installments) {
          const updatedInstallments = realEstateInvestment.installments.map(
            (installment) => ({
              ...installment,
              ...(installment.number === transactionData.installmentNumber
                ? {
                    status: "Paid",
                    paymentDate: now,
                  }
                : {}),
            }),
          );

          updateData.installments = updatedInstallments;
        }
      }

      // Update the investment
      firestoreTransaction.update(investmentRef, updateData);

      await eventBus.publish({
        type: "investment:updated",
        transaction: {
          ...transactionData,
          averagePurchasePrice: update.averagePurchasePrice,
        } as Transaction,
      });
      //TODO: add investment updateData
      return investment;
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
    metadata: Record<string, any> = {},
  ): Promise<Investment> {
    const amount = quantity * pricePerUnit + fees;

    return this.updateInvestment({
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
  ): Promise<Investment> {
    const amount = quantity * pricePerUnit - fees;

    return this.updateInvestment({
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
  ): Promise<Investment> {
    return this.updateInvestment({
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
  ): Promise<Investment> {
    return this.updateInvestment({
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
}
