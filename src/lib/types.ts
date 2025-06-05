
export type InvestmentType = 'Real Estate' | 'Gold' | 'Stocks' | 'Debt Instruments' | 'Currencies';
export type IncomeType = 'Profit Share' | 'Bonus' | 'Gift' | 'Rental Income' | 'Freelance' | 'Other';
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
  goldType: GoldType;
  quantityInGrams: number; // Represents units for Pound/Ounce
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
  installmentFrequency?: 'Monthly' | 'Quarterly' | 'Yearly';
  installmentAmount?: number;
  totalInstallmentPrice?: number; // New: total price at end of all installments
  installmentStartDate?: string; // NEW FIELD
  installmentEndDate?: string; // New: end date of all installments
  downPayment?: number; // NEW FIELD
  maintenanceAmount?: number; // NEW FIELD
  maintenancePaymentDate?: string; // NEW FIELD
  installments?: Array<{
    number: number;
    dueDate: string;
    amount: number;
    status: 'Paid' | 'Unpaid';
    chequeNumber?: string;
    description?: string;
    isMaintenance?: boolean; // Added
  }>;
  paidInstallments?: Array<{ // This is likely legacy, but keep for now if generateInstallmentSchedule uses it
    number: number;
    dueDate?: string;
    amount?: number;
    chequeNumber?: string;
    description?: string;
    isMaintenance?: boolean; // Added
  }>;
}

export type DebtSubType = 'Certificate' | 'Treasury Bill' | 'Bond' | 'Other';
export interface DebtInstrumentInvestment extends BaseInvestment {
  type: 'Debt Instruments';
  debtSubType: DebtSubType;
  issuer: string;
  interestRate: number;
  maturityDate: string; // YYYY-MM-DD
  certificateInterestFrequency: 'Monthly' | 'Quarterly' | 'Yearly';
  interestAmount?: number; // Optional: actual or projected interest amount
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
  amount: number;
  date: string;
  category: ExpenseCategory;
  isInstallment?: boolean;
  numberOfInstallments?: number;
  createdAt?: string;
  _originalAmount?: number;
  _requiredAmount?: number;
  installmentMonthIndex?: number;
}

export type FixedEstimateType = 'Salary' | 'Zakat' | 'Charity' | 'Living Expenses' | 'Other';
export type FixedEstimatePeriod = 'Monthly' | 'Quarterly' | 'Yearly';

export interface FixedEstimateRecord {
  id: string;
  userId: string;
  type: FixedEstimateType;
  name?: string; // Used if type is 'Other'
  amount: number;
  period: FixedEstimatePeriod;
  isExpense: boolean; // True for Zakat, Charity, 'Other' expenses; False for Salary, 'Other' income
  createdAt: string;
  updatedAt?: string;
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

export type TransactionType = 'buy' | 'sell' | 'dividend';

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
  amount?: number; // Optional, for dividend or other transactions
}

export interface DashboardSummary {
  totalInvestedAcrossAllAssets: number;
  totalRealizedPnL: number;
  totalCashBalance: number; // Added this field
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

// Placeholder for AppSettings. Update with real fields as needed.
export interface AppSettings {
  // Example fields
  theme?: string;
  notificationsEnabled?: boolean;
  financialYearStartMonth?: number;
  // Add more fields as needed
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

export interface AppSettings {
  financialYearStartMonth?: number;
}
