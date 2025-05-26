
export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';
export type IncomeType = 'Salary' | 'Profit Share' | 'Bonus' | 'Gift' | 'Rental Income' | 'Freelance' | 'Other';
export type ExpenseCategory = 'Credit Card' | 'Other'; // Simplified categories

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

// MonthlySettings interface is removed

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
  stockId?: string;
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
  lastUpdated?: any;
}

export interface ExchangeRates {
  [key: string]: number;
}

export type AggregatedGoldHolding = {
  id: string;
  displayName: string;
  itemType: 'physical' | 'fund';
  logoUrl?: string;
  totalQuantity: number;
  averagePurchasePrice: number;
  totalCost: number;
  currentMarketPrice?: number;
  currency: string;
  fundDetails?: ListedSecurity;
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
  itemType: 'direct' | 'fund';
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
  fundDetails?: ListedSecurity;
  totalUnits?: number;
  averagePurchasePrice?: number;
  totalCost?: number;
  currentMarketPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  currency?: string;
  logoUrl?: string;
}
