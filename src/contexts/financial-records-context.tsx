"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  startOfMonth,
  differenceInCalendarMonths,
  differenceInSeconds,
  endOfMonth,
} from "date-fns";
import { FinancialRecordsService } from "@/lib/services/financial-records-service";
import { IncomeRecord, ExpenseRecord, FixedEstimateRecord } from "@/lib/types";
import { useAppServices } from "@/contexts/app-services-context";

export interface FinancialRecordsContextType {
  // Default data (current month)
  incomesManual: IncomeRecord[];
  expensesManual: ExpenseRecord[];
  expensesManualOther: ExpenseRecord[];
  expensesManualCreditCard: ExpenseRecord[];
  fixedEstimates: FixedEstimateRecord[];
  incomesFixed: FixedEstimateRecord[];
  expensesFixed: FixedEstimateRecord[];
  isLoading: boolean;

  // Methods
  fetchIncomeById: (id: string) => Promise<IncomeRecord | null>;
  addIncome: (
    data: Omit<IncomeRecord, "id" | "createdAt" | "recordType">,
  ) => Promise<void>;
  updateIncome: (
    id: string,
    data: Partial<IncomeRecord>,
  ) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  fetchExpenseById: (id: string) => Promise<ExpenseRecord | null>;
  addExpense: (
    data: Omit<ExpenseRecord, "id" | "createdAt" | "recordType">,
  ) => Promise<void>;
  updateExpense: (
    id: string,
    data: Partial<ExpenseRecord>,
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  payCreditCardExpense: (
    expense: ExpenseRecord,
    payDate: Date,
  ) => Promise<void>;
  addFixedEstimate: (
    data: Omit<FixedEstimateRecord, "id" | "createdAt" | "recordType">,
  ) => Promise<void>;
  updateFixedEstimate: (
    id: string,
    data: Partial<FixedEstimateRecord>,
  ) => Promise<void>;
  deleteFixedEstimate: (id: string) => Promise<void>;
  confirmFixedEstimate: (
    fixedEstimate: FixedEstimateRecord,
    confirmDate: Date,
  ) => Promise<void>;
}

export const FinancialRecordsContext = createContext<
  FinancialRecordsContextType | undefined
>(undefined);

export const FinancialRecordsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { financialRecordsService: recordsService } = useAppServices();

  // Default date range (current month)
  const { defaultStartDate, defaultEndDate } = useMemo(() => {
    const now = new Date();
    return {
      defaultStartDate: startOfMonth(now),
      defaultEndDate: endOfMonth(now),
    };
  }, []);

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

  const setupSubscriptions = useCallback(() => {
    if (!recordsService) return;

    setIsLoading(true);

    const unsubscribes = [
      subscribeToIncomes(recordsService),
      subscribeToExpensesManualOther(recordsService),
      subscribeToExpensesManualCreditCard(recordsService),
      subscribeToFixedEstimates(recordsService),
    ];

    setIsLoading(false);

    return () => unsubscribes.forEach((unsub) => unsub?.());
  }, [recordsService]);

  // Initial subscriptions
  useEffect(() => {
    const unsubscribe = setupSubscriptions();
    return unsubscribe;
  }, [setupSubscriptions]);

  useEffect(() => {
    const records = [...expensesManualOther, ...expensesManualCreditCard].sort(
      (a, b) => differenceInSeconds(b.date!, a.date!),
    );
    setExpensesManual(records);
  }, [expensesManualOther, expensesManualCreditCard]);

  // Income operations
  const subscribeToIncomes = (service: FinancialRecordsService) => {
    return service.subscribeToIncomesWithin(
      defaultStartDate,
      defaultEndDate,
      (records) => {
        setIncomesManual(records);
      },
    );
  };

