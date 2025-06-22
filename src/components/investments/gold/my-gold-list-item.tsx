"use client";
import { useLanguage } from "@/contexts/language-context";

import Image from "next/image";
import type { AggregatedGoldHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatNumberWithSuffix } from "@/lib/utils";
import Link from "next/link";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface MyGoldListItemProps {
  holding: AggregatedGoldHolding;
}

export function MyGoldListItem({ holding }: MyGoldListItemProps) {
  const { t } = useLanguage();

  const {
    id,
    displayName,
    itemType,
    logoUrl,
    totalQuantity,
    averagePurchasePrice,
    totalCost,
    currentMarketPrice,
    currency,
    fundDetails, // present if itemType is 'fund'
    physicalGoldType, // present if itemType is 'physical'
  } = holding;

  let profitLoss = 0;
  let profitLossPercent = 0;
  let isProfitable = false;
  let totalCurrentValue = 0;

  if (currentMarketPrice && totalQuantity > 0) {
    totalCurrentValue = currentMarketPrice * totalQuantity;
    profitLoss = totalCurrentValue - totalCost;
    if (totalCost > 0) {
      profitLossPercent = (profitLoss / totalCost) * 100;
    } else if (totalCurrentValue > 0) {
      profitLossPercent = Infinity; // All profit if cost was 0
    }
    isProfitable = profitLoss >= 0;
  }

  const quantityLabel =
    itemType === "fund"
      ? "Units"
      : physicalGoldType === "Pound" || physicalGoldType === "Ounce"
        ? "Units"
        : "Grams";

  // Unify navigation: for gold funds, use fundDetails?.id; for physical gold, use holding.id
  const detailPageLink =
    itemType === "fund" && fundDetails?.id
      ? `/securities/details/${fundDetails.id}`
      : `/securities/details/${id}`;

  const cardContent = (
    <CardContent className="pt-4">
      <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
          <Link
            href={itemType === "fund" ? detailPageLink : "#"}
            passHref
            className="flex items-center gap-3 flex-grow min-w-0 hover:bg-muted/20 p-2 rounded-md -ml-2"
          >
            {
              itemType === "fund" && logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${displayName} logo`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  data-ai-hint="fund logo"
                />
              ) : (
                <Gem className="h-10 w-10 text-amber-400" />
              ) // Generic icon for physical gold
            }
            <div className="truncate">
              <p className="text-base font-medium truncate">
                {itemType === "fund"
                  ? fundDetails?.symbol || displayName
                  : t(physicalGoldType || "") || displayName}
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
          </Link>
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
                {formatNumberWithSuffix(profitLoss, currency)}
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
          {t("avg_cost")}

          <span> {formatNumberWithSuffix(averagePurchasePrice, currency)}</span>
        </p>
        <p className="text-end">
          {t("market_price")}

          <span>
            {" "}
            {formatNumberWithSuffix(currentMarketPrice || 0, currency)}
          </span>
        </p>
      </div>
    </CardContent>
  );

  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      {cardContent}
    </Card>
  );
}

MyGoldListItem.displayName = "MyGoldListItem";
