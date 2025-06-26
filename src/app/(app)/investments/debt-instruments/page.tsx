"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type {
  DebtInstrumentInvestment,
  StockInvestment,
  AggregatedDebtHolding,
} from "@/lib/types";
import {
  formatCurrencyWithCommas,
  formatNumberForMobile,
  isDebtRelatedFund,
} from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Building,
  TrendingUp,
  Landmark,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DirectDebtListItem } from "@/components/investments/debt/my-debt-list-item";
import { cn, formatNumberWithSuffix } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";

export default function MyDebtInstrumentsPage() {
  const { t: t } = useLanguage();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const {
    directDebtHoldings,
    debtFundHoldings,
    totalProjectedAnnualInterest,
    totalDebtFundPnL,
    totalDebtFundCost,
    totalDirectDebtInvested,
  } = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) {
      return {
        directDebtHoldings: [],
        debtFundHoldings: [],
        totalProjectedMonthlyInterest: 0,
        totalProjectedAnnualInterest: 0,
        totalDebtFundPnL: 0,
        totalDebtFundCost: 0,
        totalDirectDebtInvested: 0,
      };
    }

    const directHoldings: AggregatedDebtHolding[] = [];
    const fundHoldingsAggregated: AggregatedDebtHolding[] = [];
    let monthlyInterestSum = 0;
    let annualInterestSum = 0;
    let debtFundPnLSum = 0;
    let debtFundCostSum = 0;
    let directDebtInvestedSum = 0;

    const directDebtInvestments = investments.filter(
      (inv) => inv.type === "Debt Instruments",
    ) as DebtInstrumentInvestment[];
    directDebtInvestments.forEach((debt) => {
      let maturityDay: string | undefined;
      let maturityMonth: string | undefined;
      let maturityYear: string | undefined;
      let projectedMonthly = 0;
      let projectedAnnual = 0;

      if (debt.maturityDate) {
        try {
          const parsedMaturityDate = parseISO(debt.maturityDate + "T00:00:00Z");
          if (isValid(parsedMaturityDate)) {
            maturityDay = format(parsedMaturityDate, "dd");
            maturityMonth = format(parsedMaturityDate, "MM");
            maturityYear = format(parsedMaturityDate, "yyyy");
          }
        } catch (e) {
          console.error(
            t("error_parsing_maturity_date_for_debt_holding"),

            debt.id,
            e,
          );
        }
      }

      if (
        typeof debt.amountInvested === "number" &&
        typeof debt.interestRate === "number" &&
        debt.interestRate > 0
      ) {
        const principal = debt.amountInvested;
        const annualRateDecimal = debt.interestRate / 100;
        projectedMonthly = (principal * annualRateDecimal) / 12;
        projectedAnnual = principal * annualRateDecimal;
        monthlyInterestSum += projectedMonthly;
        annualInterestSum += projectedAnnual;
      }
      directDebtInvestedSum += debt.amountInvested || 0;

      directHoldings.push({
        id: debt.id,
        itemType: "direct",
        displayName:
          debt.name || `${debt.debtSubType} - ${debt.issuer || t("na")}`,
        debtSubType: debt.debtSubType,
        issuer: debt.issuer,
        interestRate: debt.interestRate,
        maturityDate: debt.maturityDate,
        amountInvested: debt.amountInvested,
        purchaseDate:
          debt.debtSubType === "Certificate" ? undefined : debt.purchaseDate,
        maturityDay,
        maturityMonth,
        maturityYear,
        projectedMonthlyInterest: projectedMonthly,
        projectedAnnualInterest: projectedAnnual,
        currency: "EGP",
      });
    });

    const stockInvestments = investments.filter(
      (inv) => inv.type === "Stocks",
    ) as StockInvestment[];
    const debtFundAggregationMap = new Map<string, AggregatedDebtHolding>();

    stockInvestments.forEach((stockInv) => {
      const security = listedSecurities.find(
        (ls) => ls.symbol === stockInv.tickerSymbol,
      );
      if (
        security &&
        security.securityType === "Fund" &&
        isDebtRelatedFund(security.fundType)
      ) {
        const symbol = security.symbol;
        const costOfThisLot = stockInv.amountInvested || 0;
        const unitsOfThisLot = stockInv.numberOfShares || 0;

        if (debtFundAggregationMap.has(symbol)) {
          debtFundAggregationMap.set(symbol, {
            id: security.id,
            itemType: "fund",
            displayName: security.name,
            totalUnits: unitsOfThisLot,
            totalCost: costOfThisLot,
            currentMarketPrice: security.price,
            currency: security.currency,
            logoUrl: security.logoUrl,
            fundDetails: security,
            fundInvestment: stockInv,
          });
        }
      }
    });

    Array.from(debtFundAggregationMap.values()).forEach((aggHolding) => {
      if (
        aggHolding.totalUnits &&
        aggHolding.totalUnits > 0 &&
        aggHolding.totalCost
      ) {
        aggHolding.averagePurchasePrice =
          aggHolding.totalCost / aggHolding.totalUnits;
      }
      if (
        aggHolding.currentMarketPrice &&
        aggHolding.totalUnits &&
        aggHolding.totalCost
      ) {
        aggHolding.currentValue =
          aggHolding.currentMarketPrice * aggHolding.totalUnits;
        aggHolding.profitLoss = aggHolding.currentValue - aggHolding.totalCost;
        aggHolding.profitLossPercent =
          aggHolding.totalCost > 0
            ? (aggHolding.profitLoss / aggHolding.totalCost) * 100
            : aggHolding.currentValue > 0
              ? Infinity
              : 0;
        debtFundPnLSum += aggHolding.profitLoss || 0;
        debtFundCostSum += aggHolding.totalCost || 0;
      }
      fundHoldingsAggregated.push(aggHolding);
    });

    return {
      directDebtHoldings: directHoldings.sort((a, b) =>
        (a.displayName || "").localeCompare(b.displayName || ""),
      ),
      debtFundHoldings: fundHoldingsAggregated.sort((a, b) =>
        (a.displayName || "").localeCompare(b.displayName || ""),
      ),
      totalProjectedMonthlyInterest: monthlyInterestSum,
      totalProjectedAnnualInterest: annualInterestSum,
      totalDebtFundPnL: debtFundPnLSum,
      totalDebtFundCost: debtFundCostSum,
      totalDirectDebtInvested: directDebtInvestedSum,
    };
  }, [
    investments,
    listedSecurities,
    isLoadingInvestments,
    isLoadingListedSecurities,
  ]);

  const totalDebtFundPnLPercent =
    totalDebtFundCost > 0
      ? (totalDebtFundPnL / totalDebtFundCost) * 100
      : totalDebtFundPnL !== 0
        ? Infinity
        : 0;
  const isTotalFundProfitable = totalDebtFundPnL >= 0;
  const totalInvestedInDebt = totalDirectDebtInvested + totalDebtFundCost;

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  const formatCurrencyWithSuffix = (
    value: number | undefined,
    currencyCode: string = "EGP",
  ) => {
    if (value === undefined || value === null || isNaN(value))
      return `${currencyCode} 0`;
    const formattedNumber = formatNumberWithSuffix(value);
    return `${currencyCode} ${formattedNumber}`;
  };

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
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("debt_instruments")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "track_your_direct_debt_instruments_and_debtrelated_fund_investments",
          )}
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_debt_instruments_pl_funds")}
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
              "text-xl font-bold",
              isTotalFundProfitable ? "text-accent" : "text-destructive",
            )}
          >
            {formatNumberForMobile(
              isMobile,
              totalDebtFundPnL,
              debtFundHoldings[0]?.currency,
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalDebtFundPnLPercent === Infinity
              ? "∞"
              : totalDebtFundPnLPercent.toFixed(2)}
            {t("overall_pl_from_funds")}
          </p>
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("total_invested_in_debt")}
              </span>
              <span className="font-semibold">
                {formatNumberForMobile(
                  isMobile,
                  totalInvestedInDebt,
                  debtFundHoldings[0]?.currency,
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {`${t("direct")}: ${formatNumberForMobile(
                  isMobile,
                  totalDirectDebtInvested,
                  debtFundHoldings[0]?.currency,
                )}`}
              </span>
              <span>
                {`${t("funds")}: ${formatNumberForMobile(
                  isMobile,
                  totalDebtFundCost,
                  debtFundHoldings[0]?.currency,
                )}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Landmark className="me-2 h-4 w-4 text-primary" />
            {t("direct_debt_instruments")}
          </CardTitle>
          <CardDescription>
            <p>{`${t("bonds_certificates_treasury_bills_you_own_directly")}`}</p>
            {`${t("projected_interest")}: ${formatNumberForMobile(isMobile, totalProjectedAnnualInterest, debtFundHoldings[0]?.currency)} ${t("annually")}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {directDebtHoldings.length > 0 ? (
            directDebtHoldings.map((debt) => (
              <DirectDebtListItem key={debt.id} holding={debt} />
            ))
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_direct_debt_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="me-2 h-4 w-4 text-primary" />
            {t("debt_fund_investments")}
          </CardTitle>
          <CardDescription>
            {t("funds_primarily_investing_in_debt_instruments")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {debtFundHoldings.length > 0 ? (
            debtFundHoldings.map((holding) => {
              return (
                <InvestmentSecurityCard
                  key={holding.id}
                  security={holding.fundDetails!}
                  investment={holding.fundInvestment!}
                />
              );
            })
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_debt_fund_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>

      <Link href="/investments/add?type=Debt Instruments" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new debt instrument"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
