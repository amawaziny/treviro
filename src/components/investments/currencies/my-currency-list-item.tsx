"use client";
import { useLanguage } from "@/contexts/language-context";

import type { CurrencyInvestment } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Info } from "lucide-react"; // Using DollarSign as a generic currency icon
import { cn, formatNumberForMobile } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { calcProfit } from "@/lib/financial-utils";

interface MyCurrencyListItemProps {
  holding: CurrencyInvestment;
  currentMarketRate: number | undefined;
}

export function MyCurrencyListItem({
  holding,
  currentMarketRate,
}: MyCurrencyListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const {
    isProfitable,
    profitLoss,
    totalCost,
    profitLossPercent,
    totalCurrentValue,
  } = calcProfit(
    holding.totalShares,
    holding.averagePurchasePrice,
    currentMarketRate || 0,
  );

  const formatRate = (value: number | undefined) => {
    if (value === undefined || value === null || Number.isNaN(value))
      return t("na");
    return value.toFixed(4);
  };

  const hasMarketRate =
    currentMarketRate !== undefined && currentMarketRate !== 0;

  const displayProfitLossPercent =
    profitLossPercent === Infinity
      ? "∞"
      : profitLossPercent !== undefined
        ? profitLossPercent.toFixed(2) + "%"
        : t("na");

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold truncate">
                {holding.currencyCode}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {`${t("held")}: ${formatNumberForMobile(isMobile, holding.totalInvested || 0, holding.currency)}`}
              </p>
            </div>
          </div>

          <div className="text-end pl-2">
            {hasMarketRate && profitLoss !== undefined ? (
              <>
                <p
                  className={cn(
                    "text-sm font-bold",
                    isProfitable ? "text-accent" : "text-destructive",
                  )}
                >
                  <span
                    className="hidden md:inline"
                    data-ai-hint="Display profit/loss for larger screens"
                  >
                    {formatNumberForMobile(isMobile, profitLoss)}
                  </span>
                </p>
                <Badge
                  variant={isProfitable ? "default" : "destructive"}
                  className={cn(
                    isProfitable
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive text-destructive-foreground",
                    "text-xs",
                  )}
                >
                  {isProfitable ? (
                    <TrendingUp className="me-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="me-1 h-3 w-3" />
                  )}
                  {displayProfitLossPercent}
                </Badge>
              </>
            ) : (
              <Badge
                variant="outline"
                className="text-xs flex items-center gap-1"
              >
                <Info className="h-3 w-3" />
                {t("market_na")}
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <p className="text-start">
            {`${t("avg_buy_rate")}: `}
            <span className="font-medium text-foreground">
              {`${formatRate(holding.averagePurchasePrice)} EGP`}
            </span>
          </p>
          <p className="text-end">
            {`${t("market_rate")}: `}
            <span className="font-medium text-foreground">
              {hasMarketRate ? `${formatRate(currentMarketRate)} EGP` : t("na")}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

MyCurrencyListItem.displayName = "MyCurrencyListItem";
