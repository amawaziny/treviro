"use client";

import { useContext } from "react";
import { InvestmentContext } from "@/contexts/investment-context";

// This hook remains the same, but its consumers might need to be aware that
// StockInvestment.tickerSymbol can now refer to a stock's ticker or a fund's symbol.
export const useInvestments = () => {
  const context = useContext(InvestmentContext);
  if (context === undefined) {
    throw new Error("useInvestments must be used within an InvestmentProvider");
  }
  return context;
};
