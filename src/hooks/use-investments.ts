"use client";

import { useContext } from "react";
import { InvestmentContext } from "@/contexts/investment-context";

export const useInvestments = () => {
  const context = useContext(InvestmentContext);
  if (context === undefined) {
    throw new Error("useInvestments must be used within an InvestmentProvider");
  }
  return context;
};
