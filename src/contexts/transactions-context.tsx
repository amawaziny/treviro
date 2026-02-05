"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Transaction } from "@/lib/types";
import {
  isCurrencyRelatedFund,
  isDebtRelatedFund,
  isGoldRelatedFund,
  isRealEstateRelatedFund,
  isStockRelatedFund,
} from "@/lib/utils";
import { useAppServices } from "@/contexts/app-services-context";
import { endOfMonth, startOfMonth } from "date-fns";

export interface TransactionsContextType {
  // Default data (current month)
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;

  // Methods
  fetchTransactionsForRange: (
    startDate: Date,
    endDate: Date,
  ) => Promise<{
    transactions: Transaction[];
    incomeFixedTrxs: Transaction[];
    incomeManualTrxs: Transaction[];
    expenseFixedTrxs: Transaction[];
    expenseManualTrxs: Transaction[];
    expenseManualCreditCardTrxs: Transaction[];
    expenseManualOtherTrxs: Transaction[];
    dividendTrxs: Transaction[];
    investmentTrxs: Transaction[];
    stockInvestmentTrxs: Transaction[];
    realEstateInvestmentTrxs: Transaction[];
    debtInvestmentTrxs: Transaction[];
    goldInvestmentTrxs: Transaction[];
    currencyInvestmentTrxs: Transaction[];
  }>;
  getTransactionsBySourceId: (sourceId: string) => Promise<Transaction[]>;
  getTransactionsBySecurityId: (securityId: string) => Promise<Transaction[]>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const TransactionsContext = createContext<
  TransactionsContextType | undefined
>(undefined);

export const TransactionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { transactionService } = useAppServices();

  // Default date range (current month)
  const { defaultStartDate, defaultEndDate } = useMemo(() => {
    const now = new Date();
    return {
      defaultStartDate: startOfMonth(now),
      defaultEndDate: endOfMonth(now),
    };
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const setupDefaultSubscription = useCallback(() => {
    if (!transactionService) return;

    setIsLoading(true);

    const unsubscribe = transactionService.subscribeToTransactionsWithin(
      defaultStartDate,
      defaultEndDate,
      (fetchedTransactions) => {
        setTransactions(fetchedTransactions);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [transactionService, defaultStartDate, defaultEndDate]);

  // Fetch transactions for custom range (returns data without updating global state)
  const fetchTransactionsForRange = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");

      const fetchedTransactions =
        await transactionService.getTransactionsWithin(startDate, endDate);

      // Compute filtered arrays
      const investmentTrxs = fetchedTransactions.filter(
        (tx) => tx.type === "BUY" && tx.sourceType === "Investment",
      );
      const incomeFixedTrxs = fetchedTransactions.filter(
        (tx) => tx.type === "INCOME" && tx.sourceType === "Fixed Estimate",
      );
      const incomeManualTrxs = fetchedTransactions.filter(
        (tx) =>
          tx.type === "INCOME" &&
          (!tx.sourceType || tx.sourceType !== "Fixed Estimate"),
      );
      const expenseFixedTrxs = fetchedTransactions.filter(
        (tx) => tx.type === "EXPENSE" && tx.sourceType === "Fixed Estimate",
      );
      const expenseManualTrxs = fetchedTransactions.filter(
        (tx) =>
          tx.type === "EXPENSE" &&
          (!tx.sourceType || tx.sourceType === "Expense"),
      );
      const expenseManualCreditCardTrxs = expenseManualTrxs.filter(
        ({ metadata }) => metadata.sourceSubType === "Credit Card",
      );
      const expenseManualOtherTrxs = expenseManualTrxs.filter(
        ({ metadata }) => metadata.sourceSubType === "Other",
      );
      const dividendTrxs = fetchedTransactions.filter(
        (tx) => tx.type === "DIVIDEND",
      );
      const stockInvestmentTrxs = investmentTrxs.filter(
        (tx) =>
          tx.securityId &&
          (!tx.metadata.fundType || isStockRelatedFund(tx.metadata.fundType)),
      );
      const debtInvestmentTrxs = investmentTrxs.filter(
        ({ metadata }) =>
          metadata.sourceSubType === "Debt Instruments" ||
          isDebtRelatedFund(metadata.fundType),
      );
      const goldInvestmentTrxs = investmentTrxs.filter(
        ({ metadata }) =>
          metadata.sourceSubType === "Gold" ||
          isGoldRelatedFund(metadata.fundType),
      );
      const currencyInvestmentTrxs = investmentTrxs.filter(
        ({ metadata }) =>
          metadata.sourceSubType === "Currencies" ||
          isCurrencyRelatedFund(metadata.fundType),
      );
      const realEstateInvestmentTrxs = investmentTrxs.filter(
        ({ metadata }) =>
          metadata.sourceSubType === "Real Estate" ||
          isRealEstateRelatedFund(metadata.fundType),
      );
      const realEstateInstallmentsTrxs = fetchedTransactions.filter(
        (tx) =>
          tx.type === "PAYMENT" &&
          tx.sourceType === "Investment" &&
          tx.metadata.sourceSubType === "Real Estate",
      );

      return {
        transactions: fetchedTransactions,
        incomeFixedTrxs,
        incomeManualTrxs,
        expenseFixedTrxs,
        expenseManualTrxs,
        expenseManualCreditCardTrxs,
        expenseManualOtherTrxs,
        dividendTrxs,
        investmentTrxs,
        stockInvestmentTrxs,
        realEstateInvestmentTrxs: [
          ...realEstateInvestmentTrxs,
          ...realEstateInstallmentsTrxs,
        ],
        debtInvestmentTrxs,
        goldInvestmentTrxs,
        currencyInvestmentTrxs,
      };
    },
    [transactionService],
  );

  // CRUD methods
  const getTransactionsBySourceId = useCallback(
    async (sourceId: string): Promise<Transaction[]> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");
      return await transactionService.getTransactionsBySourceId(sourceId);
    },
    [transactionService],
  );

  const getTransactionsBySecurityId = useCallback(
    async (securityId: string): Promise<Transaction[]> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");
      return await transactionService.getTransactionsBySecurityId(securityId);
    },
    [transactionService],
  );

  const updateTransaction = useCallback(
    async (id: string, data: Partial<Transaction>): Promise<void> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");
      await transactionService.updateTransaction(id, data);
    },
    [transactionService],
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");
      await transactionService.deleteTransaction(id);
    },
    [transactionService],
  );

  // Initial subscription
  useEffect(() => {
    const unsubscribe = setupDefaultSubscription();
    return unsubscribe;
  }, [setupDefaultSubscription]);

  const value: TransactionsContextType = {
    transactions,
    isLoading,
    error,
    fetchTransactionsForRange,
    getTransactionsBySourceId,
    getTransactionsBySecurityId,
    updateTransaction,
    deleteTransaction,
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error(
      "useTransactions must be used within a TransactionsProvider",
    );
  }
  return context;
};
