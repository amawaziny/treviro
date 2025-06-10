"use client";

import * as React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { formatNumberWithSuffix } from "@/lib/utils";
import { InvestmentDistributionCard } from "./investment-distribution-card";
import { useTheme } from "next-themes";

const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  "Real Estate": "Real Estate",
  Gold: "Gold",
  Stocks: "Stocks",
  "Debt Instruments": "Debt instruments",
  "Debt instruments": "Debt instruments",
  Currencies: "Currencies",
};

const INVESTMENT_ORDER = [
  "Real Estate",
  "Gold",
  "Stocks",
  "Debt instruments",
  "Currencies",
];

export function InvestmentDistributionChart() {
  const { investments, isLoading } = useInvestments();
  const { resolvedTheme } = useTheme();

  const chartData = React.useMemo(() => {
    if (isLoading || investments.length === 0) return [];
    const distribution: { [key: string]: number } = {};
    investments.forEach((inv) => {
      const label = INVESTMENT_TYPE_LABELS[inv.type] || inv.type;
      distribution[label] = (distribution[label] || 0) + inv.amountInvested;
    });
    return INVESTMENT_ORDER.map((type) => {
      const label = INVESTMENT_TYPE_LABELS[type] || type;
      return {
        id: label,
        label: label,
        value: distribution[label] || 0,
        color:
          resolvedTheme === "dark"
            ? label === "Real Estate"
              ? "#7bb661"
              : label === "Gold"
                ? "#e6b93e"
                : label === "Stocks"
                  ? "#ff7b6b"
                  : label === "Debt instruments"
                    ? "#b6d037"
                    : "#45818e"
            : label === "Real Estate"
              ? "#b6d037"
              : label === "Gold"
                ? "#e6b93e"
                : label === "Stocks"
                  ? "#e05a47"
                  : label === "Debt instruments"
                    ? "#5e9c1c"
                    : "#7bb661",
      };
    }).filter((d) => d.value > 0);
  }, [investments, isLoading, resolvedTheme]);

  return (
    <InvestmentDistributionCard
      title="Investment Distribution"
      chartData={chartData}
      total={chartData.reduce((total, item) => total + item.value, 0)}
    />
  );
}
