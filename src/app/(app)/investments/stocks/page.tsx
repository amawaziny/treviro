"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, TrendingUp, TrendingDown, LineChart } from "lucide-react"; // Added icons
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import React from "react"; // Added React for useMemo
import { useInvestments } from "@/hooks/use-investments"; // To calculate total P/L
import { useListedSecurities } from "@/hooks/use-listed-securities"; // For current prices
import type { SecurityInvestment } from "@/lib/types";
import { cn, formatNumberForMobile } from "@/lib/utils"; // For styling and formatting
import { useIsMobile } from "@/hooks/use-mobile";
import { isStockRelatedFund } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAllOfflineInvestments } from "@/lib/offline-investment-storage";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";

export default function MyStocksPage() {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const [offlineInvestments, setOfflineInvestments] = React.useState<
    SecurityInvestment[]
  >([]);
  const isOffline = useOnlineStatus();

  React.useEffect(() => {
    if (isOffline) {
      getAllOfflineInvestments().then((pending) => {
        setOfflineInvestments(
          pending.filter(
            (inv) =>
              inv.type === "Stocks" &&
              typeof inv.numberOfShares === "number" &&
              typeof inv.purchaseFees === "number",
          ) as SecurityInvestment[],
        );
      });
    } else {
      setOfflineInvestments([]);
    }
  }, [isOffline]);

  const allInvestments = React.useMemo(() => {
    return isOffline ? [...investments, ...offlineInvestments] : investments;
  }, [investments, offlineInvestments, isOffline]);

  const stockInvestments = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    // First, filter valid stock investments
    const validStockInvestments = allInvestments.filter((inv): inv is SecurityInvestment => {
      // Only process investments that have a securityId (i.e., StockInvestment)
      if (!("securityId" in inv) || typeof inv.securityId !== "string") {
        return false;
      }

      // Find the corresponding listed security for the investment
      const listedSecurity = listedSecurities.find(
        (ls) => ls.id === inv.securityId,
      );

      if (!listedSecurity) {
        // If no listed security is found, exclude the investment
        return false;
      }

      // Apply the filter condition based on the listed security's type and fundType
      const isStock = listedSecurity.securityType === "Stock";
      const isStockFund =
        listedSecurity.securityType === "Fund" &&
        isStockRelatedFund(listedSecurity.fundType);

      return isStock || isStockFund;
    });

    // Then aggregate investments by securityId
    const aggregatedInvestments = new Map<string, SecurityInvestment>();

    validStockInvestments.forEach((inv) => {
      if (!inv.securityId) return; // Skip if no securityId
      
      const existing = aggregatedInvestments.get(inv.securityId);
      
      if (existing) {
        // If we already have this security, sum up the shares and adjust the cost
        const existingShares = existing.numberOfShares ?? 0;
        const invShares = inv.numberOfShares ?? 0;
        const totalShares = existingShares + invShares;
        
        const existingPrice = existing.purchasePricePerShare ?? 0;
        const invPrice = inv.purchasePricePerShare ?? 0;
        const totalCost = (existingShares * existingPrice) + (invShares * invPrice);
        
        // Ensure we have valid dates before comparing
        const existingDate = existing.purchaseDate ? new Date(existing.purchaseDate) : new Date(0);
        const invDate = inv.purchaseDate ? new Date(inv.purchaseDate) : new Date(0);
        
        const updatedInvestment: SecurityInvestment = {
          ...existing,
          numberOfShares: totalShares,
          purchasePricePerShare: totalShares > 0 ? totalCost / totalShares : 0,
          // Keep the first purchase date (earliest date)
          purchaseDate: invDate < existingDate ? inv.purchaseDate : existing.purchaseDate
        };
        
        aggregatedInvestments.set(inv.securityId, updatedInvestment);
      } else {
        // First time seeing this security, add it to the map
        aggregatedInvestments.set(inv.securityId, { ...inv });
      }
    });

    return Array.from(aggregatedInvestments.values());
  }, [
    allInvestments,
    listedSecurities,
    isLoadingInvestments,
    isLoadingListedSecurities,
  ]); // Add dependencies

  // Update loading state to consider both hooks
  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  const { totalStockPnL, totalStockCost, totalStockValue } =
    React.useMemo(() => {
      if (isLoading)
        return { totalStockPnL: 0, totalStockCost: 0, totalStockValue: 0 };

      let pnlSum = 0;
      let costSum = 0;
      let valueSum = 0;

      // Aggregate investments by securityId
      const aggregatedBySecurityId: {
        [key: string]: {
          totalShares: number;
          totalCost: number;
          securityId: string;
        };
      } = {};
      stockInvestments.forEach((inv) => {
        if (inv.securityId) {
          if (!aggregatedBySecurityId[inv.securityId]) {
            aggregatedBySecurityId[inv.securityId] = {
              totalShares: 0,
              totalCost: 0,
              securityId: inv.securityId,
            };
          }
          aggregatedBySecurityId[inv.securityId].totalShares +=
            inv.numberOfShares || 0;
          aggregatedBySecurityId[inv.securityId].totalCost +=
            (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0);
        }
      });

      Object.values(aggregatedBySecurityId).forEach((agg) => {
        const security = listedSecurities.find(
          (ls) => ls.id === agg.securityId,
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
    }, [stockInvestments, listedSecurities, isLoading]);

  const totalStockPnLPercent =
    totalStockCost > 0
      ? (totalStockPnL / totalStockCost) * 100
      : totalStockValue > 0
        ? Infinity
        : 0;
  const isTotalStockProfitable = totalStockPnL >= 0;

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div data-testid="stocks-header">
        <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="stocks-title">
          {t("my_stocks_equity_funds")}
        </h1>
        <p className="text-muted-foreground text-sm" data-testid="stocks-subtitle">
          {t("overview_of_your_stock_and_equity_fund_investments")}
        </p>
      </div>
      <Separator />

      {isLoading ? (
        <Card data-testid="loading-skeleton">
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="portfolio-summary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="pl-title">
              {t("total_stocks_equity_funds_pl")}
            </CardTitle>
            {isTotalStockProfitable ? (
              <TrendingUp className="h-4 w-4 text-accent" data-testid="trend-up-icon" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" data-testid="trend-down-icon" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-xl font-bold",
                isTotalStockProfitable ? "text-accent" : "text-destructive",
              )}
            >
              <span className="font-medium text-foreground" data-testid="total-pl-amount">
                {formatNumberForMobile(isMobile, totalStockPnL)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span>{`${t("overall_pl")}: `}</span>
              <span data-testid="pl-percentage-value" className="font-medium text-foreground">
                {`${totalStockPnLPercent === Infinity ? "∞" : totalStockPnLPercent.toFixed(2)}%`}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {`${t("total_invested")}: `}
              <span className="font-medium text-foreground" data-testid="total-invested-amount">
                  {formatNumberForMobile(isMobile, totalStockCost)}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4" data-testid="investments-list">
          {stockInvestments.map((investment) => {
            if (!investment.tickerSymbol) return null;

            const listedSecurity = listedSecurities.find(
              (ls) => ls.symbol === investment.tickerSymbol,
            );

            if (!listedSecurity) return null;

            return (
              <InvestmentSecurityCard
                data-testid={`investment-card-${investment.id}`}
                key={`${investment.id}-${investment.tickerSymbol}`}
                security={listedSecurity}
                investment={investment}
              />
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: "96px" }}></div>
      <Link href="/securities" passHref>
        <Button
          data-testid="add-security-button"
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
