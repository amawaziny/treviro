"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { InvestmentService } from "@/lib/services/investment-service";
import { AppSettingsService } from "@/lib/services/app-settings-service";
import type { 
  Investment, 
  Transaction, 
  DashboardSummary, 
  AppSettings,
  IncomeRecord,
  ExpenseRecord,
  FixedEstimateRecord
} from "@/lib/types";

export interface InvestmentContextType {
  // Investments
  investments: Investment[];
  isLoading: boolean;
  getInvestmentsByType: (type: string) => Investment[];
  getInvestmentById: (id: string) => Promise<Investment | undefined>;
  addInvestment: (investmentData: Omit<Investment, "id" | "createdAt">) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  removeDirectDebtInvestment: (investmentId: string) => Promise<void>;
  removeRealEstateInvestment: (investmentId: string) => Promise<void>;
  
  // Transactions
  transactions: Transaction[];
  addTransaction: (transactionData: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
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
  addIncomeRecord: (data: Omit<IncomeRecord, "id" | "createdAt">) => Promise<void>;
  updateIncomeRecord: (id: string, data: Partial<IncomeRecord>) => Promise<void>;
  deleteIncomeRecord: (id: string) => Promise<void>;
  
  expenseRecords: ExpenseRecord[];
  addExpenseRecord: (data: Omit<ExpenseRecord, "id" | "createdAt">) => Promise<void>;
  updateExpenseRecord: (id: string, data: Partial<ExpenseRecord>) => Promise<void>;
  deleteExpenseRecord: (id: string) => Promise<void>;
  
  // Fixed Estimates
  fixedEstimates: FixedEstimateRecord[];
  addFixedEstimate: (data: Omit<FixedEstimateRecord, "id" | "createdAt">) => Promise<void>;
  updateFixedEstimate: (id: string, data: Partial<FixedEstimateRecord>) => Promise<void>;
  deleteFixedEstimate: (id: string) => Promise<void>;
  
  // App Settings
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}

const defaultDashboardSummary: DashboardSummary = {
  totalInvestedAcrossAllAssets: 0,
  totalRealizedPnL: 0,
  totalCashBalance: 0,
};

const defaultAppSettings: AppSettings = {
  financialYearStartMonth: 1, // January
};

export const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [fixedEstimates, setFixedEstimates] = useState<FixedEstimateRecord[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(defaultDashboardSummary);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [investmentService, setInvestmentService] = useState<InvestmentService | null>(null);
  const [appSettingsService, setAppSettingsService] = useState<AppSettingsService | null>(null);

  // Initialize services when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      const investmentService = new InvestmentService(user.uid);
      const settingsService = new AppSettingsService(user.uid);
      
      setInvestmentService(investmentService);
      setAppSettingsService(settingsService);
      loadInitialData(investmentService, settingsService);
    }
  }, [user?.uid]);

  const loadInitialData = async (investmentService: InvestmentService, settingsService: AppSettingsService) => {
    try {
      setIsLoading(true);
          // Load critical data first
      await fetchAppSettings(settingsService);
      
      // Then load remaining data in parallel
      await Promise.all([
        fetchInvestments(investmentService),
        fetchTransactions(investmentService),
        fetchIncomeRecords(investmentService),
        fetchExpenseRecords(investmentService),
        fetchFixedEstimates(investmentService),
        fetchDashboardSummary(investmentService)
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
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
      
      setAppSettings(prev => ({
        ...defaultAppSettings, // Start with defaults
        ...settings, // Override with saved settings
        ...prev // Keep any existing state that might be needed
      }));
    } catch (error) {
      console.error('Error in fetchAppSettings:', error);
      setAppSettings(defaultAppSettings);
    }
  };

  // CRUD operations for investments
  const addInvestment = async (investmentData: Omit<Investment, "id" | "createdAt">) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const deleteInvestment = async (id: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const removeDirectDebtInvestment = async (investmentId: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const removeRealEstateInvestment = async (investmentId: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  // CRUD operations for transactions
  const fetchTransactions = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const addTransaction = async (transactionData: Omit<Transaction, "id" | "createdAt">) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const deleteTransaction = async (id: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const deleteSellTransaction = async (transaction: Transaction) => {
    if (!investmentService) throw new Error('Investment service not initialized');
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
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  // CRUD operations for Income
  const fetchIncomeRecords = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const addIncomeRecord = async (incomeRecordData: Omit<IncomeRecord, "id" | "createdAt">) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const updateIncomeRecord = async (id: string, data: Partial<IncomeRecord>) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const deleteIncomeRecord = async (id: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  // CRUD operations for Expenses
  const fetchExpenseRecords = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const addExpenseRecord = async (expenseRecordData: Omit<ExpenseRecord, "id" | "createdAt">) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const updateExpenseRecord = async (id: string, data: Partial<ExpenseRecord>) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const deleteExpenseRecord = async (id: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  // CRUD operations for Fixed Estimates
  const fetchFixedEstimates = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const addFixedEstimate = async (fixedEstimateRecordData: Omit<FixedEstimateRecord, "id" | "createdAt">) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const updateFixedEstimate = async (id: string, data: Partial<FixedEstimateRecord>) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  const deleteFixedEstimate = async (id: string) => {
    if (!investmentService) throw new Error('Investment service not initialized');
    // Implementation will be added
  };

  // App Settings Operations
  const updateAppSettings = async (settings: Partial<AppSettings>) => {
    if (!appSettingsService) throw new Error('App settings service not initialized');
    
    try {
      // Update in the database
      const updatedSettings = await appSettingsService.updateAppSettings(settings);
      
      // Update local state
      setAppSettings(prev => ({
        ...prev,
        ...updatedSettings
      }));
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw error;
    }
  };

  const refreshDashboard = async () => {
    if (!investmentService) throw new Error('Investment service not initialized');
    await fetchDashboardSummary(investmentService);
  };

  const getInvestmentsByType = (type: string): Investment[] => {
    return investments.filter(inv => inv.type === type);
  };

  const getInvestmentById = async (id: string): Promise<Investment | undefined> => {
    return investments.find(inv => inv.id === id);
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
    throw new Error('useInvestment must be used within an InvestmentProvider');
  }
  return context;
};
