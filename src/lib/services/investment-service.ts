import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  query,
  collection,
  getDocs,
  deleteDoc,
  setDoc,
  updateDoc,
  where,
  onSnapshot,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import {
  CurrencyCode,
  Transaction,
  InvestmentType,
  Investment,
  RealEstateInvestment,
  isRealEstateInvestment,
  isDebtInstrumentInvestment,
  isGoldInvestment,
  isSecurityInvestment,
  isCurrencyInvestment,
  InvestmentData,
  isStockInvestment,
  isDebtFundInvestment,
  isCurrencyFundInvestment,
  isRealEstateFundInvestment,
} from "@/lib/types";
import { eventBus } from "./events";

import { INVESTMENTS_COLLECTION_PATH } from "@/lib/constants";
import { formatPath } from "@/lib/utils";
import { masterDataService } from "./master-data-service";
import { calcDebtMonthlyInterest } from "../financial-utils";
import { dateConverter } from "@/lib/firestore-converters";

type InvestmentUpdate = {
  totalShares: number;
  totalInvested: number;
  averagePurchasePrice: number;
  isClosed: boolean;
};

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
      `${formatPath(INVESTMENTS_COLLECTION_PATH, { userId: this.userId })}/${investmentId}`,
    ).withConverter(dateConverter);
  }

  /**
   * Gets a reference to the user's investments collection
   * @private
   */
  private getInvestmentsCollection() {
    return collection(
      db,
      formatPath(INVESTMENTS_COLLECTION_PATH, { userId: this.userId }),
    ).withConverter(dateConverter);
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
    investmentData: InvestmentData<T>,
  ): Promise<T & { id: string }> {
    const {
      securityId,
      type,
      quantity = 0,
      pricePerUnit = 0,
      fees = 0,
      currency = "EGP",
      firstPurchaseDate = new Date().toISOString(),
    } = investmentData as any;
    const amount = quantity * pricePerUnit + fees;

    // Validate required fields for security types
    if (type === "Securities" && !securityId) {
      throw new Error("securityId is required for stock and fund investments");
    }

    const now = new Date();
    let investment: any;
    let investmentId = uuidv4();

    // Create base investment with required fields
    investment = {
      ...investmentData,
      id: investmentId,
      securityId: securityId || "",
      currency,
      firstPurchaseDate,
      lastUpdated: now,
      totalShares: quantity,
      totalInvested: amount,
      averagePurchasePrice: quantity > 0 ? amount / quantity : 0,
      isClosed: false,
      fundType: investmentData.fundType?.trim() || null,
    };

    // Handle type-specific fields
    if (isRealEstateInvestment(investment)) {
      // Handle real estate specific fields if needed
      if (investment.installmentFrequency) {
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
    await setDoc(investmentRef, investment);
    await eventBus.publish({
      type: "investment:added",
      transaction: {
        sourceId: investmentId,
        sourceType: "Investment",
        securityId,
        type: "BUY",
        date: investment.firstPurchaseDate,
        amount,
        quantity,
        pricePerUnit,
        averagePurchasePrice: investment.averagePurchasePrice,
        fees,
        currency,
        metadata: {
          sourceSubType: investment.type,
          ...investment,
        },
      } as Transaction,
    });

    return investment as T & { id: string };
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
      | "installmentNumber"
    > & { investmentType: InvestmentType },
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
        //in Sell transactions the qauntity is nagative value so we used +
        totalShares += quantity;
        // For real estate, we don't reduce totalInvested when selling
        if (investmentType !== "Real Estate") {
          totalInvested += current.averagePurchasePrice * quantity;
        }
        break;

      case "PAYMENT":
        totalInvested += amount;
        break;
    }

    return {
      totalShares,
      totalInvested,
      isClosed: totalShares === 0,
      averagePurchasePrice: totalShares > 0 ? totalInvested / totalShares : 0,
    };
  }

  private async updateInvestment(
    transactionData: Omit<
      Transaction,
      | "id"
      | "createdAt"
      | "profitOrLoss"
      | "averagePurchasePrice"
      | "sourceType"
      | "metadata"
    > & { investmentType: InvestmentType },
  ): Promise<Investment> {
    const investmentRef = this.getInvestmentRef(transactionData.sourceId);
    const now = new Date();

    const investmentDoc = await getDoc(investmentRef);

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
        type: transactionData.type,
        quantity: transactionData.quantity || 0,
        amount: transactionData.amount || 0,
        pricePerUnit: transactionData.pricePerUnit || 0,
        fees: transactionData.fees || 0,
        investmentType: investment.type,
        installmentNumber: transactionData.installmentNumber,
      },
    );

    // Prepare update data
    const updateData: any = {
      totalShares: update.totalShares,
      totalInvested: update.totalInvested,
      averagePurchasePrice: update.averagePurchasePrice,
      isClosed: update.isClosed,
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
    await updateDoc(investmentRef, updateData);

    const updatedInvestment = {
      ...investment,
      ...updateData,
    };

    const { investmentType, ...restTransactionData } = transactionData;

    await eventBus.publish({
      type: "investment:updated",
      transaction: {
        ...restTransactionData,
        sourceType: "Investment",
        averagePurchasePrice: update.averagePurchasePrice,
        metadata: {
          sourceSubType: investmentType,
          ...updatedInvestment,
        },
      } as Transaction,
    });

    return updatedInvestment;
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
    date: Date,
  ): Promise<Investment> {
    const amount = quantity * pricePerUnit + fees;

    return this.updateInvestment({
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
    date: Date,
  ): Promise<Investment> {
    const amount = quantity * pricePerUnit - fees;

    return this.updateInvestment({
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
    date: Date,
  ): Promise<Investment> {
    return this.updateInvestment({
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
    quantity: number,
    date: Date,
  ): Promise<Investment> {
    return this.updateInvestment({
      sourceId: investmentId,
      securityId,
      investmentType,
      type: "DIVIDEND",
      date,
      amount,
      quantity,
      pricePerUnit: 0,
      fees: 0,
      currency: "EGP",
    });
  }

  async getOpenedInvestments(): Promise<Investment[]> {
    const q = query(
      this.getInvestmentsCollection(),
      where("isClosed", "==", false),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Investment);
  }

  /**
   * Subscribes to opened investments (`isClosed == false`) and returns
   * an unsubscribe function. The callback receives the current list of
   * investments on any change.
   */
  subscribeToOpenedInvestments(
    callback: (investments: Investment[]) => void,
  ): () => void {
    const q = query(
      this.getInvestmentsCollection(),
      where("isClosed", "==", false),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
      const investments = querySnapshot.docs.map(
        (doc: any) => doc.data() as Investment,
      );
      callback(investments);
    });

    return unsubscribe;
  }

  /**
   * Calculates the total unrealized profit or loss for all investments
   * by get current market price of each investment (if gold get from goldMarketPrices collection and if securities get from listedSecurities collection and if currencies get from exchangeRates collection) and multiply it with shares count
   * then subtract total invested
   * @returns Promise that resolves with the total unrealized profit or loss
   */
  async calculateUnrealizedPnL(investments: Investment[]): Promise<{
    [key: string]: { [key: string]: number };
  }> {
    const goldMarketPrices = await masterDataService.getGoldMarketPrices();

    let totalUnrealizedPnL = 0;
    let totalsInvested = 0;

    let unrealizedPnLStocks = 0;
    let totalInvestedStocks = 0;

    let unrealizedPnLDebt = 0;
    let totalInvestedDebt = 0;
    let totalDirectDebtInvested = 0;
    let totalFundDebtInvested = 0;
    let totalProjectedDebtMonthlyInterest = 0;

    let unrealizedPnLRealEstate = 0;
    let totalInvestedRealEstate = 0;

    let unrealizedPnLCurrency = 0;
    let totalInvestedCurrency = 0;

    let unrealizedPnLGold = 0;
    let totalInvestedGold = 0;

    // Use a for..of loop so we can await async operations for each investment
    for (const investment of investments) {
      let currentMarketPrice = investment.averagePurchasePrice;
      let unrealizedPnL = 0;
      const totalShares = investment.totalShares;
      const totalInvested = investment.totalInvested;

      if (isGoldInvestment(investment)) {
        currentMarketPrice =
          goldMarketPrices[investment.goldType] ??
          investment.averagePurchasePrice;

        unrealizedPnL = currentMarketPrice * totalShares - totalInvested;
        unrealizedPnLGold += unrealizedPnL;
        totalInvestedGold += totalInvested;
      } else if (isCurrencyInvestment(investment)) {
        currentMarketPrice = await masterDataService.getExchangeRate(
          investment.currencyCode,
          investment.currency,
        );

        unrealizedPnL = currentMarketPrice * totalShares - totalInvested;
        unrealizedPnLCurrency += unrealizedPnL;
        totalInvestedCurrency += totalInvested;
      } else if (isRealEstateInvestment(investment)) {
        totalInvestedRealEstate += totalInvested;
      } else if (isDebtInstrumentInvestment(investment)) {
        totalInvestedDebt += totalInvested;
        totalProjectedDebtMonthlyInterest +=
          calcDebtMonthlyInterest(investment);
        totalDirectDebtInvested += totalInvested;
      } else if (isSecurityInvestment(investment)) {
        const security = await masterDataService.getSecurity(
          investment.securityId,
        );
        currentMarketPrice = security.price;

        unrealizedPnL = currentMarketPrice * totalShares - totalInvested;
        if (isStockInvestment(investment)) {
          unrealizedPnLStocks += unrealizedPnL;
          totalInvestedStocks += totalInvested;
        } else if (isDebtFundInvestment(investment)) {
          unrealizedPnLDebt += unrealizedPnL;
          totalInvestedDebt += totalInvested;
          totalFundDebtInvested += totalInvested;
        } else if (isCurrencyFundInvestment(investment)) {
          unrealizedPnLCurrency += unrealizedPnL;
          totalInvestedCurrency += totalInvested;
        } else if (isRealEstateFundInvestment(investment)) {
          unrealizedPnLRealEstate += unrealizedPnL;
          totalInvestedRealEstate += totalInvested;
        }
      }

      totalUnrealizedPnL += unrealizedPnL;
      totalsInvested += totalInvested;
    }
    return {
      portfolio: {
        unrealizedPnL: totalUnrealizedPnL,
        totalInvested: totalsInvested,
        unrealizedPnLPercent:
          totalsInvested === 0
            ? 0
            : (totalUnrealizedPnL / totalsInvested) * 100,
      },
      stocks: {
        unrealizedPnL: unrealizedPnLStocks,
        totalInvested: totalInvestedStocks,
        unrealizedPnLPercent:
          totalInvestedStocks === 0
            ? 0
            : (unrealizedPnLStocks / totalInvestedStocks) * 100,
      },
      currencies: {
        unrealizedPnL: unrealizedPnLCurrency,
        totalInvested: totalInvestedCurrency,
        unrealizedPnLPercent:
          totalInvestedCurrency === 0
            ? 0
            : (unrealizedPnLCurrency / totalInvestedCurrency) * 100,
      },
      gold: {
        unrealizedPnL: unrealizedPnLGold,
        totalInvested: totalInvestedGold,
        unrealizedPnLPercent:
          totalInvestedGold === 0
            ? 0
            : (unrealizedPnLGold / totalInvestedGold) * 100,
      },
      debt: {
        unrealizedPnL: unrealizedPnLDebt,
        totalInvested: totalInvestedDebt,
        totalDirectInvested: totalDirectDebtInvested,
        totalFundInvested: totalFundDebtInvested,
        totalProjectedDebtMonthlyInterest: totalProjectedDebtMonthlyInterest,
        totalProjectedDebtAnnualInterest:
          totalProjectedDebtMonthlyInterest * 12,
        unrealizedPnLPercent: unrealizedPnLDebt / totalFundDebtInvested,
      },
      realEstate: {
        unrealizedPnL: unrealizedPnLRealEstate,
        totalInvested: totalInvestedRealEstate,
        unrealizedPnLPercent:
          totalInvestedRealEstate === 0
            ? 0
            : (unrealizedPnLRealEstate / totalInvestedRealEstate) * 100,
      },
    };
  }

  async handleMaturedDebtInstruments(): Promise<void> {
    const investments = await this.getOpenedInvestments();
    investments.forEach(async (investment: Investment) => {
      if (isDebtInstrumentInvestment(investment)) {
        const maturityDate = new Date(investment.maturityDate);
        const today = new Date();
        if (maturityDate <= today) {
          investment.isClosed = true;
          investment.maturedOn = maturityDate;
          await this.updateInvestment({
            sourceId: investment.id,
            investmentType: investment.type,
            type: "MATURED_DEBT",
            date: maturityDate,
            amount: investment.totalInvested,
            quantity: investment.totalShares,
            pricePerUnit: investment.averagePurchasePrice,
            fees: 0,
            currency: "EGP",
          });
        }
      }
    });
  }

  async deleteInvestment(id: string): Promise<void> {
    const docRef = this.getInvestmentRef(id);
    await deleteDoc(docRef);
    await eventBus.publish({
      type: "investment:deleted",
      transaction: {
        sourceId: id,
      } as Transaction,
    });
  }

  async editInvestment(
    investmentId: string,
    investment: Partial<Investment>,
  ): Promise<Investment> {
    const docRef = this.getInvestmentRef(investmentId);
    await updateDoc(docRef, { ...investment });
    return (await this.getInvestment(investmentId))!;
  }
}
