"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  startOfMonth,
  differenceInCalendarMonths,
  differenceInSeconds,
  endOfMonth,
} from "date-fns";
import { FinancialRecordsService } from "@/lib/services/financial-records-service";
import { IncomeRecord, ExpenseRecord, FixedEstimateRecord } from "@/lib/types";
import { useAppServices } from "@/contexts/app-services-context";

export const useFinancialRecords = (
  startDateParam?: Date,
  endDateParam?: Date,
) => {
  const { financialRecordsService: recordsService } = useAppServices();

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const defaultEnd = endOfMonth(now);
    const defaultStart = startOfMonth(now);
    const s = startDateParam ? startDateParam : defaultStart;
    const e = endDateParam ? endDateParam : defaultEnd;
    return { startDate: s, endDate: e };
  }, [startDateParam, endDateParam]);

  const [incomesManual, setIncomesManual] = useState<IncomeRecord[]>([]);
  const [expensesManual, setExpensesManual] = useState<ExpenseRecord[]>([]);
  const [expensesManualOther, setExpensesManualOther] = useState<
    ExpenseRecord[]
  >([]);
  const [expensesManualCreditCard, setExpensesManualCreditCard] = useState<
    ExpenseRecord[]
  >([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>(
    [],
  );
  const [incomesFixed, setIncomesFixed] = useState<FixedEstimateRecord[]>([]);
  const [expensesFixed, setExpensesFixed] = useState<FixedEstimateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinancialRecords = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      try {
        setIsLoading(true);
        await Promise.all([
          fetchIncomes(recordsService, startDate, endDate),
          fetchExpensesManualOther(recordsService, startDate, endDate),
          fetchExpensesManualCreditCard(recordsService, endDate),
          fetchFixedEstimates(recordsService),
        ]);
      } catch (error) {
        console.error("Error loading financial records:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [recordsService],
  );

  // Initial fetch
  useEffect(() => {
    fetchFinancialRecords(startDate, endDate);
  }, [startDate, endDate, fetchFinancialRecords]);

  useEffect(() => {
    const records = [...expensesManualOther, ...expensesManualCreditCard].sort(
      (a, b) => differenceInSeconds(b.date!, a.date!),
    );
    setExpensesManual(records);
  }, [expensesManualOther, expensesManualCreditCard]);

  // Income operations
  const fetchIncomes = async (
    service: FinancialRecordsService,
    start: Date,
    end: Date,
  ) => {
    try {
      const records = await service.getIncomesWithin(start, end);
      setIncomesManual(records);
      return records;
    } catch (error) {
      console.error("Error fetching income records:", error);
      setIncomesManual([]);
      return [];
    }
  };

  const fetchIncomeById = useCallback(
    async (id: string) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      try {
        return await recordsService.findIncomeById(id);
      } catch (error) {
        console.error("Error fetching income record:", error);
        return null;
      }
    },
    [recordsService],
  );

  const addIncome = useCallback(
    async (data: Omit<IncomeRecord, "id" | "createdAt" | "recordType">) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const newRecord = await recordsService.addIncome(data);
        setIncomesManual((prev) => [newRecord, ...prev]);
        return newRecord;
      } catch (error) {
        console.error("Error adding income record:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const updateIncome = useCallback(
    async (id: string, data: Partial<IncomeRecord>) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const updatedRecord = await recordsService.updateIncome(id, data);
        setIncomesManual((prev) =>
          prev.map((record) =>
            record.id === id ? { ...record, ...updatedRecord } : record,
          ),
        );
        return updatedRecord;
      } catch (error) {
        console.error("Error updating income record:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        setIsLoading(true);
        await recordsService.deleteIncome(id);
        setIncomesManual((prev) => prev.filter((record) => record.id !== id));
      } catch (error) {
        console.error("Error deleting income record:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [recordsService],
  );

  // Expense operations
  const fetchExpensesManualOther = async (
    service: FinancialRecordsService,
    start: Date,
    end: Date,
  ) => {
    try {
      const records = await service.getExpensesWithin(start, end);
      setExpensesManualOther(
        records.filter((record) => record.type === "Other"),
      );
      return records;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpensesManualOther([]);
      return [];
    }
  };

  /**
   * Fetches credit card expenses and calculates installment month indices.
   *
   * DESIGN NOTE: This implementation calculates installments on-the-fly rather than
   * storing each installment as a separate expense record. While this approach is
   * efficient for data fetching and avoids duplicating installment data, it has
   * significant tradeoffs:
   *
   * ADVANTAGES:
   * - Single source of truth: One record per credit card purchase
   * - Efficient fetching: No need to query multiple installment records
   *
   * DISADVANTAGES:
   * - Edit operations are complex: Changing installment details requires recalculating
   *   and updating the parent record
   * - Transaction history updates are difficult: Can't independently modify historical
   *   installment records in the transaction table
   * - Selective updates are challenging: Cannot update only future installments without
   *   affecting the parent record and recalculating all installment data
   *
   * ALTERNATIVE: Storing each installment as a separate expense record would simplify
   * editing and updates, but would require managing multiple related records and would
   * increase data duplication and query complexity.
   */
  const fetchExpensesManualCreditCard = async (
    service: FinancialRecordsService,
    endDate: Date,
  ) => {
    try {
      const records = await service.getExpenses({
        type: "Credit Card",
        isClosed: false,
      });

      // Helper to calculate months difference once per record
      const getMonthsDiff = (record: ExpenseRecord) => {
        if (!record.date) return null;
        return differenceInCalendarMonths(endDate, startOfMonth(record.date));
      };

      const computed = records
        .map((record) => {
          const monthsDiff = getMonthsDiff(record);
          // Filter out records with purchase date after endDate
          if (monthsDiff === null || monthsDiff < 0) return null;

          const copy = { ...record } as typeof record;
          copy.installmentMonthIndex = copy.numberOfInstallments;

          if (copy.isInstallment && copy.numberOfInstallments) {
            // installment index is 1-based
            if (monthsDiff < copy.numberOfInstallments) {
              copy.installmentMonthIndex = monthsDiff + 1;
            }
          }
          return copy;
        })
        .filter((record): record is ExpenseRecord => record !== null);

      setExpensesManualCreditCard(computed);
      return computed;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpensesManualCreditCard([]);
      return [];
    }
  };

  const findExpenseById = useCallback(
    async (id: string) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        return await recordsService.findExpenseById(id);
      } catch (error) {
        console.error("Error fetching expense record:", error);
        return null;
      }
    },
    [recordsService],
  );

  const addExpense = useCallback(
    async (data: Omit<ExpenseRecord, "id" | "createdAt" | "recordType">) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const newRecord = await recordsService.addExpense(data);
        setExpensesManual((prev) => [newRecord, ...prev]);
        return newRecord;
      } catch (error) {
        console.error("Error adding expense record:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const updateExpense = useCallback(
    async (id: string, data: Partial<ExpenseRecord>) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const updatedRecord = await recordsService.updateExpense(id, data);
        setExpensesManual((prev) =>
          prev.map((record) =>
            record.id === id ? { ...record, ...updatedRecord } : record,
          ),
        );
        return updatedRecord;
      } catch (error) {
        console.error("Error updating expense record:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const payCreditCardExpense = useCallback(
    async (expense: ExpenseRecord, payDate: Date) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const updatedRecord = await recordsService.payCreditCardExpense(
          expense,
          payDate,
        );
        setExpensesManual((prev) =>
          prev.map((record) =>
            record.id === expense.id ? { ...record, ...updatedRecord } : record,
          ),
        );
        return updatedRecord;
      } catch (error) {
        console.error("Error paying credit card expense record:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const confirmFixedEstimate = useCallback(
    async (fixedEstimate: FixedEstimateRecord, confirmDate: Date) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const updatedRecord = await recordsService.confirmFixedEstimate(
          fixedEstimate,
          confirmDate,
        );
        setFixedEstimates((prev) =>
          prev.map((record) =>
            record.id === fixedEstimate.id ? updatedRecord : record,
          ),
        );
        return updatedRecord;
      } catch (error) {
        console.error("Error confirming fixed estimate:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        setIsLoading(true);
        await recordsService.deleteExpense(id);
        setExpensesManual((prev) => prev.filter((record) => record.id !== id));
      } catch (error) {
        console.error("Error deleting expense record:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [recordsService],
  );

  // Fixed Estimate operations
  const fetchFixedEstimates = async (service: FinancialRecordsService) => {
    try {
      const estimates = await service.getFixedEstimates();
      setFixedEstimates(estimates);
      setIncomesFixed(estimates.filter((estimate) => !estimate.isExpense));
      setExpensesFixed(estimates.filter((estimate) => estimate.isExpense));
      return estimates;
    } catch (error) {
      console.error("Error fetching fixed estimates:", error);
      setFixedEstimates([]);
      setIncomesFixed([]);
      setExpensesFixed([]);
      return [];
    }
  };

  const addFixedEstimate = useCallback(
    async (
      data: Omit<FixedEstimateRecord, "id" | "createdAt" | "recordType">,
    ) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const newEstimate = await recordsService.addFixedEstimate(data);
        setFixedEstimates((prev) => [newEstimate, ...prev]);
        return newEstimate;
      } catch (error) {
        console.error("Error adding fixed estimate:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const updateFixedEstimate = useCallback(
    async (id: string, data: Partial<FixedEstimateRecord>) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const updatedEstimate = await recordsService.updateFixedEstimate(
          id,
          data,
        );
        setFixedEstimates((prev) =>
          prev.map((estimate) =>
            estimate.id === id ? { ...estimate, ...updatedEstimate } : estimate,
          ),
        );
        return updatedEstimate;
      } catch (error) {
        console.error("Error updating fixed estimate:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const deleteFixedEstimate = useCallback(
    async (id: string) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        await recordsService.deleteFixedEstimate(id);
        setFixedEstimates((prev) =>
          prev.filter((estimate) => estimate.id !== id),
        );
      } catch (error) {
        console.error("Error deleting fixed estimate:", error);
        throw error;
      }
    },
    [recordsService],
  );

  return {
    // State
    incomesManual,
    expensesManual,
    expensesManualOther,
    expensesManualCreditCard,
    fixedEstimates,
    incomesFixed,
    expensesFixed,
    isLoading,

    // Income methods
    fetchIncomeById,
    addIncome,
    updateIncome,
    deleteIncome,

    // Expense methods
    findExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,
    payCreditCardExpense,

    // Fixed Estimate methods
    addFixedEstimate,
    updateFixedEstimate,
    deleteFixedEstimate,
    confirmFixedEstimate,
  };
};

export default useFinancialRecords;
