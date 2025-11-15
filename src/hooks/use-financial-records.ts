"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FinancialRecordsService } from "@/lib/services/financial-records-service";
import { IncomeRecord, ExpenseRecord, FixedEstimateRecord } from "@/lib/types";
import { formatDateISO } from "@/lib/utils";
import { endOfMonth, startOfMonth } from "date-fns";

export const useFinancialRecords = (
  startDateParam?: Date,
  endDateParam?: Date,
) => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expensesManual, setExpensesManual] = useState<ExpenseRecord[]>([]);
  const [expensesManualOther, setExpensesManualOther] = useState<ExpenseRecord[]>([]);
  const [expensesManualCreditCard, setExpensesManualCreditCard] = useState<
    ExpenseRecord[]
  >([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>(
    [],
  );
  const [incomesFixed, setIncomesFixed] = useState<FixedEstimateRecord[]>([]);
  const [expensesFixed, setExpensesFixed] = useState<FixedEstimateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();

  // Initialize service when user is authenticated
  // Initialize records service
  const recordsService = useMemo(() => {
    if (!user?.uid) return null;
    return new FinancialRecordsService(user.uid);
  }, [user?.uid]);

  const fetchFinancialRecords = useCallback(async () => {
    if (!recordsService)
      throw new Error("Financial records service not initialized");

    try {
      setIsLoading(true);
      await Promise.all([
        fetchIncomes(recordsService, startDate!, endDate!),
        fetchExpensesManualOther(recordsService, startDate!, endDate!),
        fetchExpensesManual(recordsService, startDate!, endDate!),
        fetchExpensesManualCreditCard(recordsService),
        fetchFixedEstimates(recordsService),
      ]);
    } catch (error) {
      console.error("Error loading financial records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [recordsService, startDate, endDate]);

  // Initial fetch
  useEffect(() => {
    setStartDate(formatDateISO(startDateParam || startOfMonth(new Date())));
    setEndDate(formatDateISO(endDateParam || endOfMonth(new Date())));
    fetchFinancialRecords();
  }, [fetchFinancialRecords]);

  // Income operations
  const fetchIncomes = async (
    service: FinancialRecordsService,
    start: string,
    end: string,
  ) => {
    try {
      const records = await service.getIncomesWithin(start, end);
      setIncomes(records);
      return records;
    } catch (error) {
      console.error("Error fetching income records:", error);
      setIncomes([]);
      return [];
    }
  };

  const addIncome = useCallback(
    async (data: Omit<IncomeRecord, "id" | "createdAt">) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const newRecord = await recordsService.addIncome(data);
        setIncomes((prev) => [newRecord, ...prev]);
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
        setIncomes((prev) =>
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
        await recordsService.deleteIncome(id);
        setIncomes((prev) => prev.filter((record) => record.id !== id));
      } catch (error) {
        console.error("Error deleting income record:", error);
        throw error;
      }
    },
    [recordsService],
  );

  const fetchExpensesManual = async (
    service: FinancialRecordsService,
    start: string,
    end: string,
  ) => {
    try {
      const records = await service.getExpensesWithin(start, end);
      setExpensesManual(records);
      return records;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpensesManual([]);
      return [];
    }
  };

  // Expense operations
  const fetchExpensesManualOther = async (
    service: FinancialRecordsService,
    start: string,
    end: string,
  ) => {
    try {
      const records = await service.getExpensesWithin(start, end);
      setExpensesManualOther(records.filter((record) => record.type === "Other"));
      return records;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpensesManualOther([]);
      return [];
    }
  };

  const fetchExpensesManualCreditCard = async (service: FinancialRecordsService) => {
    try {
      const records = await service.getExpenses({
        type: "Credit Card",
        isClosed: false,
      });
      setExpensesManualCreditCard(records);
      return records;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpensesManualCreditCard([]);
      return [];
    }
  };

  const findExpenseById = useCallback(async (id: string) => {
    if (!recordsService) {
      throw new Error("Financial records service not initialized");
    }
    try {
      return await recordsService.findExpenseById(id);
    } catch (error) {
      console.error("Error fetching expense record:", error);
      return null;
    }
  }, [recordsService]);

  const addExpense = useCallback(
    async (data: Omit<ExpenseRecord, "id" | "createdAt">) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        const newRecord = await recordsService.addExpense(data);
        setExpensesManualOther((prev) => [newRecord, ...prev]);
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
        setExpensesManualOther((prev) =>
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

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!recordsService) {
        throw new Error("Financial records service not initialized");
      }
      try {
        await recordsService.deleteExpense(id);
        setExpensesManualOther((prev) => prev.filter((record) => record.id !== id));
      } catch (error) {
        console.error("Error deleting expense record:", error);
        throw error;
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
    async (data: Omit<FixedEstimateRecord, "id" | "createdAt">) => {
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

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!recordsService) return;

    try {
      setIsLoading(true);
      await Promise.all([
        fetchIncomes(recordsService, startDate!, endDate!),
        fetchExpensesManualOther(recordsService, startDate!, endDate!),
        fetchFixedEstimates(recordsService),
      ]);
    } catch (error) {
      console.error("Error refreshing financial records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [recordsService]);

  return {
    // State
    incomes,
    expensesManual,
    expensesManualOther,
    expensesManualCreditCard,
    fixedEstimates,
    incomesFixed,
    expensesFixed,
    isLoading,

    // Income methods
    addIncome,
    updateIncome,
    deleteIncome,

    // Expense methods
    findExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,

    // Fixed Estimate methods
    addFixedEstimate,
    updateFixedEstimate,
    deleteFixedEstimate,

    // Utility methods
    refreshAll,
  };
};

export default useFinancialRecords;
