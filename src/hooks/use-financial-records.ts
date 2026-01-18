"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FinancialRecordsService } from "@/lib/services/financial-records-service";
import { IncomeRecord, ExpenseRecord, FixedEstimateRecord } from "@/lib/types";
import { useAppServices } from "@/contexts/app-services-context";

export const useFinancialRecords = (
  startDateParam: Date,
  endDateParam: Date,
) => {
  const { financialRecordsService: recordsService } = useAppServices();
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
          fetchExpensesManual(recordsService, startDate, endDate),
          fetchExpensesManualCreditCard(recordsService),
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
    fetchFinancialRecords(startDateParam, endDateParam);
  }, [startDateParam, endDateParam, fetchFinancialRecords]);

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
        console.log(`fetchIncomeById: ${id}`);
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

  const fetchExpensesManual = async (
    service: FinancialRecordsService,
    start: Date,
    end: Date,
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

  const fetchExpensesManualCreditCard = async (
    service: FinancialRecordsService,
  ) => {
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
        setExpensesManualOther((prev) =>
          prev.filter((record) => record.id !== id),
        );
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

    // Fixed Estimate methods
    addFixedEstimate,
    updateFixedEstimate,
    deleteFixedEstimate,
  };
};

export default useFinancialRecords;
