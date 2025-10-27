"use client";
import { useLanguage } from "@/contexts/language-context";

import * as React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { calculateMonthlyCashFlowSummary } from "@/lib/financial-utils";
import { InvestmentDistributionCard } from "./investment-distribution-card";
import { useTheme } from "next-themes";

export function MonthlyInvestmentDistributionChart() {
  const { t } = useLanguage();
  const { investments, isLoading } = useInvestments();
  const { resolvedTheme } = useTheme();

  // Filter investments for this month
  const now = new Date();
  // Calculate real estate installments for this month using the same logic as the dashboard summary
  const { expenseRecords, fixedEstimates } = useInvestments();
  const cashFlowSummary = React.useMemo(
    () =>
      calculateMonthlyCashFlowSummary({
        incomeRecords: [],
        expenseRecords,
        investments,
        fixedEstimates,
        transactions: [],
        month: now,
      }),
    [expenseRecords, investments, fixedEstimates, now],
  );

  // Use the cashFlowSummary for exact breakdown matching the cash flow card
  const chartData = React.useMemo(() => {
    const data: Array<{
      id: string;
      label: string;
      value: number;
      color: string;
    }> = [];

    // Add investment categories
    data.push({
      id: "Stocks",
      label: t("stocks"),
      value: cashFlowSummary.totalStockInvestments,
      color: resolvedTheme === "dark" ? "#ff7b6b" : "#e05a47",
    });

    data.push({
      id: "Gold",
      label: t("gold"),
      value: cashFlowSummary.totalGoldInvestments,
      color: "#e6b93e",
    });

    data.push({
      id: "Debt instruments",
      label: t("debt_instruments"),
      value: cashFlowSummary.totalDebtInvestments,
      color: resolvedTheme === "dark" ? "#b6d037" : "#5e9c1c",
    });

    data.push({
      id: "Currencies",
      label: t("currencies"),
      value: cashFlowSummary.totalCurrencyInvestments,
      color: resolvedTheme === "dark" ? "#45818e" : "#7bb661",
    });

    data.push({
      id: "Real Estate",
      label: t("real_estate"),
      value: cashFlowSummary.totalRealEstateInstallments,
      color: resolvedTheme === "dark" ? "#7bb661" : "#b6d037",
    });

    // Add combined expenses
    const totalExpenses =
      (cashFlowSummary.livingExpenses || 0) +
      (cashFlowSummary.zakat || 0) +
      (cashFlowSummary.charity || 0) +
      (cashFlowSummary.totalFixedExpenses || 0) +
      (cashFlowSummary.totalItemizedExpenses || 0);

    data.push({
      id: "Expenses",
      label: t("expenses"),
      value: totalExpenses,
      color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    });

    return data;
  }, [cashFlowSummary, isLoading, resolvedTheme, t]);

  return (
    <InvestmentDistributionCard
      title={t("Monthly Cash Flow Distribution")}
      chartData={chartData}
      allChartData={chartData}
      total={chartData.reduce((total, item) => total + item.value, 0)}
      isEmpty={isLoading || investments.length === 0}
    />
  );
}
