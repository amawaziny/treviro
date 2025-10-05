import { CurrencyCode, InvestmentType, DebtSubType, PropertyType, GoldType } from "./types";

export type TransactionType = 
  | 'BUY'      // For purchasing any asset (stocks, gold, currency, etc.)
  | 'SELL'     // For selling any asset
  | 'DIVIDEND' // For dividend/interest income
  | 'PAYMENT'  // For installments, fees, or other payments
  | 'TRANSFER'; // For transferring between accounts or converting between assets

export interface BaseInvestment {
  id: string;
  userId: string;
  securityId: string;
  type: InvestmentType;
  name: string;
  totalShares: number; // Current number of shares/units held
  totalInvested: number; // Total amount invested (cost basis)
  averagePurchasePrice: number; // Weighted average purchase price
  firstPurchaseDate: string; // First purchase date (YYYY-MM-DD)
  lastUpdated: string; // Last update timestamp
  currentValue?: number; // Current market value
  currency: CurrencyCode;
  metadata: {
    // Type-specific metadata
    [key: string]: any;
  };
}

export interface SecurityInvestment extends BaseInvestment {
  type: 'Stocks';
  tickerSymbol: string;
  metadata: {
    sector?: string;
    market?: string;
  };
}

export interface GoldInvestment extends BaseInvestment {
  type: 'Gold';
  goldType: GoldType;
  metadata: {
    weightInGrams: number;
  };
}

export interface CurrencyInvestment extends BaseInvestment {
  type: 'Currencies';
  currencyCode: string;
  metadata: {
    exchangeRateAtPurchase: number;
  };
}

export interface RealEstateInvestment extends BaseInvestment {
  type: 'Real Estate';
  metadata: {
    propertyType: PropertyType;
    propertyAddress?: string;
    installmentFrequency?: 'Monthly' | 'Quarterly' | 'Yearly';
    installmentAmount?: number;
    totalInstallmentPrice?: number;
  };
}

export interface DebtInstrumentInvestment extends BaseInvestment {
  type: 'Debt Instruments';
  metadata: {
    debtSubType: DebtSubType;
    issuer: string;
    interestRate: number;
    maturityDate: string;
    interestFrequency: 'Monthly' | 'Quarterly' | 'Yearly';
  };
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
  investmentId: string;
  securityId: string;
  type: TransactionType;
  date: string; // ISO date string
  amount: number; // Total transaction amount (signed: positive for in, negative for out)
  quantity: number; // Number of shares/units (signed: positive for buy, negative for sell)
  pricePerUnit: number; // Price per share/unit
  fees: number; // Transaction fees
  currency: CurrencyCode;
  description?: string;
  metadata: {
    // Additional type-specific data
    sourceInvestmentId?: string; // For TRANSFER type
    targetInvestmentId?: string; // For TRANSFER type
    paymentMethod?: string;     // For PAYMENT type
    reference?: string;         // For any reference ID
    [key: string]: any;         // Allow other metadata
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Type guards
export function isSecurityInvestment(investment: Investment): investment is SecurityInvestment {
  return investment.type === 'Stocks';
}

export function isGoldInvestment(investment: Investment): investment is GoldInvestment {
  return investment.type === 'Gold';
}

export function isCurrencyInvestment(investment: Investment): investment is CurrencyInvestment {
  return investment.type === 'Currencies';
}

export function isRealEstateInvestment(investment: Investment): investment is RealEstateInvestment {
  return investment.type === 'Real Estate';
}

export function isDebtInstrumentInvestment(investment: Investment): investment is DebtInstrumentInvestment {
  return investment.type === 'Debt Instruments';
}
