
export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';

export interface BaseInvestment {
  id: string;
  name: string; 
  type: InvestmentType;
  amountInvested: number;
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

export interface GoldInvestment extends BaseInvestment {
  type: 'Gold';
  quantityInGrams?: number;
  isPhysical?: boolean;
}

export interface CurrencyInvestment extends BaseInvestment {
  type: 'Currencies';
  currencyCode: string;
  baseCurrency: string;
  currentExchangeRate?: number;
}

export interface RealEstateInvestment extends BaseInvestment {
  type: 'Real Estate';
  propertyAddress?: string;
  propertyType?: 'Residential' | 'Commercial' | 'Land';
}

export interface DebtInstrumentInvestment extends BaseInvestment {
  type: 'Debt Instruments';
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
  investmentId?: string; 
  stockId?: string; 
  tickerSymbol: string;
  type: TransactionType;
  date: string; // ISO string
  numberOfShares: number;
  pricePerShare: number;
  fees: number;
  totalAmount: number; 
  profitOrLoss?: number; 
  createdAt: string; 
}

