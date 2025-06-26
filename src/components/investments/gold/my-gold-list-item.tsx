"use client";
import { useLanguage } from "@/contexts/language-context";

import type { AggregatedGoldHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatNumberForMobile, formatNumberWithSuffix } from "@/lib/utils";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvestmentSecurityCard } from "../investment-security-card";
import { calcProfit } from "@/lib/financial-utils";

interface MyGoldListItemProps {
  holding: AggregatedGoldHolding;
}

export function MyGoldListItem({ holding }: MyGoldListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const {
    displayName,
    itemType,
    totalQuantity,
    averagePurchasePrice,
    currentMarketPrice,
    currency,
    fundDetails, // present if itemType is 'fund'
    physicalGoldType, // present if itemType is 'physical'
  } = holding;

  // Calculate profit/loss
  const {
    isProfitable,
    profitLoss,
    totalCost,
    profitLossPercent,
    totalCurrentValue,
  } = calcProfit(totalQuantity, averagePurchasePrice, currentMarketPrice!);

  const quantityLabel =
    physicalGoldType === "Pound" || physicalGoldType === "Ounce"
      ? "Units"
      : "Grams";

  const PhysicalGoldCard = () => (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
            <div className="flex items-center gap-3 flex-grow min-w-0 hover:bg-muted/20rounded-md">
              <Gem className="h-8 w-8 text-amber-400" />
              <div className="truncate">
                <p className="font-semibold text-sm text-foreground truncate">
                  {t(physicalGoldType || "") || displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {`${t(quantityLabel)}: ${totalQuantity.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    },
                  )}`}
                </p>
              </div>
            </div>
          </div>

          <div className="text-end pl-2">
            {currentMarketPrice !== undefined ? (
              <div className="flex flex-col items-end">
                <p
                  className={cn(
                    "font-bold text-base",
                    isProfitable ? "text-accent" : "text-destructive",
                  )}
                >
                  {formatNumberForMobile(isMobile, profitLoss, currency)}
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
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {totalCost > 0
                    ? profitLossPercent.toFixed(2) + "%"
                    : totalCurrentValue > 0
                      ? "∞%"
                      : "0.00%"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("market_na")}</p>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
          <p>
            {`${t("avg_cost")}: ${formatNumberWithSuffix(averagePurchasePrice, currency)}`}
          </p>
          <p className="text-end">
            {`${t("market_price")}: ${formatNumberWithSuffix(currentMarketPrice || 0, currency)}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return itemType === "fund" ? (
    <InvestmentSecurityCard
      security={fundDetails!}
      investment={holding.fundInvestment!}
    />
  ) : (
    <PhysicalGoldCard />
  );
}

MyGoldListItem.displayName = "MyGoldListItem";
