import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvestments } from "@/contexts/investment-context";
import { formatNumberForMobile, parseDateString } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Coins,
  LineChart,
  FileText,
  CircleDollarSign,
} from "lucide-react";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvestmentTypePercentage, DashboardSummary } from "@/lib/types";

const investmentTypeIcons = {
  ["Real Estate"]: Landmark,
  Gold: Coins,
  Securities: LineChart,
  ["Debt Instruments"]: FileText,
  Currencies: CircleDollarSign,
};

const investmentTypeColors = {
  ["Real Estate"]: "#a6c037",
  Gold: "#e6b93e",
  Securities: "#e05a47",
  ["Debt Instruments"]: "#5e9c1c",
  Currencies: "#45818e",
};

interface InvestmentBreakdownCardsProps {
  dashboardSummary?: DashboardSummary;
  investmentTypePercentages: InvestmentTypePercentage;
  totalStocks: { [key: string]: number };
  totalCurrency: { [key: string]: number };
  totalGold: { [key: string]: number };
  totalDebt: { [key: string]: number };
  totalRealEstate: { [key: string]: number };
}

export function InvestmentBreakdownCards({
  dashboardSummary,
  investmentTypePercentages,
  totalStocks,
  totalCurrency,
  totalGold,
  totalDebt,
  totalRealEstate,
}: InvestmentBreakdownCardsProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Calculate target and remaining investments for each type
  const totalCashBalance = dashboardSummary?.totalCashBalance || 0;
  const allocationPercentages = investmentTypePercentages || {
    "Real Estate": 30,
    Securities: 25,
    "Debt Instruments": 20,
    Currencies: 10,
    Gold: 15,
  };

  interface BreakDownCardProps {
    type: string;
    total: { [key: string]: number };
  }

  const BreakDownCard = ({ type, total }: BreakDownCardProps) => {
    const Icon = investmentTypeIcons[type];
    return (
      <Card
        key={type}
        className={`flex flex-col justify-between shadow-md bg-[#f8fafc] dark:bg-[#23255a] p-4 min-h-[150px] rounded-xl border-0 relative`}
        style={{
          borderLeft: `8px solid ${investmentTypeColors[type] || "#a6c037"}`,
        }}
      >
        <CardContent className="flex flex-col gap-2 p-0">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="rounded-full p-2"
              style={{
                background: investmentTypeColors[type] || "#a6c037",
              }}
            >
              <Icon className="h-4 w-4 text-[#23255a] dark:text-white" />
            </span>
            <span
              title={t(type)}
              className="text-md font-bold flex-1 text-[#23255a] dark:text-white truncate"
            >
              {t(type)}
            </span>
            <Badge
              dir="auto"
              className={`text-xs px-2 py-1 ${total?.unrealizedPnL >= 0 ? "bg-green-600" : "bg-red-600"} text-white`}
            >
              {total?.unrealizedPnL >= 0 ? (
                <TrendingUp className="inline h-4 w-4 me-1" />
              ) : (
                <TrendingDown className="inline h-4 w-4 me-1" />
              )}
              {formatNumberForMobile(
                isMobile,
                total?.unrealizedPnL,
                "EGP",
                "always",
              )}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 items-end justify-between mt-2">
            <div>
              <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                {t("invested")}
              </div>
              <div className="font-bold text-md text-[#23255a] dark:text-white truncate">
                {formatNumberForMobile(
                  isMobile,
                  total?.totalInvested,
                  "EGP",
                  "always",
                )}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                {t("market_value")}
              </div>
              <div className="font-bold text-md text-[#23255a] dark:text-white truncate">
                {formatNumberForMobile(
                  isMobile,
                  total?.totalInvested + total?.unrealizedPnL,
                )}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">
                {t("pl")}
              </div>
              <div
                className={`font-bold text-lg ${
                  total?.unrealizedPnL >= 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                } truncate`}
              >
                {total?.unrealizedPnLPercent?.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <BreakDownCard type={"Securities"} total={totalStocks} />
      <BreakDownCard type={"Gold"} total={totalGold} />
      <BreakDownCard type={"Debt Instruments"} total={totalDebt} />
      <BreakDownCard type={"Currencies"} total={totalCurrency} />
      <BreakDownCard type={"Real Estate"} total={totalRealEstate} />
    </div>
  );
}
