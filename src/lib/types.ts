export type CurrencyCode = "EGP" | "USD";

export type InvestmentType =
  | "Real Estate"
  | "Gold"
  | "Debt Instruments"
  | "Currencies"
  | "Securities";
export type IncomeType =
  | "Profit Share"
  | "Bonus"
  | "Gift"
  | "Rental Income"
  | "Freelance"
  | "Other";
export type ExpenseType = "Credit Card" | "Other";
export type FundType =
  | "Gold"
  | "Debt"
  | "Real Estate"
  | "Stock"
  | "Equity"
  | "REIT"
  | "Money Market"
  | "Mixed"
  | "Other"
  | "Cash"
  | "Balanced"
  | "Fixed Income"
  | "MM"
  | string;

export interface BaseInvestment {
  id: string;
  type: InvestmentType;
  name: string;
  totalShares: number; // Current number of shares/units held
  totalInvested: number; // Total amount invested (cost basis)
  averagePurchasePrice: number; // Weighted average purchase price
  firstPurchaseDate: string; // First purchase date (YYYY-MM-DD)
  lastUpdated: string; // Last update timestamp
  currency: CurrencyCode;
  fundType?: FundType;
  isClosed: boolean;
  metadata?: {
    // Type-specific metadata
    [key: string]: any;
  };
}

export interface SecurityInvestment extends BaseInvestment {
  type: "Securities";
  securityId: string;
}

export type GoldType = "K24" | "K21" | "Pound" | "Ounce";
export interface GoldInvestment extends BaseInvestment {
  type: "Gold";
  goldType: GoldType;
  quantityInGrams: number; //weight in grams per gold type
}

export interface CurrencyInvestment extends BaseInvestment {
  type: "Currencies";
  currencyCode: string;
}

export type PropertyType = "Residential" | "Touristic" | "Commercial" | "Land";

export type Frequency = "Monthly" | "Quarterly" | "Yearly";

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
  totalPrice?: number; // total price at end of all installments
  builtUpArea?: number; // Area in square meters
  hasGarden?: boolean; // Whether the property has a garden
  downPayment?: number;
  maintenanceAmount?: number;
  maintenancePaymentDate?: string;
  installmentFrequency?: Frequency;
  installmentAmount?: number;
  firstInstallmentDate: string;
  lastInstallmentDate: string;
  installments?: Array<Installment>;
}

export type DebtSubType = "Certificate" | "Treasury Bill" | "Bond" | "Other";

export interface DebtInstrumentInvestment extends BaseInvestment {
  type: "Debt Instruments";
  debtSubType: DebtSubType;
  issuer: string;
  interestRate: number;
  maturityDate: string;
  interestFrequency: Frequency;
  interestAmount: number; // projected interest amount
  monthlyInterestAmount: number; // projected monthly interest amount
  maturedOn?: string; // Date when the instrument matured (YYYY-MM-DD)
}

export type Investment =
  | SecurityInvestment
  | GoldInvestment
  | CurrencyInvestment
  | RealEstateInvestment
  | DebtInstrumentInvestment;

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

export type FinancialRecord =
  | IncomeRecord
  | ExpenseRecord
  | FixedEstimateRecord;

