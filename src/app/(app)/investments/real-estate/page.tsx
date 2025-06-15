"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type {
  RealEstateInvestment,
  StockInvestment,
  ListedSecurity,
} from "@/lib/types";
import { formatCurrencyWithCommas, isRealEstateRelatedFund } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, Building, Plus, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { cn, formatNumberWithSuffix } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { MyRealEstateListItem } from "@/components/investments/real-estate/my-real-estate-list-item";

export default function MyRealEstatePage() {
  const { t } = useLanguage();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const router = useRouter();

  const directRealEstateHoldings = React.useMemo(() => {
    return investments.filter(
      (inv) => inv.type === "Real Estate",
    ) as RealEstateInvestment[];
  }, [investments]);

  const realEstateFundHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const stockInvestments = investments.filter(
      (inv) => inv.type === "Stocks",
    ) as StockInvestment[];

    return stockInvestments
      .map((stockInv) => {
        const security = listedSecurities.find(
          (ls) => ls.symbol === stockInv.tickerSymbol,
        );
        if (
          security &&
          security.securityType === "Fund" &&
          isRealEstateRelatedFund(security.fundType)
        ) {
          const totalCost =
            (stockInv.numberOfShares || 0) *
            (stockInv.purchasePricePerShare || 0);
          const currentValue =
            (stockInv.numberOfShares || 0) * (security.price || 0);
          const profitLoss = currentValue - totalCost;
          const profitLossPercent =
            totalCost > 0
              ? (profitLoss / totalCost) * 100
              : currentValue > 0
                ? Infinity
                : 0;
          return {
            ...stockInv,
            fundDetails: security,
            totalCost,
            currentValue,
            profitLoss,
            profitLossPercent,
          };
        }
        return null;
      })
      .filter(Boolean) as (StockInvestment & {
      fundDetails: ListedSecurity;
      totalCost: number;
      currentValue: number;
      profitLoss: number;
      profitLossPercent: number;
    })[];
  }, [
    investments,
    listedSecurities,
    isLoadingInvestments,
    isLoadingListedSecurities,
  ]);

  const totalFundPnL = React.useMemo(() => {
    return realEstateFundHoldings.reduce(
      (sum, fund) => sum + (fund.profitLoss || 0),
      0,
    );
  }, [realEstateFundHoldings]);

  const totalFundCost = React.useMemo(() => {
    return realEstateFundHoldings.reduce(
      (sum, fund) => sum + (fund.totalCost || 0),
      0,
    );
  }, [realEstateFundHoldings]);

  const totalFundPnLPercent =
    totalFundCost > 0
      ? (totalFundPnL / totalFundCost) * 100
      : totalFundPnL !== 0
        ? Infinity
        : 0;
  const isTotalFundProfitable = totalFundPnL >= 0;

  const totalDirectRealEstateInvested = React.useMemo(() => {
    return directRealEstateHoldings.reduce(
      (sum, item) => sum + (item.amountInvested || 0),
      0,
    );
  }, [directRealEstateHoldings]);

  const totalInvestedInRealEstate =
    totalDirectRealEstateInvested + totalFundCost;

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

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
          {t("real_estate")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "overview_of_your_direct_real_estate_and_real_estate_fund_investments",
          )}
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_real_estate_pl_funds")}
          </CardTitle>
          {isTotalFundProfitable ? (
            <TrendingUp className="h-4 w-4 text-accent" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-2xl font-bold",
              isTotalFundProfitable ? "text-accent" : "text-destructive",
            )}
          >
            {isMobile
              ? formatNumberWithSuffix(
                  totalFundPnL,
                  realEstateFundHoldings[0]?.fundDetails.currency,
                )
              : formatCurrencyWithCommas(
                  totalFundPnL,
                  realEstateFundHoldings[0]?.fundDetails.currency,
                )}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalFundPnLPercent === Infinity
              ? "∞"
              : totalFundPnLPercent.toFixed(2)}
            {t("overall_pl_from_funds")}
          </p>
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("total_invested_in_real_estate")}
              </span>
              <span className="font-semibold">
                {isMobile
                  ? formatNumberWithSuffix(totalInvestedInRealEstate)
                  : formatCurrencyWithCommas(totalInvestedInRealEstate)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("direct")}
                {formatCurrencyWithCommas(totalDirectRealEstateInvested)})
              </span>
              <span>
                {t("funds")}{" "}
                {formatCurrencyWithCommas(
                  totalFundCost,
                  realEstateFundHoldings[0]?.fundDetails.currency || "EGP",
                )}
                )
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {directRealEstateHoldings.length > 0 ? (
        <div className="space-y-4 mt-6">
          {directRealEstateHoldings.map((investment) => (
            <MyRealEstateListItem key={investment.id} investment={investment} />
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="mr-2 h-4 w-4 text-primary" />
              {t("no_direct_real_estate_holdings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_direct_real_estate_investments_yet")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-4 w-4 text-primary" />
            {t("real_estate_fund_investments_reits_etc")}
          </CardTitle>
          <CardDescription>
            {t("funds_primarily_investing_in_real_estate")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realEstateFundHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className={cn(language === "ar" ? "text-end" : "text-left")}
                  >
                    {t("fund_name_symbol")}
                  </TableHead>
                  <TableHead className="text-end">{t("units_held")}</TableHead>
                  <TableHead className="text-end">
                    {t("avg_purchase_price")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("total_invested")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("current_market_price")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("current_value")}
                  </TableHead>
                  <TableHead className="text-end">{t("pl")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realEstateFundHoldings.map((fundInv) => {
                  const displayCurrency = fundInv.fundDetails.currency || "EGP";
                  const avgPurchasePrice =
                    fundInv.numberOfShares &&
                    fundInv.numberOfShares > 0 &&
                    fundInv.totalCost
                      ? fundInv.totalCost / fundInv.numberOfShares
                      : 0;

                  return (
                    <TableRow key={fundInv.id}>
                      <TableCell
                        className={cn(
                          language === "ar" ? "text-end" : "text-left",
                        )}
                      >
                        {fundInv.fundDetails.name} ({fundInv.fundDetails.symbol}
                        )
                      </TableCell>
                      <TableCell className="text-end">
                        {fundInv.numberOfShares?.toLocaleString() || t("na")}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatCurrencyWithCommas(
                          avgPurchasePrice,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatCurrencyWithCommas(
                          fundInv.totalCost,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatCurrencyWithCommas(
                          fundInv.fundDetails.price || 0,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatCurrencyWithCommas(
                          fundInv.currentValue,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-end font-semibold",
                          fundInv.profitLoss >= 0
                            ? "text-accent"
                            : "text-destructive",
                        )}
                      >
                        {formatCurrencyWithCommas(
                          fundInv.profitLoss,
                          displayCurrency,
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("no_real_estaterelated_fund_investments_found")}
            </p>
          )}
        </CardContent>
      </Card>
      <Link href="/investments/add?type=Real Estate" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new real estate investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
