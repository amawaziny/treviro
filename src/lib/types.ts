export type CurrencyCode = "EGP" | "USD";

export type InvestmentType =
  | "Real Estate"
  | "Gold"
  | "Stocks"
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
export type ExpenseCategory = "Credit Card" | "Other";
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
  name: string;
  type: InvestmentType;
  amountInvested: number;
  purchaseDate?: string;
  currentValue?: number;
  createdAt?: string;
  securityId?: string;
  fundType?: string | null;
}

export interface SecurityInvestment extends BaseInvestment {
  type: InvestmentType | "Stocks";
  actualStockName?: string;
  tickerSymbol?: string;
  numberOfShares?: number;
  purchasePricePerShare?: number;
  purchaseFees?: number;
}

export type GoldType = "K24" | "K21" | "Pound" | "Ounce";
export interface GoldInvestment extends BaseInvestment {
  type: "Gold";
  goldType: GoldType;
  quantityInGrams: number; // Represents units for Pound/Ounce
}

export interface CurrencyInvestment extends BaseInvestment {
  type: "Currencies";
  currencyCode: string;
  foreignCurrencyAmount: number;
  exchangeRateAtPurchase: number;
}

export type PropertyType = "Residential" | "Touristic" | "Commercial" | "Land";

export type InstallmentFrequency = "Monthly" | "Quarterly" | "Yearly";

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
  propertyAddress?: string;
  propertyType?: PropertyType;
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

export type DebtSubType = "Certificate" | "Treasury Bill" | "Bond" | "Other";
export interface DebtInstrumentInvestment extends BaseInvestment {
  type: "Debt Instruments";
  debtSubType: DebtSubType;
  issuer: string;
  interestRate: number;
  maturityDate: string; // YYYY-MM-DD
  certificateInterestFrequency: "Monthly" | "Quarterly" | "Yearly";
  interestAmount?: number; // Optional: actual or projected interest amount
  isMatured?: boolean; // Indicates if the debt instrument has matured
  maturedOn?: string; // Date when the instrument matured (YYYY-MM-DD)
}

export type Investment =
  | SecurityInvestment
  | GoldInvestment
  | CurrencyInvestment
  | RealEstateInvestment
  | DebtInstrumentInvestment;

export type FinancialRecord =
  | IncomeRecord
  | ExpenseRecord
  | FixedEstimateRecord;

// Base interface that enforces common fields across all record types
export interface BaseRecord {
  date?: string;
  id: string;
  userId: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

// Extend the record interfaces to include BaseRecord
export interface IncomeRecord extends BaseRecord {
  type: IncomeType;
  source?: string;
  isRecurring?: boolean;
  recurrencePeriod?: string;
}

export interface ExpenseRecord extends BaseRecord {
  category: ExpenseCategory;
  isInstallment?: boolean;
  numberOfInstallments?: number;
  _originalAmount?: number;
  _requiredAmount?: number;
  installmentMonthIndex?: number;
}

export interface FixedEstimateRecord extends BaseRecord {
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

export type TransactionType = "buy" | "sell" | "dividend" | "interest";

export interface Transaction {
  id: string;
  investmentId?: string;
  securityId?: string;
  tickerSymbol: string;
  type: TransactionType;
  date: string;
  numberOfShares: number;
  pricePerShare: number;
  fees: number;
  totalAmount: number;
  profitOrLoss?: number;
  createdAt: string;
  isInvestmentRecord?: boolean;
  amount?: number; // Optional, for dividend or other transactions
  shares?: number; // Optional, for dividend or display-only transactions
}

export interface DashboardSummary {
  totalInvestedAcrossAllAssets: number;
  totalRealizedPnL: number;
  totalCashBalance: number;
  totalMaturedDebt?: number; // Total amount from matured debt instruments
  updatedAt: string;
}

export interface GoldMarketPrices {
  pricePerGramK24?: number;
  pricePerGramK21?: number;
  pricePerGramK22?: number;
  pricePerGramK18?: number;
  pricePerGramK14?: number;
  pricePerGramK12?: number;
  pricePerGramK10?: number;
  pricePerGramK9?: number;
  pricePerGramK8?: number;
  pricePerGoldPound?: number;
  pricePerOunceK24?: number;
  pricePerOunceK21?: number;
  pricePerOunceK22?: number;
  pricePerOunceK18?: number;
  pricePerOunceK14?: number;
  pricePerOunceK12?: number;
  pricePerOunceK10?: number;
  pricePerOunceK9?: number;
  pricePerOunceK8?: number;
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
