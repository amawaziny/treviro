"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { InvestmentService } from "@/lib/services/investment-service";
import { Investment, InvestmentType } from "@/lib/types";
import { hoursToMilliseconds } from "date-fns";

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
  editInvestment: (
    id: string,
    investment: Partial<Investment>,
  ) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [investmentService, setInvestmentService] =
    useState<InvestmentService | null>(null);

  // Initialize services when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      const investmentService = new InvestmentService(user.uid);
      setInvestmentService(investmentService);
      loadInitialData(investmentService);
    }
  }, [user?.uid]);

  // Check for matured debt instruments on initial load and periodically
  useEffect(() => {
    if (!investmentService) return;

    investmentService.handleMaturedDebtInstruments();
    const checkMaturedDebtInterval = setInterval(() => {
      investmentService.handleMaturedDebtInstruments();
    }, hoursToMilliseconds(24));

    return () => clearInterval(checkMaturedDebtInterval);
  }, [investmentService]);

  const loadInitialData = async (investmentService: InvestmentService) => {
    try {
      setIsLoading(true);
      await fetchInvestments(investmentService);
    } catch (error) {
      console.error("Error loading investments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Data fetching functions
  const fetchInvestments = async (service: InvestmentService) => {
    const investments = await service.getOpenedInvestments();
    setInvestments(investments);
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

  const editInvestment = async (
    id: string,
    investmentData: Partial<Investment>,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    const investment = await investmentService.editInvestment(
      id,
      investmentData,
    );
    setInvestments((prev) =>
      prev.map((inv) => (inv.id === id ? investment : inv)),
    );
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
    editInvestment,
    buy,
    sell,
    pay,
    addDividend,
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
