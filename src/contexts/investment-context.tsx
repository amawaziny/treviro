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
import {
  CurrencyInvestment,
  DebtInstrumentInvestment,
  GoldInvestment,
  Investment,
  InvestmentData,
  InvestmentType,
  isCurrencyInvestment,
  isDebtFundInvestment,
  isDebtInstrumentInvestment,
  isGoldFundInvestment,
  isGoldInvestment,
  isRealEstateInvestment,
  isSecurityInvestment,
  isStockInvestment,
  RealEstateInvestment,
  SecurityInvestment,
} from "@/lib/types";
import { hoursToMilliseconds } from "date-fns";

export interface InvestmentContextType {
  // Investments
  investments: Investment[];
  securityInvestments: SecurityInvestment[];
  debtInvestments: DebtInstrumentInvestment[];
  debtFundInvestments: SecurityInvestment[];
  realEstateInvestments: RealEstateInvestment[];
  currencyInvestments: CurrencyInvestment[];
  goldInvestments: GoldInvestment[];
  goldFundInvestments: SecurityInvestment[];
  stockInvestments: SecurityInvestment[];
  totalStocks: { [key: string]: number };
  totalCurrency: { [key: string]: number };
  totalGold: { [key: string]: number };
  totalDebt: { [key: string]: number };
  totalRealEstate: { [key: string]: number };
  totalPortfolio: { [key: string]: number };
  isLoading: boolean;
  getInvestmentsByType: (type: string) => Investment[];
  getInvestmentById: (id: string) => Investment | undefined;
  getInvestmentBySecurityId: (securityId: string) => Investment | undefined;
  buyNew: <T extends Investment>(
    investmentData: InvestmentData<T>,
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
    installmentNumber: number,
    amount: number,
    date: string,
  ) => Promise<void>;
  addDividend: (
    investmentId: string,
    securityId: string,
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
  const [securityInvestments, setSecurityInvestments] = useState<
    SecurityInvestment[]
  >([]);
  const [stockInvestments, setStockInvestments] = useState<
    SecurityInvestment[]
  >([]);
  const [debtInvestments, setDebtInvestments] = useState<
    DebtInstrumentInvestment[]
  >([]);
  const [debtFundInvestments, setDebtFundInvestments] = useState<
    SecurityInvestment[]
  >([]);
  const [goldInvestments, setGoldInvestments] = useState<GoldInvestment[]>([]);
  const [goldFundInvestments, setGoldFundInvestments] = useState<
    SecurityInvestment[]
  >([]);
  const [realEstateInvestments, setRealEstateInvestments] = useState<
    RealEstateInvestment[]
  >([]);
  const [currencyInvestments, setCurrencyInvestments] = useState<
    CurrencyInvestment[]
  >([]);
  const [totalStocks, setTotalStocks] = useState<{ [key: string]: number }>({});
  const [totalCurrency, setTotalCurrency] = useState<{ [key: string]: number }>(
    {},
  );
  const [totalRealEstate, setTotalRealEstate] = useState<{
    [key: string]: number;
  }>({});
  const [totalDebt, setTotalDebt] = useState<{ [key: string]: number }>({});
  const [totalGold, setTotalGold] = useState<{ [key: string]: number }>({});
  const [totalPortfolio, setTotalPortfolio] = useState<{
    [key: string]: number;
  }>({});
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
      const unrealizedPnL = await investmentService.calculateUnrealizedPnL();
      setTotalPortfolio(unrealizedPnL.portfolio);
      setTotalStocks(unrealizedPnL.stocks);
      setTotalCurrency(unrealizedPnL.currencies);
      setTotalGold(unrealizedPnL.gold);
      setTotalRealEstate(unrealizedPnL.realEstate);
      setTotalDebt(unrealizedPnL.debt);
    } catch (error) {
      console.error("Error loading investments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvestments = async (service: InvestmentService) => {
    const investments = await service.getOpenedInvestments();
    setInvestments(investments);
    setSecurityInvestments(investments.filter(isSecurityInvestment));
    setStockInvestments(investments.filter(isStockInvestment));
    setGoldInvestments(investments.filter(isGoldInvestment));
    setGoldFundInvestments(investments.filter(isGoldFundInvestment));
    setDebtInvestments(investments.filter(isDebtInstrumentInvestment));
    setDebtFundInvestments(investments.filter(isDebtFundInvestment));
    setRealEstateInvestments(investments.filter(isRealEstateInvestment));
    setCurrencyInvestments(investments.filter(isCurrencyInvestment));
  };

  const buyNew = async <T extends Investment>(
    investmentData: InvestmentData<T>,
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
    installmentNumber: number,
    amount: number,
    date: string,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    const investment = await investmentService.pay(
      investmentId,
      "Real Estate",
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
    amount: number,
    date: string,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    await investmentService.addDividend(
      investmentId,
      securityId,
      "Securities",
      amount,
      date,
    );
  };

  const getInvestmentsByType = (type: string): Investment[] => {
    return investments.filter((inv) => inv.type === type);
  };

  const getInvestmentById = (id: string): Investment | undefined => {
    return investments.find((inv) => inv.id === id);
  };

  const getInvestmentBySecurityId = (
    securityId: string,
  ): Investment | undefined => {
    return investments
      .filter(isSecurityInvestment)
      .find((inv) => inv.securityId === securityId);
  };

  const contextValue: InvestmentContextType = {
    investments,
    securityInvestments,
    debtInvestments,
    debtFundInvestments,
    realEstateInvestments,
    currencyInvestments,
    goldInvestments,
    goldFundInvestments,
    stockInvestments,
    totalStocks,
    totalCurrency,
    totalGold,
    totalDebt,
    totalRealEstate,
    totalPortfolio,
    isLoading,
    getInvestmentsByType,
    getInvestmentById,
    getInvestmentBySecurityId,
    buyNew,
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
