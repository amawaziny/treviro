export const SETTINGS_COLLECTION_PATH = `users/{userId}/settings/appSettings`;

export const DASHBOARD_COLLECTION_PATH = `users/{userId}/dashboard_aggregates/summary`;

export const FINANCIAL_COLLECTIONS = {
  INCOMES: "incomes" as const,
  EXPENSES: "expenses" as const,
  FIXED_ESTIMATES: "fixedEstimates" as const,
} as const;

export const FINANCIAL_COLLECTIONS_PATH = `users/{userId}/{collectionName}`;

export const INVESTMENTS_COLLECTION_PATH = `users/{userId}/investments`;

export const TRANSACTIONS_COLLECTION_PATH = `users/{userId}/transactions`;

export const GOLD_MARKET_PRICES_PATH = "goldMarketPrices/current";
export const LISTED_SECURITIES_COLLECTION = "listedSecurities";
export const EXCHANGE_RATES_PATH = "exchangeRates/current";
