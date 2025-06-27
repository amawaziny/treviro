"use client";
import { useLanguage } from "@/contexts/language-context";

import type { AggregatedCurrencyHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Info } from "lucide-react"; // Using DollarSign as a generic currency icon
import { cn, formatNumberForMobile } from "@/lib/utils";
import { formatNumberWithSuffix } from "@/lib/utils"; // Import the utility function
import { useIsMobile } from "@/hooks/use-mobile";
interface MyCurrencyListItemProps {
  holding: AggregatedCurrencyHolding;
}

export function MyCurrencyListItem({ holding }: MyCurrencyListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const {
    currencyCode,
    totalForeignAmount,
    averagePurchaseRateToEGP,
    currentMarketRateToEGP,
    profitOrLossInEGP,
    profitOrLossPercentage,
  } = holding;

  const isProfitable =
    profitOrLossInEGP !== undefined && profitOrLossInEGP >= 0;
  const hasMarketRate =
    currentMarketRateToEGP !== undefined && currentMarketRateToEGP !== null;

  const formatRate = (value: number | undefined) => {
    if (value === undefined || value === null || Number.isNaN(value))
      return t("na");
    return value.toFixed(4);
  };

  const formattedProfitLoss = formatNumberForMobile(
    isMobile,
    profitOrLossInEGP,
  );
  const displayProfitLossPercent =
    profitOrLossPercentage === Infinity
      ? "∞"
      : profitOrLossPercentage !== undefined
        ? profitOrLossPercentage.toFixed(2) + "%"
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
              <p className="text-sm font-semibold truncate">{currencyCode}</p>
              <p className="text-xs text-muted-foreground truncate">
                {`${t("held")}: ${formatNumberForMobile(isMobile, totalForeignAmount || 0, currencyCode)}`}
              </p>
            </div>
          </div>

          <div className="text-end pl-2">
            {hasMarketRate && profitOrLossInEGP !== undefined ? (
              <>
                <p
                  className={cn(
                    "text-sm font-bold",
                    isProfitable ? "text-accent" : "text-destructive",
                  )}
                >
                  <span className="md:hidden">
                    {formatNumberWithSuffix(profitOrLossInEGP)}
                  </span>
                  <span
                    className="hidden md:inline"
                    data-ai-hint="Display profit/loss for larger screens"
                  >
                    {formattedProfitLoss}
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
              {`${formatRate(averagePurchaseRateToEGP)} EGP`}
            </span>
          </p>
          <p className="text-end">
            {`${t("market_rate")}: `}
            <span className="font-medium text-foreground">
              {hasMarketRate
                ? `${formatRate(currentMarketRateToEGP)} EGP`
                : t("na")}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

MyCurrencyListItem.displayName = "MyCurrencyListItem";
