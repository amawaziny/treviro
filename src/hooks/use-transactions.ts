import { useState, useEffect, useCallback, useMemo } from "react";
import { Transaction } from "@/lib/types";
import { TransactionService } from "@/lib/services/transaction-service";
import { useAuth } from "@/contexts/auth-context";
import {
  formatDateISO,
  isCurrencyRelatedFund,
  isDebtRelatedFund,
  isGoldRelatedFund,
  isRealEstateRelatedFund,
  isStockRelatedFund,
} from "@/lib/utils";
import { endOfMonth, startOfMonth } from "date-fns";

/**
 * Custom hook to manage transactions including CRUD operations
 *
 * @param startDate - Optional start date for filtering transactions (inclusive)
 * @param endDate - Optional end date for filtering transactions (inclusive)
 * @returns An object containing transactions, loading state, error, and transaction management methods
 */

export const useTransactions = (startDate?: Date, endDate?: Date) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeFixedTrxs, setIncomeFixedTrxs] = useState<Transaction[]>([]);
  const [incomeManualTrxs, setIncomeManualTrxs] = useState<Transaction[]>([]);
  const [expenseFixedTrxs, setExpenseFixedTrxs] = useState<Transaction[]>([]);
  const [expenseManualTrxs, setExpenseManualTrxs] = useState<Transaction[]>([]);
  const [expenseManualCreditCardTrxs, setExpenseManualCreditCardTrxs] =
    useState<Transaction[]>([]);
  const [expenseManualOtherTrxs, setExpenseManualOtherTrxs] = useState<
    Transaction[]
  >([]);
  const [dividendTrxs, setDividendTrxs] = useState<Transaction[]>([]);
  const [investmentTrxs, setInvestmentTrxs] = useState<Transaction[]>([]);
  const [stockInvestmentTrxs, setStockInvestmentTrxs] = useState<Transaction[]>(
    [],
  );
  const [realEstateInvestmentTrxs, setRealEstateInvestmentTrxs] = useState<
    Transaction[]
  >([]);
  const [debtInvestmentTrxs, setDebtInvestmentTrxs] = useState<Transaction[]>(
    [],
  );
  const [goldInvestmentTrxs, setGoldInvestmentTrxs] = useState<Transaction[]>(
    [],
  );
  const [currencyInvestmentTrxs, setCurrencyInvestmentTrxs] = useState<
    Transaction[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Initialize transaction service
  const transactionService = useMemo(() => {
    if (!user?.uid) return null;
    return new TransactionService(user.uid);
  }, [user?.uid]);

  // Fetch transactions within date range
  const fetchTransactions = useCallback(async () => {
    if (!transactionService)
      throw new Error("Transaction service not initialized");

    setIsLoading(true);
    setError(null);

    try {
      const start = formatDateISO(startDate || startOfMonth(new Date()));
      const end = formatDateISO(endDate || endOfMonth(new Date()));

      const fetchedTransactions =
        await transactionService.getTransactionsWithin(start, end);
      setTransactions(fetchedTransactions);

      const investmentTrxs = fetchedTransactions.filter(
        (tx) => tx.type === "BUY" && tx.sourceType === "Investment",
      );
      setInvestmentTrxs(investmentTrxs);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch transactions"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [transactionService, startDate, endDate]);

  // Fetch income fixed estimate transactions
  const fetchIncomeFixedEstimateTransactions = useCallback(async () => {
    if (!transactions) return [];

    const incomeFixedTrxs = transactions.filter(
      (tx) => tx.type === "INCOME" && tx.sourceType === "Fixed Estimate",
    );
    setIncomeFixedTrxs(incomeFixedTrxs);
  }, [transactions]);

  // Fetch income manual transactions
  const fetchIncomeManualTransactions = useCallback(async () => {
    if (!transactions) return [];

    const incomeManualTrxs = transactions.filter(
      (tx) =>
        tx.type === "INCOME" &&
        (!tx.sourceType || tx.sourceType !== "Fixed Estimate"),
    );
    setIncomeManualTrxs(incomeManualTrxs);
  }, [transactions]);

  // Fetch expense fixed estimate transactions
  const fetchExpenseFixedEstimateTransactions = useCallback(async () => {
    if (!transactions) return [];

    const expenseFixedTrxs = transactions.filter(
      (tx) => tx.type === "EXPENSE" && tx.sourceType === "Fixed Estimate",
    );
    setExpenseFixedTrxs(expenseFixedTrxs);
  }, [transactions]);

  // Fetch expense manual transactions
  const fetchExpenseManualTransactions = useCallback(async () => {
    if (!transactions) return [];

    const expenseManualTrxs = transactions.filter(
      (tx) =>
        tx.type === "EXPENSE" &&
        (!tx.sourceType || tx.sourceType === "Expense"),
    );
    setExpenseManualTrxs(expenseManualTrxs);

    const expenseManualCreditCardTrxs = expenseManualTrxs.filter(
      ({ metadata }) => metadata.sourceSubType === "Credit Card",
    );
    setExpenseManualCreditCardTrxs(expenseManualCreditCardTrxs);

    const expenseManualOtherTrxs = expenseManualTrxs.filter(
      ({ metadata }) => metadata.sourceSubType === "Other",
    );
    setExpenseManualOtherTrxs(expenseManualOtherTrxs);
  }, [transactions]);

  // Fetch dividend transactions
  const fetchDividendTransactions = useCallback(async () => {
    if (!transactions) return [];

    const dividendTrxs = transactions.filter((tx) => tx.type === "DIVIDEND");
    setDividendTrxs(dividendTrxs);
  }, [transactions]);

  // fetch securities investment transactions
  const fetchStockInvestmentTransactions = useCallback(async () => {
    if (!investmentTrxs) return [];

    const stockInvestmentTrxs = investmentTrxs.filter(
      (tx) =>
        tx.securityId &&
        (!tx.metadata.fundType || isStockRelatedFund(tx.metadata.fundType)),
    );
    setStockInvestmentTrxs(stockInvestmentTrxs);
  }, [investmentTrxs]);

  // fetch debt investment transactions
  const fetchDebtInvestmentTransactions = useCallback(async () => {
    if (!investmentTrxs) return [];

    const debtInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Debt Instruments" ||
        isDebtRelatedFund(metadata.fundType),
    );
    setDebtInvestmentTrxs(debtInvestmentTrxs);
  }, [investmentTrxs]);

  // fetch gold investment transactions
  const fetchGoldInvestmentTransactions = useCallback(async () => {
    if (!investmentTrxs) return [];

    const goldInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Gold" ||
        isGoldRelatedFund(metadata.fundType),
    );
    setGoldInvestmentTrxs(goldInvestmentTrxs);
  }, [investmentTrxs]);

  // fetch currency investment transactions
  const fetchCurrencyInvestmentTransactions = useCallback(async () => {
    if (!investmentTrxs) return [];

    const currencyInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Currencies" ||
        isCurrencyRelatedFund(metadata.fundType),
    );
    setCurrencyInvestmentTrxs(currencyInvestmentTrxs);
  }, [investmentTrxs]);

  // fetch real estate investment transactions
  const fetchRealEstateInvestmentTransactions = useCallback(async () => {
    if (!investmentTrxs || !transactions) return [];

    const realEstateInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Real Estate" ||
        isRealEstateRelatedFund(metadata.fundType),
    );
    const realEstateInstallmentsTrxs = transactions.filter(
      (tx) =>
        tx.type === "PAYMENT" &&
        tx.sourceType === "Investment" &&
        tx.metadata.sourceSubType === "Real Estate",
    );

    setRealEstateInvestmentTrxs([
      ...realEstateInvestmentTrxs,
      ...realEstateInstallmentsTrxs,
    ]);
  }, [investmentTrxs, transactions]);

  // Get transactions by source ID
  const getTransactionsBySourceId = useCallback(
    async (sourceId: string): Promise<Transaction[]> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");

      try {
        return await transactionService.getTransactionsBySourceId(sourceId);
      } catch (err) {
        console.error("Failed to fetch transactions by source ID:", err);
        throw err;
      }
    },
    [transactionService],
  );

  // Update a transaction
  const updateTransaction = useCallback(
    async (id: string, data: Partial<Transaction>): Promise<void> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");

      try {
        await transactionService.updateTransaction(id, data);
        // Refresh transactions after update
        await fetchTransactions();
      } catch (err) {
        console.error("Failed to update transaction:", err);
        throw err;
      }
    },
    [transactionService, fetchTransactions],
  );

  // Delete a transaction
  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      if (!transactionService)
        throw new Error("Transaction service not initialized");

      try {
        await transactionService.deleteTransaction(id);
        // Refresh transactions after deletion
        await fetchTransactions();
      } catch (err) {
        console.error("Failed to delete transaction:", err);
        throw err;
      }
    },
    [transactionService, fetchTransactions],
  );

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
    fetchIncomeFixedEstimateTransactions();
    fetchIncomeManualTransactions();
    fetchDividendTransactions();
    fetchExpenseFixedEstimateTransactions();
    fetchExpenseManualTransactions();
    fetchStockInvestmentTransactions();
    fetchDebtInvestmentTransactions();
    fetchGoldInvestmentTransactions();
    fetchCurrencyInvestmentTransactions();
    fetchRealEstateInvestmentTransactions();
  }, [
    fetchTransactions,
    fetchIncomeFixedEstimateTransactions,
    fetchIncomeManualTransactions,
    fetchDividendTransactions,
    fetchExpenseFixedEstimateTransactions,
    fetchExpenseManualTransactions,
    fetchStockInvestmentTransactions,
    fetchDebtInvestmentTransactions,
    fetchGoldInvestmentTransactions,
    fetchCurrencyInvestmentTransactions,
    fetchRealEstateInvestmentTransactions,
  ]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchTransactions();
    await fetchIncomeFixedEstimateTransactions();
    await fetchIncomeManualTransactions();
    await fetchDividendTransactions();
    await fetchExpenseFixedEstimateTransactions();
    await fetchExpenseManualTransactions();
    await fetchStockInvestmentTransactions();
    await fetchDebtInvestmentTransactions();
    await fetchGoldInvestmentTransactions();
    await fetchCurrencyInvestmentTransactions();
    await fetchRealEstateInvestmentTransactions();
  }, [
    fetchTransactions,
    fetchIncomeFixedEstimateTransactions,
    fetchIncomeManualTransactions,
    fetchDividendTransactions,
    fetchExpenseFixedEstimateTransactions,
    fetchExpenseManualTransactions,
    fetchStockInvestmentTransactions,
    fetchDebtInvestmentTransactions,
    fetchGoldInvestmentTransactions,
    fetchCurrencyInvestmentTransactions,
    fetchRealEstateInvestmentTransactions,
  ]);

  return {
    transactions,
    isLoading,
    error,
    refresh,
    getTransactionsBySourceId,
    updateTransaction,
    deleteTransaction,
    incomeFixedTrxs,
    incomeManualTrxs,
    expenseFixedTrxs,
    expenseManualTrxs,
    expenseManualCreditCardTrxs,
    expenseManualOtherTrxs,
    dividendTrxs,
    investmentTrxs,
    stockInvestmentTrxs,
    debtInvestmentTrxs,
    goldInvestmentTrxs,
    currencyInvestmentTrxs,
    realEstateInvestmentTrxs,
  };
};
