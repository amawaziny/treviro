"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  isRealEstateFundInvestment,
  isRealEstateInvestment,
  isSecurityInvestment,
  isStockInvestment,
  RealEstateInvestment,
  SecurityInvestment,
} from "@/lib/types";
import { hoursToMilliseconds } from "date-fns";
import { useAppServices } from "./app-services-context";

export interface InvestmentContextType {
  // Investments
  investments: Investment[];
  securityInvestments: SecurityInvestment[];
  debtInvestments: DebtInstrumentInvestment[];
  debtFundInvestments: SecurityInvestment[];
  realEstateInvestments: RealEstateInvestment[];
  realEstateFundInvestments: SecurityInvestment[];
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
    date: Date,
  ) => Promise<void>;
  sell: (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: Date,
  ) => Promise<void>;
  pay: (
    investmentId: string,
    installmentNumber: number,
    amount: number,
    date: Date,
  ) => Promise<void>;
  addDividend: (
    investmentId: string,
    securityId: string,
    amount: number,
    date: Date,
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
  const { investmentService } = useAppServices();
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
  const [realEstateFundInvestments, setRealEstateFundInvestments] = useState<
    SecurityInvestment[]
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

  // Check for matured debt instruments on initial load and periodically
  useEffect(() => {
    if (!investmentService) return;

    investmentService.handleMaturedDebtInstruments();
    const checkMaturedDebtInterval = setInterval(() => {
      investmentService.handleMaturedDebtInstruments();
    }, hoursToMilliseconds(24));

    return () => clearInterval(checkMaturedDebtInterval);
  }, [investmentService]);

  // Subscribe to opened investments for real-time updates
  useEffect(() => {
    if (!investmentService) return;

    setIsLoading(true);
    const unsubscribe = investmentService.subscribeToOpenedInvestments(
      async (investments) => {
        setInvestments(investments);
        setSecurityInvestments(investments.filter(isSecurityInvestment));
        setStockInvestments(investments.filter(isStockInvestment));
        setGoldInvestments(investments.filter(isGoldInvestment));
        setGoldFundInvestments(investments.filter(isGoldFundInvestment));
        setDebtInvestments(investments.filter(isDebtInstrumentInvestment));
        setDebtFundInvestments(investments.filter(isDebtFundInvestment));
        setRealEstateInvestments(investments.filter(isRealEstateInvestment));
        setRealEstateFundInvestments(
          investments.filter(isRealEstateFundInvestment),
        );
        setCurrencyInvestments(investments.filter(isCurrencyInvestment));

        // Recalculate totals on updates
        const unrealizedPnL =
          await investmentService.calculateUnrealizedPnL(investments);
        setTotalPortfolio(unrealizedPnL.portfolio);
        setTotalStocks(unrealizedPnL.stocks);
        setTotalCurrency(unrealizedPnL.currencies);
        setTotalGold(unrealizedPnL.gold);
        setTotalRealEstate(unrealizedPnL.realEstate);
        setTotalDebt(unrealizedPnL.debt);
      },
    );
    setIsLoading(false);

    return () => unsubscribe();
  }, [investmentService]);

  const buyNew = async <T extends Investment>(
    investmentData: InvestmentData<T>,
  ) => {
    if (!investmentService)
      throw new Error("Investment service not initialized");
    await investmentService.buyNew(investmentData);
  };

  const deleteInvestment = useCallback(
    async (id: string) => {
      if (!investmentService)
        throw new Error("Investment service not initialized");

      setIsLoading(true);
      await investmentService.deleteInvestment(id);
      setIsLoading(false);
    },
    [investmentService],
  );

  const editInvestment = useCallback(
    async (id: string, investmentData: Partial<Investment>) => {
      if (!investmentService)
        throw new Error("Investment service not initialized");
      await investmentService.editInvestment(
        id,
        investmentData,
      );
    },
    [investmentService],
  );

  const buy = useCallback(
    async (
      investmentId: string,
      securityId: string,
      investmentType: InvestmentType,
      quantity: number,
      pricePerUnit: number,
      fees: number,
      date: Date,
    ) => {
      if (!investmentService)
        throw new Error("Investment service not initialized");
      await investmentService.buy(
        investmentId,
        securityId,
        investmentType,
        quantity,
        pricePerUnit,
        fees,
        date,
      );
    },
    [investmentService],
  );

  const sell = useCallback(
    async (
      investmentId: string,
      securityId: string,
      investmentType: InvestmentType,
      quantity: number,
      pricePerUnit: number,
      fees: number,
      date: Date,
    ) => {
      if (!investmentService)
        throw new Error("Investment service not initialized");
      await investmentService.sell(
        investmentId,
        securityId,
        investmentType,
        quantity,
        pricePerUnit,
        fees,
        date,
      );
    },
    [investmentService],
  );

  const pay = useCallback(
    async (
      investmentId: string,
      installmentNumber: number,
      amount: number,
      date: Date,
    ) => {
      if (!investmentService)
        throw new Error("Investment service not initialized");
      await investmentService.pay(
        investmentId,
        "Real Estate",
        installmentNumber,
        amount,
        date,
      );
    },
    [investmentService],
  );

  const addDividend = useCallback(
    async (
      investmentId: string,
      securityId: string,
      amount: number,
      date: Date,
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
    },
    [investmentService],
  );

  const getInvestmentsByType = (type: string): Investment[] => {
    return investments.filter((inv) => inv.type === type);
  };

  const getInvestmentById = (id: string): Investment | undefined => {
    return investments.find((inv) => inv.id === id);
  };

  const getInvestmentBySecurityId = (
    securityId: string,
  ): Investment | undefined => {
    return securityInvestments.find((inv) => inv.securityId === securityId);
  };

  const contextValue: InvestmentContextType = {
    investments,
    securityInvestments,
    debtInvestments,
    debtFundInvestments,
    realEstateInvestments,
    realEstateFundInvestments,
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

export const useInvestments = (): InvestmentContextType => {
  const context = useContext(InvestmentContext);
  if (!context) {
    throw new Error("useInvestments must be used within an InvestmentProvider");
  }
  return context;
};
