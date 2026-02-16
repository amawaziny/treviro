"use client";
import { useLanguage } from "@/contexts/language-context";

import * as React from "react";
import { InvestmentDistributionCard } from "./investment-distribution-card";
import { useTheme } from "next-themes";
import { Investment } from "@/lib/types";

interface InvestmentDistributionChartProps {
  investments: Investment[];
  isLoading: boolean;
}

export function InvestmentDistributionChart({
  investments,
  isLoading,
}: InvestmentDistributionChartProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();

  const chartData = React.useMemo(() => {
    const data: Array<{
      id: string;
      label: string;
      value: number;
      color: string;
    }> = [];

    const distribution: { [key: string]: number } = {};
    investments.forEach((inv) => {
      distribution[inv.type] =
        (distribution[inv.type] || 0) + inv.totalInvested;
    });

    Object.entries(distribution).forEach(([type, value]) => {
      // Add investment categories
      if (type == "Stocks") {
        data.push({
          id: "Stocks",
          label: t("stocks"),
          value: value,
          color: resolvedTheme === "dark" ? "#ff7b6b" : "#e05a47",
        });
      } else if (type == "Gold") {
        data.push({
          id: "Gold",
          label: t("gold"),
          value: value,
          color: "#e6b93e",
        });
      } else if (type == "Debt Instruments") {
        data.push({
          id: "Debt Instruments",
          label: t("debt_instruments"),
          value: value,
          color: resolvedTheme === "dark" ? "#b6d037" : "#5e9c1c",
        });
      } else if (type == "Currencies") {
        data.push({
          id: "Currencies",
          label: t("currencies"),
          value: value,
          color: resolvedTheme === "dark" ? "#45818e" : "#7bb661",
        });
      } else if (type == "Real Estate") {
        data.push({
          id: "Real Estate",
          label: t("real_estate"),
          value: value,
          color: resolvedTheme === "dark" ? "#7bb661" : "#b6d037",
        });
      }
    });

    return data;
  }, [investments, isLoading, resolvedTheme, t]);

  return (
    <InvestmentDistributionCard
      title={t("Investment Distribution")}
      chartData={chartData}
      allChartData={chartData}
      total={chartData.reduce((total, item) => total + item.value, 0)}
      isEmpty={isLoading || investments.length === 0}
    />
  );
}
