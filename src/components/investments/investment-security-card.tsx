"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatNumberForMobile } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { ListedSecurity, StockInvestment } from "@/lib/types";
import FundTypeIcon from "../ui/fund-type-icon";
import { calcProfit } from "@/lib/financial-utils";

export type InvestmentSecurityCardProps = {
  security: ListedSecurity;
  investment: StockInvestment;
};

export function InvestmentSecurityCard({
  security,
  investment,
}: InvestmentSecurityCardProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Calculate profit/loss
  const {
    isProfitable,
    profitLoss,
    totalCost,
    profitLossPercent,
    totalCurrentValue,
  } = calcProfit(
    investment.numberOfShares!,
    investment.purchasePricePerShare!,
    security.price!,
  );

  // Determine quantity label
  const getQuantityLabel = () => {
    if (security.fundType) return "Units";
    return "Shares";
  };

  // Get appropriate icon based on investment type
  const getIcon = () => {
    if (security.logoUrl) {
      return (
        <Image
          src={security.logoUrl}
          alt={`${security.name} logo`}
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
      );
    }

    return security.symbol;
  };
  const detailPageLink = `/securities/details/${security.id}`;

  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      <Link href={detailPageLink} passHref className="block">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
            {/* Left side - Icon and basic info */}
            <div className="flex items-center gap-3 flex-grow min-w-0">
              <div className="flex-shrink-0">{getIcon()}</div>
              <div className="truncate">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {security.symbol}
                  </p>
                  {security.fundType && (
                    <>
                      <span>•</span>
                      <FundTypeIcon fundType={security.fundType} size={12} />
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {security.name.length > 15
                    ? `${security.name.substring(0, 15)}...`
                    : security.name}
                  <span className="mx-1">•</span>
                  {security.market.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {`${t(getQuantityLabel())}: ${investment.numberOfShares!.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    },
                  )}`}
                </p>
              </div>
            </div>

            {/* Right side - Profit/Loss */}
            <div className="text-end pl-2">
              <div className="flex flex-col items-end">
                <p
                  className={cn(
                    "font-bold text-sm",
                    isProfitable ? "text-accent" : "text-destructive",
                  )}
                >
                  {formatNumberForMobile(isMobile, profitLoss)}
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
                  {totalCost > 0
                    ? profitLossPercent.toFixed(2) + "%"
                    : totalCurrentValue > 0
                      ? "∞%"
                      : "0.00%"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bottom row - Prices */}
          <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
            <p>
              {`${t("avg_cost")}: `}
              <span className="font-medium text-foreground">
                {formatNumberForMobile(
                  isMobile,
                  investment.purchasePricePerShare,
                )}
              </span>
            </p>
            <p className="text-end">
              {`${t("market_price")}: `}
              <span className="font-medium text-foreground">
                {security.price !== undefined
                  ? formatNumberForMobile(isMobile, security.price)
                  : t("na")}
              </span>
            </p>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

InvestmentSecurityCard.displayName = "InvestmentSecurityCard";
