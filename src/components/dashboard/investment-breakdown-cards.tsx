import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvestments } from "@/hooks/use-investments";
import { formatNumberForMobile, parseDateString } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Coins,
  LineChart,
  FileText,
  CircleDollarSign,
  Plus,
} from "lucide-react";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const investmentTypeIcons = {
  ["Real Estate"]: Landmark,
  Gold: Coins,
  Stocks: LineChart,
  ["Debt Instruments"]: FileText,
  Currencies: CircleDollarSign,
};

const investmentTypeColors = {
  ["Real Estate"]: "#a6c037",
  Gold: "#e6b93e",
  Stocks: "#e05a47",
  ["Debt Instruments"]: "#5e9c1c",
  Currencies: "#45818e",
};

import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface InvestmentBreakdownCardsProps {
  dashboardSummary?: {
    totalCashBalance: number;
    // Add other properties from dashboardSummary that you need
  };
  appSettings?: {
    investmentTypePercentages: Record<string, number>;
    // Add other settings you need
  };
}

export function InvestmentBreakdownCards({
  dashboardSummary,
  appSettings,
}: InvestmentBreakdownCardsProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { investments } = useInvestments();
  if (!investments || investments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t("no_investments_found")}
      </div>
    );
  }

  // Calculate invested amount for each type for current month
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // Calculate target and remaining investments for each type
  const totalCashBalance = dashboardSummary?.totalCashBalance || 0;
  const allocationPercentages = appSettings?.investmentTypePercentages || {
    "Real Estate": 30,
    Stocks: 25,
    "Debt Instruments": 20,
    Currencies: 10,
    Gold: 15,
  };

  // Group by type and calculate current month's investments
  const typeGroups = investments.reduce(
    (acc, inv) => {
      acc[inv.type] = acc[inv.type] || [];
      acc[inv.type].push(inv);
      return acc;
    },
    {} as Record<string, typeof investments>,
  );

  // Calculate total invested, excluding matured debt instruments
  const totalInvested = investments.reduce((sum, inv) => {
    // Skip matured debt instruments
    if (inv.type === 'Debt Instruments' && (inv as any).isMatured) {
      return sum;
    }
    return sum + (inv.amountInvested || 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(typeGroups).map(([type, invs]) => {
        let invested = 0;
        if (type === "Real Estate") {
          // Only sum paid installments due this month
          invs.forEach((inv) => {
            const reInv = inv as import("@/lib/types").RealEstateInvestment;
            if (Array.isArray(reInv.installments)) {
              (reInv.installments as any[]).forEach((inst: any) => {
                const dueDate = parseDateString(inst.dueDate);
                if (
                  inst.status === "Paid" &&
                  dueDate &&
                  isWithinInterval(dueDate, {
                    start: currentMonthStart,
                    end: currentMonthEnd,
                  })
                ) {
                  invested += inst.amount || 0;
                }
              });
            }
          });
        } else {
          invested = invs.reduce((sum, inv) => {
          // Skip matured debt instruments
          if (inv.type === 'Debt Instruments' && (inv as any).isMatured) {
            return sum;
          }
          return sum + (inv.amountInvested || 0);
        }, 0);
        }
        const current = invs.reduce((sum, inv) => {
          // Skip matured debt instruments
          if (inv.type === 'Debt Instruments' && (inv as any).isMatured) {
            return sum;
          }
          // For stocks, ensure we're using currentValue if available, otherwise use amountInvested
          const value = inv.type === 'Stocks' 
            ? (inv.currentValue || inv.amountInvested || 0)
            : (inv.amountInvested || 0);
          return sum + value;
        }, 0);
        const percent =
          totalInvested > 0 ? (invested / totalInvested) * 100 : 0;
        const plAmount = current - invested;
        const plPercent = invested > 0 ? (plAmount / invested) * 100 : 0;
        const Icon =
          investmentTypeIcons[type as keyof typeof investmentTypeIcons] ||
          FileText;
        return (
          <Card
            key={type}
            className={`flex flex-col justify-between shadow-md bg-[#f8fafc] dark:bg-[#23255a] p-4 min-h-[150px] rounded-xl border-0 relative`}
            style={{
              borderLeft: `8px solid ${
                investmentTypeColors[
                  type as keyof typeof investmentTypeColors
                ] || "#a6c037"
              }`,
            }}
          >
            <CardContent className="flex flex-col gap-2 p-0">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="rounded-full p-2"
                  style={{
                    background:
                      investmentTypeColors[
                        type as keyof typeof investmentTypeColors
                      ] || "#a6c037",
                  }}
                >
                  <Icon className="h-4 w-4 text-[#23255a] dark:text-white" />
                </span>
                <span
                  className="text-md font-bold flex-1 text-[#23255a] dark:text-white truncate"
                  title={type}
                >
                  {t(type)}
                </span>
                <Badge className={`text-xs px-2 py-1 bg-green-600 text-white`}>
                  {plAmount >= 0 ? (
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="inline h-4 w-4 mr-1" />
                  )}
                  {plAmount >= 0 ? "+" : ""}
                  {formatNumberForMobile(isMobile, plAmount)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 items-end justify-between mt-2">
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                    {t("invested")}
                  </div>
                  <div className="font-bold text-md text-[#23255a] dark:text-white truncate">
                    {formatNumberForMobile(isMobile, invested)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                    {t("current")}
                  </div>
                  <div className="font-bold text-md text-[#23255a] dark:text-white truncate">
                    {formatNumberForMobile(isMobile, current)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                    {t("of_portfolio")}
                  </div>
                  <div className="font-bold text-md text-[#23255a] dark:text-white truncate">
                    {percent.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                    {t("to_invest")}
                  </div>
                  <div className="font-bold text-md text-green-600 dark:text-green-400 truncate flex items-center">
                    <Plus className="h-4 w-4 mr-1" />
                    {formatNumberForMobile(
                      isMobile,
                      Math.max(
                        0,
                        (totalCashBalance *
                          (allocationPercentages[
                            type as keyof typeof allocationPercentages
                          ] || 0)) /
                          100 -
                          invested,
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                    {t("pl")}
                  </div>
                  <div
                    className={`font-bold text-lg ${
                      plAmount >= 0
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    } truncate`}
                  >
                    {plPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
