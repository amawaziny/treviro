
export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';

export interface BaseInvestment {
  id: string;
  name: string;
  type: InvestmentType;
  amountInvested: number; // This is the COST of the investment in a base currency (e.g., EGP for currencies, USD for stocks)
  purchaseDate: string; // ISO string
  currentValue?: number;
  createdAt?: string; // Server-generated timestamp, stored as ISO string
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
  quantityInGrams?: number; // For K24/K21 this is grams, for Pound/Ounce this is number of units
  goldType: GoldType;
}

export interface CurrencyInvestment extends BaseInvestment {
  type: 'Currencies';
  currencyCode: string; // e.g., USD, EUR
  foreignCurrencyAmount: number; // Amount of the foreign currency bought/held
  exchangeRateAtPurchase: number; // Exchange rate of foreign currency TO baseCurrencyAtPurchase at time of purchase
  // baseCurrencyAtPurchase removed
}

export interface RealEstateInvestment extends BaseInvestment {
  type: 'Real Estate';
  propertyAddress?: string;
  propertyType?: 'Residential' | 'Commercial' | 'Land';
}

export type DebtSubType = 'Certificate' | 'Treasury Bill' | 'Bond' | 'Other';
export interface DebtInstrumentInvestment extends BaseInvestment {
  type: 'Debt Instruments';
  debtSubType: DebtSubType;
  issuer?: string;
  interestRate?: number;
  maturityDate?: string;
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
  fundType?: string; // e.g., 'Equity ETF', 'Bond Mutual Fund' - relevant if securityType is 'Fund'
}

export interface StockChartDataPoint {
  date: string;
  price: number;
}

export type StockChartTimeRange = '1D' | '1W' | '1M' | '6M' | '1Y' | '5Y';

export type TransactionType = 'buy' | 'sell';

export interface Transaction {
  id: string;
  investmentId?: string; // For 'buy' transactions that are actual investment records
  stockId?: string; // ID of the ListedSecurity
  tickerSymbol: string;
  type: TransactionType;
  date: string; // ISO string
  numberOfShares: number;
  pricePerShare: number; // For stocks/funds. For currencies, this might be the sale exchange rate.
  fees: number;
  totalAmount: number; // Total proceeds from sale, or total cost for purchase
  profitOrLoss?: number;
  createdAt: string;
  isInvestmentRecord?: boolean; // True if this "transaction" entry represents an original investment record
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
  [key: string]: number; // e.g., USD_EGP: 30.85, SAR_EGP: 8.22
  // lastUpdated?: any; // Firestore Timestamp or Date - good to have
}

