export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';

export interface BaseInvestment {
  id: string;
  name: string;
  type: InvestmentType;
  amountInvested: number;
  purchaseDate: string; // ISO string
  currentValue?: number; // Optional, can be updated later
}

export interface StockInvestment extends BaseInvestment {
  type: 'Stocks';
  tickerSymbol?: string;
  numberOfShares?: number;
  purchasePricePerShare?: number;
  stockLogoUrl?: string; // Added field for stock logo URL
  isFund?: boolean; // To differentiate individual stocks vs funds
}

export interface GoldInvestment extends BaseInvestment {
  type: 'Gold';
  quantityInGrams?: number;
  isPhysical?: boolean; // Physical gold or gold fund/ETF
}

export interface CurrencyInvestment extends BaseInvestment {
  type: 'Currencies';
  currencyCode: string; // e.g., USD, EUR
  baseCurrency: string; // For comparison, e.g., local currency like INR
  currentExchangeRate?: number; // User-provided for AI analysis
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
  maturityDate?: string; // ISO string
}

export type Investment = StockInvestment | GoldInvestment | CurrencyInvestment | RealEstateInvestment | DebtInstrumentInvestment;

export interface CurrencyFluctuationAnalysisResult {
  significantDeviation: boolean;
  deviationPercentage: number;
  analysisSummary: string;
}
