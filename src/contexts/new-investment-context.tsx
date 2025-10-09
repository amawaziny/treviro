"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { InvestmentService } from "@/lib/services/investment-service";
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
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
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

  // Initialize investment service when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      const service = new InvestmentService(user.uid);
      setInvestmentService(service);
      loadInitialData(service);
    }
  }, [user?.uid]);

  const loadInitialData = async (service: InvestmentService) => {
    try {
      setIsLoading(true);
      // Load initial data in parallel
      await Promise.all([
        fetchInvestments(service),
        fetchTransactions(service),
        fetchIncomeRecords(service),
        fetchExpenseRecords(service),
        fetchFixedEstimates(service),
        fetchDashboardSummary(service),
        fetchAppSettings(service)
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

  const fetchTransactions = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const fetchIncomeRecords = async (service: InvestmentService) => {
    // Implementation will be added
  };
  const fetchExpenseRecords = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const fetchFixedEstimates = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const fetchDashboardSummary = async (service: InvestmentService) => {
    // Implementation will be added
  };

  const fetchAppSettings = async (service: InvestmentService) => {
    // Implementation will be added
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

  // Other CRUD operations will be added here...

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
    addIncomeRecord: async (data) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    updateIncomeRecord: async (id, data) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    deleteIncomeRecord: async (id) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    expenseRecords,
    addExpenseRecord: async (data) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    updateExpenseRecord: async (id, data) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    deleteExpenseRecord: async (id) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    fixedEstimates,
    addFixedEstimate: async (data) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    updateFixedEstimate: async (id, data) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    deleteFixedEstimate: async (id) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
    appSettings,
    updateAppSettings: async (settings) => {
      if (!investmentService) throw new Error('Investment service not initialized');
      // Implementation will be added
    },
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
