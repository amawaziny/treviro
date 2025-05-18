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
  stockLogoUrl?: string;
  isFund?: boolean;
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

// New type for displaying stocks in a list
export interface ListedStock {
  id: string;
  name: string;
  symbol: string;
  logoUrl: string;
  price: number;
  currency: string;
  changePercent: number;
  market: string; // e.g., "SAR", "EGX"
}
