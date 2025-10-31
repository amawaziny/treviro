"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { InvestmentService } from "@/lib/services/investment-service";
import { AppSettingsService } from "@/lib/services/app-settings-service";
import {
  IncomeRecord,
  ExpenseRecord,
  FixedEstimateRecord,
  defaultAppSettings,
  defaultDashboardSummaries,
} from "@/lib/types";
import type {
  Investment,
  Transaction,
  DashboardSummary,
  AppSettings,
  InvestmentType,
  DashboardSummaries,
} from "@/lib/types";
import { FinancialRecordsService } from "@/lib/services/financial-records-service";
import { DashboardService } from "@/lib/services/dashboard-service";
import { TransactionService } from "@/lib/services/transaction-service";

export interface InvestmentContextType {
  // Investments
  investments: Investment[];
  isLoading: boolean;
  getInvestmentsByType: (type: string) => Investment[];
  getInvestmentById: (id: string) => Promise<Investment | undefined>;
  addInvestment: (
    investmentData: Omit<Investment, "id" | "createdAt">,
  ) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  buy: (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
  ) => Promise<void>;
  sell: (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
  ) => Promise<void>;
  pay: (
    investmentId: string,
    investmentType: InvestmentType,
    installmentNumber: number,
    amount: number,
    date: string,
  ) => Promise<void>;
  addDividend: (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    amount: number,
    date: string,
  ) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  getTransactionsBySourceId: (sourceId: string) => Promise<Transaction[]>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Dashboard
  dashboardSummary: DashboardSummary;
  refreshDashboard: () => Promise<void>;

  // Income & Expenses
  incomes: IncomeRecord[];
  addIncomeRecord: (
    data: Omit<IncomeRecord, "id" | "createdAt">,
  ) => Promise<IncomeRecord>;
  updateIncomeRecord: (
    id: string,
    data: Partial<IncomeRecord>,
  ) => Promise<IncomeRecord>;
  deleteIncomeRecord: (id: string) => Promise<void>;

  expenses: ExpenseRecord[];
  addExpenseRecord: (
    data: Omit<ExpenseRecord, "id" | "createdAt">,
  ) => Promise<ExpenseRecord>;
  updateExpenseRecord: (
    id: string,
    data: Partial<ExpenseRecord>,
  ) => Promise<ExpenseRecord>;
  deleteExpenseRecord: (id: string) => Promise<void>;

  // Fixed Estimates
  fixedEstimates: FixedEstimateRecord[];
  addFixedEstimate: (
    data: Omit<FixedEstimateRecord, "id" | "createdAt">,
  ) => Promise<FixedEstimateRecord>;
  updateFixedEstimate: (
    id: string,
    data: Partial<FixedEstimateRecord>,
  ) => Promise<FixedEstimateRecord>;
  deleteFixedEstimate: (id: string) => Promise<void>;

  // App Settings
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}

export const InvestmentContext = createContext<
  InvestmentContextType | undefined
>(undefined);