// Base interface that enforces common fields across all record types
export interface BaseRecord {
  recordType: "Income" | "Expense" | "Fixed Estimate";
  date?: string;
  type: IncomeType | ExpenseType | FixedEstimateType;
  id: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

// Extend the record interfaces to include BaseRecord
export interface IncomeRecord extends BaseRecord {
  recordType: "Income";
  type: IncomeType;
  source?: string;
  isRecurring?: boolean;
  recurrencePeriod?: string;
}

export interface ExpenseRecord extends BaseRecord {
  recordType: "Expense";
  type: ExpenseType;
  isInstallment?: boolean;
  numberOfInstallments?: number;
  _originalAmount?: number;
  _requiredAmount?: number;
  installmentMonthIndex?: number;
}

export interface FixedEstimateRecord extends BaseRecord {
  recordType: "Fixed Estimate";
  type: FixedEstimateType;
  name?: string;
  period: FixedEstimatePeriod;
  isExpense: boolean;
}

export type FixedEstimateType =
  | "Salary"
  | "Zakat"
  | "Charity"
  | "Living Expenses"
  | "Other";
export type FixedEstimatePeriod = "Monthly" | "Quarterly" | "Yearly";

export interface ListedSecurity {
  id: string;
  name: string;
  name_ar: string;
  symbol: string;
  logoUrl: string;
  price: number;
  currency: CurrencyCode;
  changePercent: number;
  market: string;
  securityType?: "Stock" | "Fund";
  fundType?: InvestmentType;
  description?: string;
  isin: string;
  sector: string;
  sectorAr: string;
  lastUpdated: string;
  listingDate: string;
  securityTypeAr: string;
  listedShares: number;
  tradedVolume: number;
  tradedValue: number;
  priceEarningRatio: number;
  dividendYield: number;
  cashDividends: string;
  marketCap: number;
  parValue: number;
  currencyAr: string;
  couponPaymentDate: string;
  couponNo: number;
}

export interface StockChartDataPoint {
  date: string;
  price: number;
}

export type StockChartTimeRange = "1W" | "1M" | "6M" | "1Y" | "5Y";

export type TransactionType =
  | "BUY" // For purchasing any asset (stocks, gold, currency, etc.)
  | "PAYMENT" // For installments, fees, or other payments
  | "EXPENSE" // For expenses
  | "SELL" // For selling any asset
  | "DIVIDEND" // For dividend income
  | "INCOME" // For receiving income;
  | "INTEREST" // For interest income
  | "MATURED_DEBT"; // For matured debt

export interface Transaction {
  id: string;
  sourceId: string;
  sourceType: "Investment" | "Income" | "Expense" | "Fixed Estimate";
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
    sourceSubType: string;
    // Additional type-specific data
    [key: string]: any; // Allow other metadata
  };
  createdAt: string; // ISO timestamp
}

export interface DashboardSummary {
  totalInvested: number;
  totalRealizedPnL: number;
  totalCashBalance: number;
  updatedAt?: string;
}

export interface DashboardSummaries extends DashboardSummary {
  totalUnrealizedPnL: number;
  marketTotalInvested: number;
  totalPortfolio: number;
}

export const defaultDashboardSummary: DashboardSummary = {
  totalInvested: 0,
  totalRealizedPnL: 0,
  totalCashBalance: 0,
  updatedAt: new Date().toISOString(),
};

export interface GoldMarketPrices {
  K24?: number;
  K21?: number;
  K22?: number;
  K18?: number;
  K14?: number;
  K12?: number;
  K10?: number;
  K9?: number;
  K8?: number;
  Pound?: number;
  Ounce?: number;
  OunceK21?: number;
  OunceK22?: number;
  OunceK18?: number;
  OunceK14?: number;
  OunceK12?: number;
  OunceK10?: number;
  OunceK9?: number;
  OunceK8?: number;
  source?: string;
  lastUpdated?: any;
}

export interface ExchangeRates {
  [key: string]: number;
}

export type AggregatedGoldHolding = {
  id: string;
  displayName: string;
  itemType: "physical" | "fund";
  logoUrl?: string;
  totalQuantity: number;
  averagePurchasePrice: number;
  totalCost: number;
  currentMarketPrice?: number;
  currency: CurrencyCode;
  fundDetails?: ListedSecurity;
  // fundInvestment?: SecurityInvestment;
  physicalGoldType?: GoldType;
};

export interface AggregatedCurrencyHolding {
  currencyCode: string;
  totalForeignAmount: number;
  totalCostInEGP: number;
  averagePurchaseRateToEGP: number;
  currentMarketRateToEGP?: number;
  currentValueInEGP?: number;
  profitOrLossInEGP?: number;
  profitOrLossPercentage?: number;
}

export interface AggregatedDebtHolding {
  id: string;
  itemType: "direct" | "fund";
  displayName: string;

  debtSubType?: DebtSubType;
  issuer?: string;
  interestRate?: number;
  maturityDate?: string;
  amountInvested?: number;
  purchaseDate?: string;
  maturityDay?: string;
  maturityMonth?: string;
  maturityYear?: string;
  projectedMonthlyInterest?: number;
  projectedAnnualInterest?: number;

  totalUnits?: number;
  averagePurchasePrice?: number;
  totalCost?: number;
  currentMarketPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  currency?: string;
  logoUrl?: string;

  fundDetails?: ListedSecurity;
  fundInvestment?: SecurityInvestment;
}

export type InvestmentTypePercentage = Record<InvestmentType, number>;

export interface AppSettings {
  financialYearStartMonth?: number;
  investmentTypePercentages?: InvestmentTypePercentage;
}

export const defaultAppSettings: AppSettings = {
  financialYearStartMonth: 1, // January
  investmentTypePercentages: {
    "Real Estate": 30,
    Securities: 25,
    "Debt Instruments": 20,
    Currencies: 10,
    Gold: 15,
  },
};
