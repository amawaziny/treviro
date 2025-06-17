"use client";
import { useLanguage } from "@/contexts/language-context";

import * as React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { calculateMonthlyCashFlowSummary } from "@/lib/financial-utils";
import { InvestmentDistributionCard } from "./investment-distribution-card";
import { useTheme } from "next-themes";

// Define the order and labels for the chart items
const CHART_ITEMS_ORDER = [
  'Stocks',
  'Gold',
  'Debt instruments',
  'Currencies',
  'Real Estate',
  'Expenses'
];

export function MonthlyInvestmentDistributionChart() {
  const { t } = useLanguage();
  const { investments, isLoading } = useInvestments();
  const { resolvedTheme } = useTheme();
  
  // State to track which items are checked
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>(
    CHART_ITEMS_ORDER.reduce(
      (acc, type) => ({
        ...acc,
        [type]: true,
      }),
      {},
    ),
  );
  
  const allUnchecked = Object.values(checkedItems).every(checked => !checked);
  
  // Handle checkbox toggle
  const handleCheckboxChange = (type: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

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
        month: now,
      }),
    [expenseRecords, investments, fixedEstimates, now],
  );


  // Use the cashFlowSummary for exact breakdown matching the cash flow card
  const chartData = React.useMemo(() => {
    const data = [];
    
    // Add investment categories
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
    if (cashFlowSummary.realEstateInstallmentsMonthly > 0) {
      data.push({
        id: "Real Estate",
        label: t("real_estate"),
        value: cashFlowSummary.realEstateInstallmentsMonthly,
        color: resolvedTheme === "dark" ? "#7bb661" : "#b6d037",
      });
    }

    // Add combined expenses
    const totalExpenses = 
      (cashFlowSummary.livingExpensesMonthly || 0) +
      (cashFlowSummary.zakatFixedMonthly || 0) +
      (cashFlowSummary.charityFixedMonthly || 0) +
      (cashFlowSummary.otherFixedExpensesMonthly || 0) +
      (cashFlowSummary.totalItemizedExpensesThisMonth || 0);
      
    if (totalExpenses > 0) {
      data.push({
        id: "Expenses",
        label: t("expenses"),
        value: totalExpenses,
        color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
      });
    }
    
    return data;
  }, [cashFlowSummary, resolvedTheme]);

  // Filter chart data based on checked items
  const filteredChartData = chartData.filter(item => checkedItems[item.id] !== false);
  
  if (isLoading || investments.length === 0) {
    return (
      <InvestmentDistributionCard
        title={t("Monthly Cash Flow Distribution")}
        chartData={[]}
        total={0}
        checkedItems={checkedItems}
        onCheckboxChange={handleCheckboxChange}
        isEmpty={true}
      />
    );
  }

  return (
    <InvestmentDistributionCard
      title={t("Monthly Cash Flow Distribution")}
      chartData={filteredChartData}
      allChartData={chartData}
      total={filteredChartData.reduce((total, item) => total + item.value, 0)}
      checkedItems={checkedItems}
      onCheckboxChange={handleCheckboxChange}
      isEmpty={allUnchecked}
    />
  );
}
