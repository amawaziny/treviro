
export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';

export interface BaseInvestment {
  id: string;
  name: string; // User-defined or auto-generated label for the investment lot
  type: InvestmentType;
  amountInvested: number; // This is the COST of the investment
  purchaseDate?: string; // ISO string - Made optional
  currentValue?: number;
  createdAt?: string; // Server-generated timestamp, stored as ISO string
}

export interface StockInvestment extends BaseInvestment {
  type: 'Stocks';
  actualStockName?: string; // Official name of the stock/fund
  tickerSymbol?: string; // Symbol of the stock/fund
  numberOfShares?: number;
  purchasePricePerShare?: number;
  stockLogoUrl?: string;
  purchaseFees?: number;
}

export type GoldType = 'K24' | 'K21' | 'Pound' | 'Ounce';
export interface GoldInvestment extends BaseInvestment {
  type: 'Gold';
  quantityInGrams: number; // For K24/K21 this is grams, for Pound/Ounce this is number of units
  goldType: GoldType;
}

export interface CurrencyInvestment extends BaseInvestment {
  type: 'Currencies';
  currencyCode: string; // e.g., USD, EUR
  foreignCurrencyAmount: number; // Amount of the foreign currency bought/held
  exchangeRateAtPurchase: number; // Exchange rate of foreign currency TO EGP at time of purchase
  // amountInvested will be the cost in EGP
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
  securityType?: 'Stock' | 'Fund'; // 'Stock' is default if undefined
  fundType?: string; // e.g., 'Equity ETF', 'Bond Mutual Fund', 'Gold ETF' - relevant if securityType is 'Fund'
}

export interface StockChartDataPoint {
  date: string;
  price: number;
}

export type StockChartTimeRange = '1W' | '1M' | '6M' | '1Y' | '5Y';

export type TransactionType = 'buy' | 'sell';

export interface Transaction {
  id: string;
  investmentId?: string; // For 'buy' transactions that are actual investment records
  stockId?: string; // ID of the ListedSecurity
  tickerSymbol: string;
  type: TransactionType;
  date: string; // ISO string
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
  lastUpdated?: any; // Firestore Timestamp or Date
}

export interface ExchangeRates {
  [key: string]: number;
}

// For MyGoldPage unified list
export type AggregatedGoldHolding = {
  id: string; // e.g., "physical_K24" or fund's securityId
  displayName: string;
  itemType: 'physical' | 'fund';
  logoUrl?: string; // For funds, or a generic for physical
  totalQuantity: number;
  averagePurchasePrice: number;
  totalCost: number;
  currentMarketPrice?: number;
  currency: string; // Currency of the prices/costs
  fundDetails?: ListedSecurity; // Only for funds
  physicalGoldType?: GoldType; // Only for physical gold
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
  id: string; // Firestore ID for direct debt, or fund ID for funds
  itemType: 'direct' | 'fund';
  displayName: string; 
  
  // Direct Debt Specific
  debtSubType?: DebtSubType;
  issuer?: string;
  interestRate?: number;
  maturityDate?: string; // YYYY-MM-DD
  amountInvested?: number; // Cost for direct debt
  purchaseDate?: string; // YYYY-MM-DD , optional as per previous changes
  maturityDay?: string;
  maturityMonth?: string;
  maturityYear?: string;
  projectedMonthlyInterest?: number;
  projectedAnnualInterest?: number;

  // Fund Specific
  fundDetails?: ListedSecurity; 
  totalUnits?: number;
  averagePurchasePrice?: number;
  totalCost?: number; // Cost for fund investment
  currentMarketPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  currency?: string; 
  logoUrl?: string;
}
