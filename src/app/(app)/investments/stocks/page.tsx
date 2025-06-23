"use client";

import { MyStockList } from "@/components/investments/stocks/my-stock-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  LineChart as StockIcon,
} from "lucide-react"; // Added icons
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import React from "react"; // Added React for useMemo
import { useInvestments } from "@/hooks/use-investments"; // To calculate total P/L
import { useListedSecurities } from "@/hooks/use-listed-securities"; // For current prices
import type { StockInvestment } from "@/lib/types";
import {
  cn,
  formatCurrencyWithCommas,
  formatNumberForMobile,
  formatNumberWithSuffix,
} from "@/lib/utils"; // For styling and formatting
import { useIsMobile } from "@/hooks/use-mobile";
import { isStockRelatedFund } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyStocksPage() {
  const { t: t } = useLanguage();
  const { language } = useLanguage();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const isMobile = useIsMobile();

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  const { totalStockPnL, totalStockCost, totalStockValue } =
    React.useMemo(() => {
      if (isLoading)
        return { totalStockPnL: 0, totalStockCost: 0, totalStockValue: 0 };

      let pnlSum = 0;
      let costSum = 0;
      let valueSum = 0;

      const stockInvestments = investments.filter((inv) => {
        if (inv.type !== "Stocks") return false;
        const security = listedSecurities.find(
          (ls) => ls.symbol === (inv as StockInvestment).tickerSymbol,
        );
        if (!security) return false; // Exclude if no matching listed security (e.g., delisted)
        return (
          security.securityType === "Stock" ||
          (security.securityType === "Fund" &&
            isStockRelatedFund(security.fundType))
        );
      }) as StockInvestment[];

      // Aggregate investments by ticker symbol
      const aggregatedBySymbol: {
        [key: string]: {
          totalShares: number;
          totalCost: number;
          symbol: string;
        };
      } = {};
      stockInvestments.forEach((inv) => {
        if (inv.tickerSymbol) {
          if (!aggregatedBySymbol[inv.tickerSymbol]) {
            aggregatedBySymbol[inv.tickerSymbol] = {
              totalShares: 0,
              totalCost: 0,
              symbol: inv.tickerSymbol,
            };
          }
          aggregatedBySymbol[inv.tickerSymbol].totalShares +=
            inv.numberOfShares || 0;
          aggregatedBySymbol[inv.tickerSymbol].totalCost +=
            (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0);
        }
      });

      Object.values(aggregatedBySymbol).forEach((agg) => {
        const security = listedSecurities.find(
          (ls) => ls.symbol === agg.symbol,
        );
        if (security && security.price && agg.totalShares > 0) {
          const currentValue = security.price * agg.totalShares;
          const profitLoss = currentValue - agg.totalCost;
          pnlSum += profitLoss;
          costSum += agg.totalCost;
          valueSum += currentValue;
        } else if (agg.totalShares > 0) {
          // If no market price, P/L is based on cost (effectively 0 P/L if value is cost)
          costSum += agg.totalCost;
          valueSum += agg.totalCost; // Value is at least the cost
        }
      });

      return {
        totalStockPnL: pnlSum,
        totalStockCost: costSum,
        totalStockValue: valueSum,
      };
    }, [investments, listedSecurities, isLoading]);

  const totalStockPnLPercent =
    totalStockCost > 0
      ? (totalStockPnL / totalStockCost) * 100
      : totalStockValue > 0
        ? Infinity
        : 0;
  const isTotalStockProfitable = totalStockPnL >= 0;

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("my_stocks_equity_funds")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("overview_of_your_stock_and_equity_fund_investments")}
        </p>
      </div>
      <Separator />

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
      ) : investments.filter((inv) => inv.type === "Stocks").length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_stocks_equity_funds_pl")}
            </CardTitle>
            {isTotalStockProfitable ? (
              <TrendingUp className="h-4 w-4 text-accent" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-xl font-bold",
                isTotalStockProfitable ? "text-accent" : "text-destructive",
              )}
            >
              {formatNumberForMobile(isMobile, totalStockPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalStockPnLPercent === Infinity
                ? "∞"
                : totalStockPnLPercent.toFixed(2)}
              {t("overall_pl")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("total_invested")}
              {formatNumberForMobile(isMobile, totalStockCost)}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <MyStockList />

      <Link href="/securities" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Browse securities"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
