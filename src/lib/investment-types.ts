import {
  CurrencyCode,
  InvestmentType,
  DebtSubType,
  PropertyType,
  GoldType,
  FundType,
} from "./types";

export type TransactionType =
  | "BUY" // For purchasing any asset (stocks, gold, currency, etc.)
  | "PAYMENT" // For installments, fees, or other payments
  | "EXPENSE" // For expenses
  | "SELL" // For selling any asset
  | "DIVIDEND" // For dividend/interest income
  | "INCOME" // For receiving income;
  | "INTEREST" // For interest income
  | "MATURED_DEBT"; // For matured debt
//TODO: review all fields in each investment type
export interface BaseInvestment {
  id: string;
  userId: string;
  type: InvestmentType;
  name: string;
  totalShares: number; // Current number of shares/units held
  totalInvested: number; // Total amount invested (cost basis)
  averagePurchasePrice: number; // Weighted average purchase price
  firstPurchaseDate: string; // First purchase date (YYYY-MM-DD)
  lastUpdated: string; // Last update timestamp
  currency: CurrencyCode;
  fundType?: FundType;
  metadata?: {
    // Type-specific metadata
    [key: string]: any;
  };
}

export interface SecurityInvestment extends BaseInvestment {
  type: "Securities";
  securityId: string;
}

export interface GoldInvestment extends BaseInvestment {
  type: "Gold";
  goldType: GoldType;
  weightInGrams: number; //weight in grams per gold type
}

export interface CurrencyInvestment extends BaseInvestment {
  type: "Currencies";
  currencyCode: string;
  //TODO: remove it because we only need it in the transaction and in the investment we store the total invested amount
  exchangeRateAtPurchase?: number;
}

export interface Installment {
  number: number;
  chequeNumber?: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Unpaid";
  description?: string;
  isMaintenance?: boolean;
  isDownPayment?: boolean;
}

export interface RealEstateInvestment extends BaseInvestment {
  type: "Real Estate";
  propertyType: PropertyType;
  propertyAddress?: string;
  installmentFrequency?: "Monthly" | "Quarterly" | "Yearly";
  installmentAmount?: number;
  totalInstallmentPrice?: number; // New: total price at end of all installments
  installmentStartDate?: string; // NEW FIELD
  installmentEndDate?: string; // New: end date of all installments
  downPayment?: number; // NEW FIELD
  maintenanceAmount?: number; // NEW FIELD
  maintenancePaymentDate?: string; // NEW FIELD
  installments?: Array<Installment>;
  builtUpArea?: number; // Area in square meters
  hasGarden?: boolean; // Whether the property has a garden
}

export interface DebtInstrumentInvestment extends BaseInvestment {
  type: "Debt Instruments";
  debtSubType: DebtSubType;
  issuer: string;
  interestRate: number;
  maturityDate: string;
  interestFrequency: "Monthly" | "Quarterly" | "Yearly";
}

export type Investment =
  | SecurityInvestment
  | GoldInvestment
  | CurrencyInvestment
  | RealEstateInvestment
  | DebtInstrumentInvestment;

export interface Transaction {
  id: string;
  userId: string;
  investmentType?: InvestmentType;
  sourceId: string;
  securityId?: string;
  installmentNumber?: number;
  type: TransactionType;
  date: string; // ISO date string
  amount: number; // Total transaction amount (signed: positive for in, negative for out)
  quantity: number; // Number of shares/units (signed: positive for buy, negative for sell)
  pricePerUnit: number; // Price per share/unit
  averagePurchasePrice: number; // Average purchase price
  profitOrLoss?: number; // Profit or loss from transaction
  fees: number; // Transaction fees
  currency: CurrencyCode;
  description?: string;
  metadata: {
    // Additional type-specific data
    [key: string]: any; // Allow other metadata
  };
  createdAt: string; // ISO timestamp
}

// Type guards
export function isSecurityInvestment(
  investment: Investment,
): investment is SecurityInvestment {
  return investment.type === "Securities";
}

export function isGoldInvestment(
  investment: Investment,
): investment is GoldInvestment {
  return investment.type === "Gold";
}

export function isCurrencyInvestment(
  investment: Investment,
): investment is CurrencyInvestment {
  return investment.type === "Currencies";
}

export function isRealEstateInvestment(
  investment: Investment,
): investment is RealEstateInvestment {
  return investment.type === "Real Estate";
}

export function isDebtInstrumentInvestment(
  investment: Investment,
): investment is DebtInstrumentInvestment {
  return investment.type === "Debt Instruments";
}
