"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useGoldMarketPrices } from "@/hooks/use-gold-market-prices";
import type {
  GoldInvestment,
  StockInvestment,
  GoldType,
  AggregatedGoldHolding,
} from "@/lib/types";
import { formatCurrencyWithCommas, isGoldRelatedFund } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, Plus, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MyGoldListItem } from "@/components/investments/gold/my-gold-list-item";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberWithSuffix, cn } from "@/lib/utils";

export default function MyGoldPage() {
  const { t } = useLanguage();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const {
    goldMarketPrices,
    isLoading: isLoadingGoldPrices,
    error: goldPricesError,
  } = useGoldMarketPrices();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const aggregatedGoldHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const holdings: AggregatedGoldHolding[] = [];

    const physicalGoldInvestments = investments.filter(
      (inv) => inv.type === "Gold",
    ) as GoldInvestment[];
    const physicalAggregated: {
      [key in GoldType]?: {
        totalQuantity: number;
        totalCost: number;
        count: number;
        name: string;
        investments: GoldInvestment[];
      };
    } = {};

    physicalGoldInvestments.forEach((inv) => {
      if (!physicalAggregated[inv.goldType]) {
        physicalAggregated[inv.goldType] = {
          totalQuantity: 0,
          totalCost: 0,
          count: 0,
          name: inv.name,
          investments: [],
        };
      }
      physicalAggregated[inv.goldType]!.totalQuantity += inv.quantityInGrams;
      physicalAggregated[inv.goldType]!.totalCost += inv.amountInvested;
      physicalAggregated[inv.goldType]!.count++;
      physicalAggregated[inv.goldType]!.investments.push(inv);
    });

    (Object.keys(physicalAggregated) as GoldType[]).forEach((goldType) => {
      const data = physicalAggregated[goldType]!;
      const avgPrice =
        data.totalQuantity > 0 ? data.totalCost / data.totalQuantity : 0;
      let currentMarketPrice: number | undefined;
      if (goldMarketPrices) {
        if (goldType === "K24")
          currentMarketPrice = goldMarketPrices.pricePerGramK24;
        else if (goldType === "K21")
          currentMarketPrice = goldMarketPrices.pricePerGramK21;
        else if (goldType === "Pound")
          currentMarketPrice = goldMarketPrices.pricePerGoldPound;
        else if (goldType === "Ounce")
          currentMarketPrice = goldMarketPrices.pricePerOunce;
      }

      holdings.push({
        id: `physical_${goldType}`,
        displayName: `Physical Gold - ${goldType === "K24" ? t("24_karat") : goldType === "K21" ? t("21_karat") : goldType}`,
        itemType: "physical",
        totalQuantity: data.totalQuantity,
        averagePurchasePrice: avgPrice,
        totalCost: data.totalCost,
        currentMarketPrice: currentMarketPrice,
        currency: "EGP",
        physicalGoldType: goldType,
      });
    });

    const stockInvestments = investments.filter(
      (inv) => inv.type === "Stocks",
    ) as StockInvestment[];
    stockInvestments.forEach((stockInv) => {
      const security = listedSecurities.find(
        (ls) => ls.symbol === stockInv.tickerSymbol,
      );
      if (
        security &&
        security.securityType === "Fund" &&
        isGoldRelatedFund(security.fundType)
      ) {
        const existingFundHolding = holdings.find(
          (h) =>
            h.itemType === "fund" && h.fundDetails?.symbol === security.symbol,
        );
        if (existingFundHolding) {
          existingFundHolding.totalQuantity += stockInv.numberOfShares || 0;
          existingFundHolding.totalCost += stockInv.amountInvested || 0;
          if (existingFundHolding.totalQuantity > 0) {
            existingFundHolding.averagePurchasePrice =
              existingFundHolding.totalCost / existingFundHolding.totalQuantity;
          }
        } else {
          holdings.push({
            id: `fund_${security.id}`,
            displayName: security.name,
            itemType: "fund",
            logoUrl: security.logoUrl,
            totalQuantity: stockInv.numberOfShares || 0,
            averagePurchasePrice: stockInv.purchasePricePerShare || 0,
            totalCost: stockInv.amountInvested || 0,
            currentMarketPrice: security.price,
            currency: security.currency,
            fundDetails: security,
          });
        }
      }
    });

    const finalFundHoldings: AggregatedGoldHolding[] = [];
    const fundAggregationMap = new Map<string, AggregatedGoldHolding>();

    holdings
      .filter((h) => h.itemType === "fund")
      .forEach((fundHolding) => {
        const symbol = fundHolding.fundDetails!.symbol;
        if (fundAggregationMap.has(symbol)) {
          const existing = fundAggregationMap.get(symbol)!;
          existing.totalQuantity += fundHolding.totalQuantity;
          existing.totalCost += fundHolding.totalCost;
          if (existing.totalQuantity > 0) {
            existing.averagePurchasePrice =
              existing.totalCost / existing.totalQuantity;
          }
        } else {
          const initialFundInvestment = stockInvestments.find(
            (si) =>
              si.tickerSymbol === symbol &&
              si.id ===
                investments.find(
                  (i) =>
                    i.type === "Stocks" &&
                    (i as StockInvestment).tickerSymbol === symbol,
                )?.id,
          );
          if (initialFundInvestment) {
            fundHolding.averagePurchasePrice =
              initialFundInvestment.purchasePricePerShare || 0;
            fundHolding.totalCost = initialFundInvestment.amountInvested || 0;
          }
          fundAggregationMap.set(symbol, { ...fundHolding });
        }
      });

    finalFundHoldings.push(...Array.from(fundAggregationMap.values()));

    return [
      ...holdings.filter((h) => h.itemType === "physical"),
      ...finalFundHoldings,
    ].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [
    investments,
    listedSecurities,
    goldMarketPrices,
    isLoadingInvestments,
    isLoadingListedSecurities,
  ]);

  const { totalCurrentValue, totalCost, totalProfitLoss } =
    React.useMemo(() => {
      let currentValueSum = 0;
      let costSum = 0;
      aggregatedGoldHoldings.forEach((holding) => {
        if (holding.currentMarketPrice && holding.totalQuantity > 0) {
          currentValueSum += holding.currentMarketPrice * holding.totalQuantity;
        } else {
          currentValueSum += holding.totalCost; // Fallback to cost if market price N/A
        }
        costSum += holding.totalCost;
      });
      return {
        totalCurrentValue: currentValueSum,
        totalCost: costSum,
        totalProfitLoss: currentValueSum - costSum,
      };
    }, [aggregatedGoldHoldings]);

  const totalProfitLossPercent =
    totalCost > 0
      ? (totalProfitLoss / totalCost) * 100
      : totalCurrentValue > 0
        ? Infinity
        : 0;
  const isTotalProfitable = totalProfitLoss >= 0;

  const isLoading =
    isLoadingInvestments || isLoadingListedSecurities || isLoadingGoldPrices;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="mt-4">
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-56px)] pb-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Gold
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("overview_of_your_direct_gold_and_gold_fund_investments")}
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_gold_pl")}
          </CardTitle>
          {isTotalProfitable ? (
            <TrendingUp className="h-4 w-4 text-accent" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-xl font-bold",
              isTotalProfitable ? "text-accent" : "text-destructive",
            )}
          >
            {isMobile
              ? formatNumberWithSuffix(totalProfitLoss)
              : formatCurrencyWithCommas(totalProfitLoss)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalProfitLossPercent === Infinity
              ? "∞"
              : totalProfitLossPercent.toFixed(2)}
            {t("overall_pl")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("total_invested")}
            {formatCurrencyWithCommas(totalCost)}
          </p>
        </CardContent>
      </Card>

      {goldPricesError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error_loading_gold_market_prices")}</AlertTitle>
          <AlertDescription>
            {t(
              "could_not_load_current_market_prices_for_physical_gold_pl_calculations_for_physical_gold_may_be_unavailable_or_inaccurate_please_ensure_the_goldmarketpricescurrent_document_is_correctly_set_up_in_firestore",
            )}
          </AlertDescription>
        </Alert>
      )}

      {aggregatedGoldHoldings.length > 0 ? (
        <div className="space-y-4 mt-6">
          {aggregatedGoldHoldings.map((holding) => (
            <MyGoldListItem key={holding.id} holding={holding} />
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gem className="mr-2 h-4 w-4 text-primary" />
              {t("no_gold_holdings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_gold_investments_yet")}
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/investments/add?type=Gold" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new gold investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
