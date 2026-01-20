import {
  isCurrencyRelatedFund,
  isDebtRelatedFund,
  isGoldRelatedFund,
  isRealEstateRelatedFund,
  isStockRelatedFund,
} from "./utils";

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

export type InvestmentData<T extends Investment = Investment> = Omit<
  T,
  | "id"
  | "lastUpdated"
  | "totalShares"
  | "totalInvested"
  | "averagePurchasePrice"
  | "currency"
  | "isClosed"
> & {
  type: InvestmentType;
  securityId?: string;
  currency?: CurrencyCode;
  quantity?: number;
  pricePerUnit?: number;
  fees?: number;
};

export interface BaseInvestment {
  id: string;
  type: InvestmentType;
  name: string;
  totalShares: number; // Current number of shares/units held
  totalInvested: number; // Total amount invested (cost basis)
  averagePurchasePrice: number; // Weighted average purchase price
  firstPurchaseDate: Date; // First purchase date (YYYY-MM-DD)
  lastUpdated: Date; // Last update timestamp
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
  dueDate: Date;
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
  maintenancePaymentDate?: Date;
  installmentFrequency?: Frequency;
  installmentAmount?: number;
  firstInstallmentDate: Date;
  lastInstallmentDate: Date;
  installments?: Array<Installment>;
}

export type DebtSubType = "Certificate" | "Treasury Bill" | "Bond" | "Other";

export interface DebtInstrumentInvestment extends BaseInvestment {
  type: "Debt Instruments";
  debtSubType: DebtSubType;
  issuer: string;
  interestRate: number;
  maturityDate: Date;
  interestFrequency: Frequency;
  interestAmount: number; // projected interest amount
  monthlyInterestAmount: number; // projected monthly interest amount
  maturedOn?: Date; // Date when the instrument matured (YYYY-MM-DD)
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

export function isStockInvestment(
  investment: Investment,
): investment is SecurityInvestment {
  return (
    investment.type === "Securities" &&
    (investment.fundType === undefined ||
      isStockRelatedFund(investment.fundType))
  );
}

export function isGoldFundInvestment(
  investment: Investment,
): investment is SecurityInvestment {
  return (
    investment.type === "Securities" &&
    investment.fundType !== undefined &&
    isGoldRelatedFund(investment.fundType)
  );
}

export function isDebtFundInvestment(
  investment: Investment,
): investment is SecurityInvestment {
  return (
    investment.type === "Securities" &&
    investment.fundType !== undefined &&
    isDebtRelatedFund(investment.fundType)
  );
}

export function isRealEstateFundInvestment(
  investment: Investment,
): investment is SecurityInvestment {
  return (
    investment.type === "Securities" &&
    investment.fundType !== undefined &&
    isRealEstateRelatedFund(investment.fundType)
  );
}

export function isCurrencyFundInvestment(
  investment: Investment,
): investment is SecurityInvestment {
  return (
    investment.type === "Securities" &&
    investment.fundType !== undefined &&
    isCurrencyRelatedFund(investment.fundType)
  );
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
  date?: Date;
  type: IncomeType | ExpenseType | FixedEstimateType;
  id: string;
  amount: number;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
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
  isClosed?: boolean; //if the expense is of type credit card then isClosed is false until the user confirm the payment else true
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
  high: number;
  low: number;
  volume: number;
  market: string;
  securityType: "Stock" | "Fund";
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

export interface SecurityChartDataPoint {
  date: string;
  price: number;
}

export type SecurityChartTimeRange = "1W" | "1M" | "6M" | "1Y" | "5Y";

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
  date: Date; // ISO date string
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
  createdAt: Date; // ISO timestamp
}

export interface DashboardSummary {
  totalInvested: number;
  totalRealizedPnL: number;
  totalCashBalance: number;
  updatedAt?: Date;
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
  updatedAt: new Date(),
};

export const defaultDashboardSummaries: DashboardSummaries = {
  ...defaultDashboardSummary,
  totalUnrealizedPnL: 0,
  marketTotalInvested: 0,
  totalPortfolio: 0,
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

export type InvestmentTypePercentage = Record<InvestmentType, number>;

export interface AppSettings {
  financialYearStartMonth: number;
  investmentTypePercentages: InvestmentTypePercentage;
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