  const fetchIncomeById = useCallback(
    async (id: string) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      return await recordsService.fetchIncomeById(id);
    },
    [recordsService],
  );

  const addIncome = useCallback(
    async (data: Omit<IncomeRecord, "id" | "createdAt" | "recordType">) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.addIncome(data);
    },
    [recordsService],
  );

  const updateIncome = useCallback(
    async (id: string, data: Partial<IncomeRecord>) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.updateIncome(id, data);
    },
    [recordsService],
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      setIsLoading(true);
      await recordsService.deleteIncome(id);
      setIsLoading(false);
    },
    [recordsService],
  );

  // Expense operations
  const subscribeToExpensesManualOther = (service: FinancialRecordsService) => {
    return service.subscribeToExpensesWithin(
      defaultStartDate,
      defaultEndDate,
      (records) => {
        const other = records.filter((record) => record.type === "Other");
        setExpensesManualOther(other);
      },
    );
  };

  const subscribeToExpensesManualCreditCard = (
    service: FinancialRecordsService,
  ) => {
    return service.subscribeToExpenses(
      (records) => {
        const computed = records
          .map((record) => {
            const monthsDiff = differenceInCalendarMonths(
              defaultEndDate,
              startOfMonth(record.date!),
            );
            if (monthsDiff < 0) return null;

            const copy = { ...record };
            copy.installmentMonthIndex = copy.numberOfInstallments;

            if (copy.isInstallment && copy.numberOfInstallments) {
              if (monthsDiff < copy.numberOfInstallments) {
                copy.installmentMonthIndex = monthsDiff + 1;
              }
            }

            return copy;
          })
          .filter((record): record is ExpenseRecord => record !== null);
        setExpensesManualCreditCard(computed);
      },
      { type: "Credit Card", isClosed: false },
    );
  };

  const fetchExpenseById = useCallback(
    async (id: string) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      return await recordsService.fetchExpenseById(id);
    },
    [recordsService],
  );

  const addExpense = useCallback(
    async (data: Omit<ExpenseRecord, "id" | "createdAt" | "recordType">) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.addExpense(data);
    },
    [recordsService],
  );

  const updateExpense = useCallback(
    async (id: string, data: Partial<ExpenseRecord>) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.updateExpense(id, data);
    },
    [recordsService],
  );

  const payCreditCardExpense = useCallback(
    async (expense: ExpenseRecord, payDate: Date) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.payCreditCardExpense(
        expense,
        payDate,
      );
    },
    [recordsService],
  );

  const confirmFixedEstimate = useCallback(
    async (fixedEstimate: FixedEstimateRecord, confirmDate: Date) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.confirmFixedEstimate(
        fixedEstimate,
        confirmDate,
      );
    },
    [recordsService],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      setIsLoading(true);
      await recordsService.deleteExpense(id);
      setIsLoading(false);
    },
    [recordsService],
  );

  // Fixed Estimate operations
  const subscribeToFixedEstimates = (service: FinancialRecordsService) => {
    return service.subscribeToFixedEstimates((records) => {
      setFixedEstimates(records);
      setIncomesFixed(records.filter((estimate) => !estimate.isExpense));
      setExpensesFixed(records.filter((estimate) => estimate.isExpense));
    });
  };

  const addFixedEstimate = useCallback(
    async (
      data: Omit<FixedEstimateRecord, "id" | "createdAt" | "recordType">,
    ) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.addFixedEstimate(data);
    },
    [recordsService],
  );

  const updateFixedEstimate = useCallback(
    async (id: string, data: Partial<FixedEstimateRecord>) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      await recordsService.updateFixedEstimate(
        id,
        data,
      );
    },
    [recordsService],
  );

  const deleteFixedEstimate = useCallback(
    async (id: string) => {
      if (!recordsService)
        throw new Error("Financial records service not initialized");

      setIsLoading(true);
      await recordsService.deleteFixedEstimate(id);
      setIsLoading(false);
    },
    [recordsService],
  );

  const value: FinancialRecordsContextType = {
    incomesManual,
    expensesManual,
    expensesManualOther,
    expensesManualCreditCard,
    fixedEstimates,
    incomesFixed,
    expensesFixed,
    isLoading,
    fetchIncomeById,
    addIncome,
    updateIncome,
    deleteIncome,
    fetchExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,
    payCreditCardExpense,
    addFixedEstimate,
    updateFixedEstimate,
    deleteFixedEstimate,
    confirmFixedEstimate,
  };

  return (
    <FinancialRecordsContext.Provider value={value}>
      {children}
    </FinancialRecordsContext.Provider>
  );
};

export const useFinancialRecords = () => {
  const context = useContext(FinancialRecordsContext);
  if (!context) {
    throw new Error(
      "useFinancialRecords must be used within a FinancialRecordsProvider",
    );
  }
  return context;
};
