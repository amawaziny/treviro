"use client";
import { useLanguage } from "@/contexts/language-context";

import * as React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { calculateMonthlyCashFlowSummary } from "@/lib/financial-utils";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { InvestmentDistributionCard } from "./investment-distribution-card";
import { useTheme } from "next-themes";

export function MonthlyInvestmentDistributionChart() {
  const { t } = useLanguage();
  const { investments, isLoading } = useInvestments();
  const { resolvedTheme } = useTheme();

  // Filter investments for this month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  // Calculate real estate installments for this month using the same logic as the dashboard summary
  const { expenseRecords, fixedEstimates } = useInvestments();
  const cashFlowSummary = React.useMemo(
    () =>
      calculateMonthlyCashFlowSummary({
        incomeRecords: [],
        expenseRecords,
        investments,
        fixedEstimates,
        month: now,
      }),
    [expenseRecords, investments, fixedEstimates, now],
  );
  const realEstateInstallmentsMonthly =
    cashFlowSummary.realEstateInstallmentsMonthly || 0;

  const monthlyInvestments = React.useMemo(() => {
    if (isLoading || investments.length === 0) return [];
    return investments.filter((inv) => {
      if (!inv.purchaseDate) return false;
      const date =
        typeof inv.purchaseDate === "string"
          ? parseISO(inv.purchaseDate)
          : inv.purchaseDate;
      return date >= monthStart && date <= monthEnd;
    });
  }, [investments, isLoading, monthStart, monthEnd]);

  // Use the cashFlowSummary for exact breakdown matching the cash flow card (now only actual paid real estate installments)
  const chartData = React.useMemo(() => {
    const data = [];
    if (cashFlowSummary.totalStockInvestmentThisMonth > 0) {
      data.push({
        id: "Stocks",
        label: t("stocks"),
        value: cashFlowSummary.totalStockInvestmentThisMonth,
        color: resolvedTheme === "dark" ? "#ff7b6b" : "#e05a47",
      });
    }
    if (cashFlowSummary.totalGoldInvestmentThisMonth > 0) {
      data.push({
        id: "Gold",
        label: t("gold"),
        value: cashFlowSummary.totalGoldInvestmentThisMonth,
        color: "#e6b93e",
      });
    }
    if (cashFlowSummary.totalDebtInvestmentThisMonth > 0) {
      data.push({
        id: "Debt instruments",
        label: t("debt_instruments"),
        value: cashFlowSummary.totalDebtInvestmentThisMonth,
        color: resolvedTheme === "dark" ? "#b6d037" : "#5e9c1c",
      });
    }
    if (cashFlowSummary.totalCurrencyInvestmentThisMonth > 0) {
      data.push({
        id: "Currencies",
        label: t("currencies"),
        value: cashFlowSummary.totalCurrencyInvestmentThisMonth,
        color: resolvedTheme === "dark" ? "#45818e" : "#7bb661",
      });
    }
    if (realEstateInstallmentsMonthly > 0) {
      data.push({
        id: "Real Estate",
        label: t("real_estate"),
        value: realEstateInstallmentsMonthly,
        color: resolvedTheme === "dark" ? "#7bb661" : "#b6d037",
      });
    }
    return data;
  }, [cashFlowSummary, realEstateInstallmentsMonthly, resolvedTheme]);

  return (
    <InvestmentDistributionCard
      title={t("Monthly Investment Distribution")}
      chartData={chartData}
      total={chartData.reduce((total, item) => total + item.value, 0)}
    />
  );
}
