"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { InvestmentService } from "@/lib/services/investment-service";
import { AppSettingsService } from "@/lib/services/app-settings-service";
import {
  FinancialRecordsService,
  IncomeRecord,
  ExpenseRecord,
  FixedEstimateRecord,
} from "@/lib/services/financial-records-service";
import { DashboardService } from "@/lib/services/dashboard-service";
import type {
  Investment,
  Transaction,
  DashboardSummary,
  AppSettings,
} from "@/lib/types";

export interface InvestmentContextType {
  // Investments
  investments: Investment[];
  isLoading: boolean;
  getInvestmentsByType: (type: string) => Investment[];
  getInvestmentById: (id: string) => Promise<Investment | undefined>;
  addInvestment: (
    investmentData: Omit<Investment, "id" | "createdAt">,
  ) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  removeDirectDebtInvestment: (investmentId: string) => Promise<void>;
  removeRealEstateInvestment: (investmentId: string) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  addTransaction: (
    transactionData: Omit<Transaction, "id" | "createdAt">,
  ) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteSellTransaction: (transaction: Transaction) => Promise<void>;
  recordSellStockTransaction: (
    listedsecurityId: string,
    tickerSymbol: string,
    numberOfSharesToSell: number,
    sellPricePerShare: number,
    sellDate: string,
    fees: number,
  ) => Promise<void>;

  // Dashboard
  dashboardSummary: DashboardSummary;
  refreshDashboard: () => Promise<void>;

  // Income & Expenses
  incomeRecords: IncomeRecord[];
  addIncomeRecord: (
    data: Omit<IncomeRecord, "id" | "createdAt">,
  ) => Promise<IncomeRecord>;
  updateIncomeRecord: (
    id: string,
    data: Partial<IncomeRecord>,
  ) => Promise<IncomeRecord>;
  deleteIncomeRecord: (id: string) => Promise<void>;

  expenseRecords: ExpenseRecord[];
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

const defaultDashboardSummary: DashboardSummary = {
  totalInvested: 0,
  totalRealizedPnL: 0,
  totalCashBalance: 0,
  totalMaturedDebt: 0,
  updatedAt: new Date().toISOString(),
};

const defaultAppSettings: AppSettings = {
  financialYearStartMonth: 1, // January
};

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
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>(
    [],
  );
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(
    defaultDashboardSummary,
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

  // Initialize services when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      const investmentService = new InvestmentService(user.uid);
      const settingsService = new AppSettingsService(user.uid);
      const recordsService = new FinancialRecordsService(user.uid);

      setInvestmentService(investmentService);
      setAppSettingsService(settingsService);
      setFinancialRecordsService(recordsService);
      loadInitialData(investmentService, settingsService, recordsService);
    }
  }, [user?.uid]);

  const loadInitialData = async (
    investmentService: InvestmentService,
    settingsService: AppSettingsService,
    recordsService: FinancialRecordsService,
  ) => {
    try {
      setIsLoading(true);
      // Load critical data first
      await fetchAppSettings(settingsService);

      // Then load remaining data in parallel
      await Promise.all([
        fetchInvestments(investmentService),
        fetchTransactions(investmentService),
        fetchIncomeRecords(recordsService),
        fetchExpenseRecords(recordsService),
        fetchFixedEstimates(recordsService),
        fetchDashboardSummary(investmentService),
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Data fetching functions
  const fetchInvestments = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const fetchDashboardSummary = async (service: InvestmentService) => {
    // Implementation will be added
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
    // Implementation will be added
  };

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const deleteInvestment = async (id: string) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const removeDirectDebtInvestment = async (investmentId: string) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const removeRealEstateInvestment = async (investmentId: string) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  // CRUD operations for transactions
  const fetchTransactions = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const addTransaction = async (
    transactionData: Omit<Transaction, "id" | "createdAt">,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const deleteTransaction = async (id: string) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const deleteSellTransaction = async (transaction: Transaction) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  const recordSellStockTransaction = async (
    listedsecurityId: string,
    tickerSymbol: string,
    numberOfSharesToSell: number,
    sellPricePerShare: number,
    sellDate: string,
    fees: number,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    // Implementation will be added
  };

  // CRUD operations for Income
  const fetchIncomeRecords = async (service: FinancialRecordsService) => {
    try {
      const records = await service.getIncomeRecords();
      setIncomeRecords(records);
      return records;
    } catch (error) {
      console.error("Error fetching income records:", error);
      setIncomeRecords([]);
      return [];
    }
  };

  const addIncomeRecord = async (
    data: Omit<IncomeRecord, "id" | "createdAt">,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const newRecord = await financialRecordsService.addIncomeRecord(data);
      setIncomeRecords((prev) => [newRecord, ...prev]);
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
      const updatedRecord = await financialRecordsService.updateIncomeRecord(
        id,
        data,
      );
      setIncomeRecords((prev) =>
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
      await financialRecordsService.deleteIncomeRecord(id);
      setIncomeRecords((prev) => prev.filter((record) => record.id !== id));
    } catch (error) {
      console.error("Error deleting income record:", error);
      throw error;
    }
  };

  // CRUD operations for Expenses
  const fetchExpenseRecords = async (service: FinancialRecordsService) => {
    try {
      const records = await service.getExpenseRecords();
      setExpenseRecords(records);
      return records;
    } catch (error) {
      console.error("Error fetching expense records:", error);
      setExpenseRecords([]);
      return [];
    }
  };

  const addExpenseRecord = async (
    data: Omit<ExpenseRecord, "id" | "createdAt">,
  ) => {
    if (!financialRecordsService)
      throw new Error("Financial records service not initialized");
    try {
      const newRecord = await financialRecordsService.addExpenseRecord(data);
      setExpenseRecords((prev) => [newRecord, ...prev]);
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
      const updatedRecord = await financialRecordsService.updateExpenseRecord(
        id,
        data,
      );
      setExpenseRecords((prev) =>
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
      await financialRecordsService.deleteExpenseRecord(id);
      setExpenseRecords((prev) => prev.filter((record) => record.id !== id));
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
    if (!investmentService)
      throw new Error("Investment service not initialized");
    await fetchDashboardSummary(investmentService);
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
    updateInvestment,
    deleteInvestment,
    removeDirectDebtInvestment,
    removeRealEstateInvestment,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteSellTransaction,
    recordSellStockTransaction,
    dashboardSummary,
    refreshDashboard,
    incomeRecords,
    addIncomeRecord,
    updateIncomeRecord,
    deleteIncomeRecord,
    expenseRecords,
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
