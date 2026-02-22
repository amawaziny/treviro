"use client";
import { useLanguage } from "@/contexts/language-context";

import * as React from "react";
import { InvestmentDistributionCard } from "./investment-distribution-card";
import { useTheme } from "next-themes";

interface MonthlyInvestmentDistributionChartProps {
  totalSecuritiesInvestments: number;
  totalGoldInvestments: number;
  totalDebtInvestments: number;
  totalRealEstateInstallments: number;
  totalExpenses: number;
  totalCurrencyInvestments: number;
  principalReturned: number;
  netCashFlow: number;
  isLoading: boolean;
}

export function MonthlyInvestmentDistributionChart({
  totalSecuritiesInvestments,
  totalGoldInvestments,
  totalDebtInvestments,
  totalRealEstateInstallments,
  totalExpenses,
  totalCurrencyInvestments,
  principalReturned,
  netCashFlow,
  isLoading,
}: MonthlyInvestmentDistributionChartProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();

  const chartData = React.useMemo(() => {
    const data: Array<{
      id: string;
      label: string;
      value: number;
      color: string;
    }> = [];

    // Add investment categories
    data.push({
      id: "Securities",
      label: t("securities"),
      value: totalSecuritiesInvestments,
      color: resolvedTheme === "dark" ? "#ff7b6b" : "#e05a47",
    });

    data.push({
      id: "Gold",
      label: t("gold"),
      value: totalGoldInvestments,
      color: "#e6b93e",
    });

    data.push({
      id: "Debt instruments",
      label: t("debt_instruments"),
      value: totalDebtInvestments,
      color: resolvedTheme === "dark" ? "#b6d037" : "#5e9c1c",
    });

    data.push({
      id: "Currencies",
      label: t("currencies"),
      value: totalCurrencyInvestments,
      color: resolvedTheme === "dark" ? "#45818e" : "#7bb661",
    });

    data.push({
      id: "Real Estate",
      label: t("real_estate"),
      value: totalRealEstateInstallments,
      color: resolvedTheme === "dark" ? "#7bb661" : "#b6d037",
    });

    data.push({
      id: "Expenses",
      label: t("expenses"),
      value: Math.abs(totalExpenses),
      color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    });

    data.push({
      id: "principal_returned",
      label: t("principal_returned"),
      value: Math.abs(principalReturned),
      color: resolvedTheme === "dark" ? "#0A5702" : "#0A5702",
    });

    data.push({
      id: "cache",
      label: t("cache"),
      value: Math.abs(netCashFlow),
      color: resolvedTheme === "dark" ? "#0A5702" : "#0A5702",
    });

    return data;
  }, [
    totalSecuritiesInvestments,
    totalGoldInvestments,
    totalDebtInvestments,
    totalRealEstateInstallments,
    totalExpenses,
    totalCurrencyInvestments,
    principalReturned,
    netCashFlow,
    isLoading,
    resolvedTheme,
    t,
  ]);

  return (
    <InvestmentDistributionCard
      title={t("Monthly Cash Flow Distribution")}
      chartData={chartData}
      allChartData={chartData}
      total={chartData.reduce((total, item) => total + Math.abs(item.value), 0)}
      isEmpty={isLoading}
    />
  );
}
