
export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';
export type IncomeType = 'Profit Share' | 'Bonus' | 'Gift' | 'Rental Income' | 'Freelance' | 'Other'; // Removed 'Salary'
export type ExpenseCategory = 'Credit Card' | 'Other';

export interface BaseInvestment {
  id: string;
  name: string;
  type: InvestmentType;
  amountInvested: number;
  purchaseDate?: string;
  currentValue?: number;
  createdAt?: string;
}

export interface StockInvestment extends BaseInvestment {
  type: 'Stocks';
  actualStockName?: string;
  tickerSymbol?: string;
  numberOfShares?: number;
  purchasePricePerShare?: number;
  stockLogoUrl?: string;
  purchaseFees?: number;
}

export type GoldType = 'K24' | 'K21' | 'Pound' | 'Ounce';
export interface GoldInvestment extends BaseInvestment {
  type: 'Gold';
  quantityInGrams: number;
  goldType: GoldType;
}

export interface CurrencyInvestment extends BaseInvestment {
  type: 'Currencies';
  currencyCode: string;
  foreignCurrencyAmount: number;
  exchangeRateAtPurchase: number;
}

export type PropertyType = 'Residential' | 'Commercial' | 'Land';
export interface RealEstateInvestment extends BaseInvestment {
  type: 'Real Estate';
  propertyAddress?: string;
  propertyType?: PropertyType;
}

export type DebtSubType = 'Certificate' | 'Treasury Bill' | 'Bond' | 'Other';
export interface DebtInstrumentInvestment extends BaseInvestment {
  type: 'Debt Instruments';
  debtSubType: DebtSubType;
  issuer: string;
  interestRate: number;
  maturityDate: string; // YYYY-MM-DD
}

export type Investment = StockInvestment | GoldInvestment | CurrencyInvestment | RealEstateInvestment | DebtInstrumentInvestment;

export interface IncomeRecord {
  id: string;
  type: IncomeType;
  source?: string;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
  userId: string;
}

export interface ExpenseRecord {
  id: string;
  userId: string;
  description?: string;
  amount: number; // Total amount of the expense
  date: string;
  category: ExpenseCategory;
  isInstallment?: boolean; // True if this is an installment plan
  numberOfInstallments?: number; // e.g., 3, 6, 12 months
  createdAt?: string;
}

export interface MonthlySettings {
  monthlySalary?: number; // Added
  estimatedLivingExpenses?: number;
  estimatedZakat?: number;
  estimatedCharity?: number;
}

export interface CurrencyFluctuationAnalysisResult {
  significantDeviation: boolean;
  deviationPercentage: number;
  analysisSummary: string;
}

export interface ListedSecurity {
  id: string;
  name: string;
  symbol: string;
  logoUrl: string;
  price: number;
  currency: string;
  changePercent: number;
  market: string;
  securityType?: 'Stock' | 'Fund';
  fundType?: string;
}

export interface StockChartDataPoint {
  date: string;
  price: number;
}

export type StockChartTimeRange = '1W' | '1M' | '6M' | '1Y' | '5Y';

export type TransactionType = 'buy' | 'sell';

export interface Transaction {
  id: string;
  investmentId?: string;
  stockId?: string; // This can be the ID of the ListedSecurity
  tickerSymbol: string;
  type: TransactionType;
  date: string;
  numberOfShares: number;
  pricePerShare: number;
  fees: number;
  totalAmount: number;
  profitOrLoss?: number;
  createdAt: string;
  isInvestmentRecord?: boolean; // To differentiate buys (from investments) vs. sells (from transactions)
}

export interface DashboardSummary {
  totalInvestedAcrossAllAssets: number;
  totalRealizedPnL: number;
}

export interface GoldMarketPrices {
  pricePerGramK24?: number;
  pricePerGramK21?: number;
  pricePerGoldPound?: number;
  pricePerOunce?: number;
  lastUpdated?: any; // Could be Firestore Timestamp or Date string
}

export interface ExchangeRates {
  [key: string]: number; // e.g., USD_EGP: 30.85
}

export type AggregatedGoldHolding = {
  id: string;
  displayName: string;
  itemType: 'physical' | 'fund';
  logoUrl?: string;
  totalQuantity: number; // Grams for physical, units for funds
  averagePurchasePrice: number;
  totalCost: number;
  currentMarketPrice?: number;
  currency: string; // e.g. EGP for physical, fund's currency for funds
  fundDetails?: ListedSecurity; // if itemType is 'fund'
  physicalGoldType?: GoldType; // if itemType is 'physical'
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
  itemType: 'direct' | 'fund';
  displayName: string;
  // Direct debt fields
  debtSubType?: DebtSubType;
  issuer?: string;
  interestRate?: number;
  maturityDate?: string;
  amountInvested?: number; // For direct debt, this is the principal
  purchaseDate?: string;
  maturityDay?: string;
  maturityMonth?: string;
  maturityYear?: string;
  projectedMonthlyInterest?: number;
  projectedAnnualInterest?: number;
  // Fund fields
  fundDetails?: ListedSecurity;
  totalUnits?: number; // Shares for funds
  averagePurchasePrice?: number; // For funds
  totalCost?: number; // For funds
  currentMarketPrice?: number; // For funds
  currentValue?: number; // For funds
  profitLoss?: number; // For funds
  profitLossPercent?: number; // For funds
  currency?: string; // Fund's currency
  logoUrl?: string; // Fund's logo
}
