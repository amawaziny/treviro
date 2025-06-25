"use client";
import { useLanguage } from "@/contexts/language-context";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import Link from "next/link";
import { formatNumberWithSuffix } from "@/lib/utils";
import React from "react";

interface MyStockListItemProps {
  symbol: string;
  name: string;
  logoUrl: string;
  totalShares: number;
  averagePurchasePrice: number;
}

export function MyStockListItem({
  symbol,
  name,
  logoUrl,
  totalShares,
  averagePurchasePrice,
}: MyStockListItemProps) {
  const { t: t } = useLanguage();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();

  const correspondingListedSecurity = listedSecurities.find(
    (ls) => ls.symbol === symbol,
  );
  const currentMarketPrice = correspondingListedSecurity?.price;
  const currency = correspondingListedSecurity?.currency || "EGP";
  const isFund = correspondingListedSecurity?.securityType === "Fund";
  const fundType = correspondingListedSecurity?.fundType;

  let profitLoss = 0;
  let profitLossPercent = 0;
  let isProfitable = false;

  if (currentMarketPrice && totalShares > 0 && averagePurchasePrice > 0) {
    const totalCurrentValue = currentMarketPrice * totalShares;
    const totalCost = averagePurchasePrice * totalShares;
    profitLoss = totalCurrentValue - totalCost;isFund
    profitLossPercent =
      totalCost > 0
        ? (profitLoss / totalCost) * 100
        : totalCurrentValue > 0
          ? Infinity
          : 0;
    isProfitable = profitLoss >= 0;
  }

  const formattedAvgPrice = formatNumberWithSuffix(
    averagePurchasePrice,
    currency,
  );
  const formattedMarketPrice = currentMarketPrice
    ? formatNumberWithSuffix(currentMarketPrice, currency)
    : t("na");

  const formattedProfitLoss = formatNumberWithSuffix(profitLoss, currency);

  const sharesLabel = isFund ? "Units" : "Shares";

  const renderStockInfo = () => (
    <div className="truncate">
      <div className="flex items-baseline gap-2">
        <p className="text-md font-bold truncate">{symbol}</p>
        {isFund && fundType && (
          <span className="text-sm text-primary whitespace-nowrap">
            ({fundType})
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {sharesLabel}: {totalShares.toLocaleString()}
      </p>
    </div>
  );

  const cardContent = (
    <CardContent className="pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-grow min-w-0">
          {correspondingListedSecurity ? (
            <Link
              href={`/securities/details/${correspondingListedSecurity.id}`}
              passHref
              className="flex items-center gap-3 flex-grow min-w-0 hover:bg-muted/20 p-2 rounded-md -ml-2"
            >
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                width={32}
                height={32}
                className="rounded-full object-cover"
                data-ai-hint={isFund ? t("logo_fund") : t("logo_company")}
              />

              {renderStockInfo()}
            </Link>
          ) : (
            <div className="flex items-center gap-3 flex-grow min-w-0 p-2 rounded-md -ml-2">
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                width={32}
                height={32}
                className="rounded-full object-cover"
                data-ai-hint={isFund ? t("logo_fund") : t("logo_company")}
              />

              {renderStockInfo()}
            </div>
          )}
        </div>

        <div className="text-end pl-2">
          {isLoadingListedSecurities && !currentMarketPrice ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : currentMarketPrice !== undefined ? (
            <>
              <p
                className={`text-lg font-bold ${isProfitable ? "text-accent" : "text-destructive"} md:hidden`}
              >
                {formatNumberWithSuffix(profitLoss, currency)}
              </p>
              <p
                className={`text-lg font-bold ${isProfitable ? "text-accent" : "text-destructive"} hidden md:block`}
              >
                {formattedProfitLoss}
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
                {profitLossPercent === Infinity
                  ? "∞%"
                  : profitLossPercent.toFixed(2) + "%"}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("market_na")}</p>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
        <p>
          {t("avg_purchase_price")}

          <span className="md:hidden ml-1">
            {formatNumberWithSuffix(averagePurchasePrice, currency)}
          </span>
          <span className="hidden md:inline ml-1">{formattedAvgPrice}</span>
        </p>
        <p className="text-end">
          {t("current_market_price")}

          {currentMarketPrice !== undefined ? (
            <>
              <span className="md:hidden ml-1">
                {formatNumberWithSuffix(currentMarketPrice, currency)}
              </span>
              <span className="hidden md:inline ml-1">
                {formattedMarketPrice}
              </span>
            </>
          ) : (
            <span className="ml-1">{t("na")}</span>
          )}
        </p>
      </div>
    </CardContent>
  );

  return (
    <Card className="hover:shadow-md transition-shadow">{cardContent}</Card>
  );
}

MyStockListItem.displayName = "MyStockListItem";