export const InvestmentProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>(
    [],
  );
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaries>(
    defaultDashboardSummaries,
  );
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [investmentService, setInvestmentService] =
    useState<InvestmentService | null>(null);
  const [appSettingsService, setAppSettingsService] =
    useState<AppSettingsService | null>(null);
  const [financialRecordsService, setFinancialRecordsService] =
    useState<FinancialRecordsService | null>(null);
  const [dashboardService, setDashboardService] =
    useState<DashboardService | null>(null);
  const [transactionService, setTransactionService] =
    useState<TransactionService | null>(null);

  // Initialize services when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      const settingsService = new AppSettingsService(user.uid);
      const recordsService = new FinancialRecordsService(user.uid);
      const investmentService = new InvestmentService(user.uid);
      const transactionService = new TransactionService(user.uid);
      const dashboardService = new DashboardService(
        user.uid,
        investmentService,
        transactionService,
      );

      setInvestmentService(investmentService);
      setAppSettingsService(settingsService);
      setFinancialRecordsService(recordsService);
      setDashboardService(dashboardService);
      setTransactionService(transactionService);
      loadInitialData(
        investmentService,
        settingsService,
        recordsService,
        dashboardService,
      );
    }
  }, [user?.uid]);

  // Check for matured debt instruments on initial load and periodically
  useEffect(() => {
    if (!investmentService) return;

    investmentService.handleMaturedDebtInstruments();
    const checkMaturedDebtInterval = setInterval(
      () => {
        investmentService.handleMaturedDebtInstruments();
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours

    return () => clearInterval(checkMaturedDebtInterval);
  }, [investmentService]);

  const loadInitialData = async (
    investmentService: InvestmentService,
    settingsService: AppSettingsService,
    recordsService: FinancialRecordsService,
    dashboardService: DashboardService,
  ) => {
    try {
      setIsLoading(true);
      // Load critical data first
      await fetchAppSettings(settingsService);

      // Then load remaining data in parallel
      await Promise.all([
        fetchInvestments(investmentService),
        fetchIncomes(recordsService),
        fetchExpenses(recordsService),
        fetchFixedEstimates(recordsService),
        fetchDashboardSummary(dashboardService),
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Data fetching functions
  const fetchInvestments = async (service: InvestmentService) => {
    const investments = await service.getInvestments();
    setInvestments(investments);
  };

  const fetchDashboardSummary = async (service: DashboardService) => {
    const summary = await service.getDashboardSummary();
    setDashboardSummary(summary);
  };

  const fetchAppSettings = async (service: AppSettingsService) => {
    try {
      let settings = await service.getAppSettings();

      // If no settings exist, initialize with defaults
      if (!settings) {
        settings = await service.initializeDefaultSettings();
      }

      setAppSettings((prev) => ({
        ...defaultAppSettings, // Start with defaults
        ...settings, // Override with saved settings
        ...prev, // Keep any existing state that might be needed
      }));
    } catch (error) {
      console.error("Error in fetchAppSettings:", error);
      setAppSettings(defaultAppSettings);
    }
  };

  // CRUD operations for investments
  const addInvestment = async (
    investmentData: Omit<Investment, "id" | "createdAt">,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    const investment = await investmentService.buyNew(investmentData);
    setInvestments((prev) => [investment, ...prev]);
  };

  const deleteInvestment = async (id: string) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    await investmentService.deleteInvestment(id);
    setInvestments((prev) => prev.filter((inv) => inv.id !== id));
  };

  const buy = async (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    const investment = await investmentService.buy(
      investmentId,
      securityId,
      investmentType,
      quantity,
      pricePerUnit,
      fees,
      date,
    );
    setInvestments((prev) =>
      prev.map((inv) => (inv.id === investmentId ? investment : inv)),
    );
  };

  const sell = async (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: string,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    const investment = await investmentService.sell(
      investmentId,
      securityId,
      investmentType,
      quantity,
      pricePerUnit,
      fees,
      date,
    );
    setInvestments((prev) =>
      prev.map((inv) => (inv.id === investmentId ? investment : inv)),
    );
  };

  const pay = async (
    investmentId: string,
    investmentType: InvestmentType,
    installmentNumber: number,
    amount: number,
    date: string,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    const investment = await investmentService.pay(
      investmentId,
      investmentType,
      installmentNumber,
      amount,
      date,
    );
    setInvestments((prev) =>
      prev.map((inv) => (inv.id === investmentId ? investment : inv)),
    );
  };

  const addDividend = async (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    amount: number,
    date: string,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
   await investmentService.addDividend(
      investmentId,
      securityId,
      investmentType,
      amount,
      date,
    ); 
  };  

  // CRUD operations for transactions
  const getTransactionsBySourceId = async (sourceId: string) => {
    if (!transactionService)
      throw new Error("Transaction service not initialized");
    const transactions =
      await transactionService.getTransactionsBySourceId(sourceId);
    setTransactions(transactions);
    return transactions;
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (!transactionService)
      throw new Error("Transaction service not initialized");
    await transactionService.updateTransaction(id, data);
    setTransactions((prev) =>
      prev.map((txn) => (txn.id === id ? { ...txn, ...data } : txn)),
    );
  };

  const deleteTransaction = async (id: string) => {
    if (!transactionService)
      throw new Error("Transaction service not initialized");
    await transactionService.deleteTransaction(id);
    setTransactions((prev) => prev.filter((txn) => txn.id !== id));
  };

  // CRUD operations for Income
  const fetchIncomes = async (service: FinancialRecordsService) => {
    try {
      const records = await service.getIncomes();
      setIncomes(records);
      return records;
    } catch (error) {
      console.error("Error fetching income records:", error);
      setIncomes([]);
      return [];
    }
  };

  const addIncomeRecord = async (
    data: Omit<IncomeRecord, "id" | "createdAt">,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const newRecord = await financialRecordsService.addIncome(data);
      setIncomes((prev) => [newRecord, ...prev]);
      return newRecord;
    } catch (error) {
      console.error("Error adding income record:", error);
      throw error;
    }
  };

  const updateIncomeRecord = async (
    id: string,
    data: Partial<IncomeRecord>,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const updatedRecord = await financialRecordsService.updateIncome(
        id,
        data,
      );
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
  };

  const deleteIncomeRecord = async (id: string) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      await financialRecordsService.deleteIncome(id);
      setIncomes((prev) => prev.filter((record) => record.id !== id));
    } catch (error) {
      console.error("Error deleting income record:", error);
      throw error;
    }
  };

  // CRUD operations for Expenses
  const fetchExpenses = async (service: FinancialRecordsService) => {
    try {
      const records = await service.getExpenses();
      setExpenses(records);
      return records;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpenses([]);
      return [];
    }
  };

  const addExpenseRecord = async (
    data: Omit<ExpenseRecord, "id" | "createdAt">,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const newRecord = await financialRecordsService.addExpense(data);
      setExpenses((prev) => [newRecord, ...prev]);
      return newRecord;
    } catch (error) {
      console.error("Error adding expense record:", error);
      throw error;
    }
  };

  const updateExpenseRecord = async (
    id: string,
    data: Partial<ExpenseRecord>,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const updatedRecord = await financialRecordsService.updateExpense(
        id,
        data,
      );
      setExpenses((prev) =>
        prev.map((record) =>
          record.id === id ? { ...record, ...updatedRecord } : record,
        ),
      );
      return updatedRecord;
    } catch (error) {
      console.error("Error updating expense record:", error);
      throw error;
    }
  };

  const deleteExpenseRecord = async (id: string) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      await financialRecordsService.deleteExpense(id);
      setExpenses((prev) => prev.filter((record) => record.id !== id));
    } catch (error) {
      console.error("Error deleting expense record:", error);
      throw error;
    }
  };

  // CRUD operations for Fixed Estimates
  const fetchFixedEstimates = async (service: FinancialRecordsService) => {
    try {
      const estimates = await service.getFixedEstimates();
      setFixedEstimates(estimates);
      return estimates;
    } catch (error) {
      console.error("Error fetching fixed estimates:", error);
      setFixedEstimates([]);
      return [];
    }
  };

  const addFixedEstimate = async (
    data: Omit<FixedEstimateRecord, "id" | "createdAt">,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const newEstimate = await financialRecordsService.addFixedEstimate(data);
      setFixedEstimates((prev) => [newEstimate, ...prev]);
      return newEstimate;
    } catch (error) {
      console.error("Error adding fixed estimate:", error);
      throw error;
    }
  };

  const updateFixedEstimate = async (
    id: string,
    data: Partial<FixedEstimateRecord>,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const updatedEstimate = await financialRecordsService.updateFixedEstimate(
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
  };

  const deleteFixedEstimate = async (id: string) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      await financialRecordsService.deleteFixedEstimate(id);
      setFixedEstimates((prev) =>
        prev.filter((estimate) => estimate.id !== id),
      );
    } catch (error) {
      console.error("Error deleting fixed estimate:", error);
      throw error;
    }
  };

  // App Settings Operations
  const updateAppSettings = async (settings: Partial<AppSettings>) => {
    if (!appSettingsService)
      throw new Error("App settings service not initialized");

    try {
      // Update in the database
      const updatedSettings =
        await appSettingsService.updateAppSettings(settings);

      // Update local state
      setAppSettings((prev) => ({
        ...prev,
        ...updatedSettings,
      }));

      return updatedSettings;
    } catch (error) {
      console.error("Error updating app settings:", error);
      throw error;
    }
  };

  const refreshDashboard = async () => {
    if (!dashboardService) throw new Error("Dashboard service not initialized");
    await dashboardService.recalculateDashboardSummary();
  };

  const getInvestmentsByType = (type: string): Investment[] => {
    return investments.filter((inv) => inv.type === type);
  };

  const getInvestmentById = async (
    id: string,
  ): Promise<Investment | undefined> => {
    return investments.find((inv) => inv.id === id);
  };

  const contextValue: InvestmentContextType = {
    investments,
    isLoading,
    getInvestmentsByType,
    getInvestmentById,
    addInvestment,
    deleteInvestment,
    buy,
    sell,
    pay,
    addDividend,
    transactions,
    getTransactionsBySourceId,
    updateTransaction,
    deleteTransaction,
    dashboardSummary,
    refreshDashboard,
    incomes,
    addIncomeRecord,
    updateIncomeRecord,
    deleteIncomeRecord,
    expenses,
    addExpenseRecord,
    updateExpenseRecord,
    deleteExpenseRecord,
    fixedEstimates,
    addFixedEstimate,
    updateFixedEstimate,
    deleteFixedEstimate,
    appSettings,
    updateAppSettings,
  };

  return (
    <InvestmentContext.Provider value={contextValue}>
      {children}
    </InvestmentContext.Provider>
  );
};

export const useInvestment = (): InvestmentContextType => {
  const context = useContext(InvestmentContext);
  if (!context) {
    throw new Error("useInvestment must be used within an InvestmentProvider");
  }
  return context;
};
