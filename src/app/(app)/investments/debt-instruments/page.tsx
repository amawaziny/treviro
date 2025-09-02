"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type {
  DebtInstrumentInvestment,
  SecurityInvestment,
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
import { cn } from "@/lib/utils";
import { format, parseISO, isValid, addYears, isBefore } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";

// Define types for our component
type DebtData = {
  directDebtHoldings: any[];
  debtFundHoldings: any[];
  totalProjectedMonthlyInterest: number;
  totalProjectedAnnualInterest: number;
  totalDebtFundPnL: number;
  totalDebtFundCost: number;
  totalDirectDebtInvested: number;
  totalMaturedDebt: number;
  isTotalFundProfitable: boolean;
  totalInvestedInDebt: number;
};

type ExpiringCertificates = {
  expiringCertificatesSum: number;
  expiringCertificatesPercentage: number;
};

export default function MyDebtInstrumentsPage() {
  const { t, language } = useLanguage();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const isMobile = useIsMobile();

  // Calculate debt data
  const debtData = React.useMemo<DebtData>(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) {
      return {
        directDebtHoldings: [],
        debtFundHoldings: [],
        totalProjectedMonthlyInterest: 0,
        totalProjectedAnnualInterest: 0,
        totalDebtFundPnL: 0,
        totalDebtFundCost: 0,
        totalDirectDebtInvested: 0,
        totalMaturedDebt: 0,
        isTotalFundProfitable: false,
        totalInvestedInDebt: 0,
      };
    }

    const directHoldings: AggregatedDebtHolding[] = [];
    const fundHoldingsAggregated: AggregatedDebtHolding[] = [];
    let monthlyInterestSum = 0;
    let annualInterestSum = 0;
    let debtFundPnLSum = 0;
    let debtFundCostSum = 0;
    let directDebtInvestedSum = 0;

    let totalMaturedDebt = 0;
    const directDebtInvestments = investments.filter((inv) => {
      if (inv.type !== "Debt Instruments" || inv.fundType) return false;

      const debt = inv as DebtInstrumentInvestment;

      // Skip already matured debt instruments
      if (debt.isMatured) {
        totalMaturedDebt += debt.amountInvested || 0;
        return false;
      }

      // Check maturity date for non-matured debts
      if (debt.maturityDate) {
        try {
          const parsedMaturityDate = parseISO(debt.maturityDate + "T00:00:00Z");
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (
            isValid(parsedMaturityDate) &&
            isBefore(parsedMaturityDate, today)
          ) {
            totalMaturedDebt += debt.amountInvested || 0;
            return false; // Filter out matured debt
          }
        } catch (e) {
          console.error(
            "Error processing maturity date for debt instrument:",
            debt.id,
            e,
          );
        }
      }

      return true;
    }) as DebtInstrumentInvestment[];
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

    const debtInvestments = investments.filter(
      (inv) =>
        inv.type === "Debt Instruments" && isDebtRelatedFund(inv.fundType),
    ) as SecurityInvestment[];
    const debtFundAggregationMap = new Map<string, AggregatedDebtHolding>();

    debtInvestments.forEach((stockInv) => {
      const security = listedSecurities.find(
        (ls) => ls.id === stockInv.securityId,
      );
      if (security) {
        const symbol = security.symbol;
        const costOfThisLot = stockInv.amountInvested || 0;
        const unitsOfThisLot = stockInv.numberOfShares || 0;

        if (debtFundAggregationMap.has(symbol)) {
          debtFundAggregationMap.set(symbol, {
            id: security.id,
            itemType: "fund",
            displayName: security[language === "ar" ? "name_ar" : "name"],
            totalUnits: unitsOfThisLot,
            totalCost: costOfThisLot,
            currentMarketPrice: security.price,
            currency: security.currency,
            logoUrl: security.logoUrl,
            fundDetails: security,
            fundInvestment: stockInv,
          });
        } else {
          debtFundAggregationMap.set(symbol, {
            id: security.id,
            itemType: "fund",
            displayName: security[language === "ar" ? "name_ar" : "name"],
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

    // Calculate if the total fund is profitable
    const isTotalFundProfitable = debtFundPnLSum >= 0;
    const totalInvestedInDebt = directDebtInvestedSum + debtFundCostSum;

    // Certificate expiration tracking is now handled in the separate memo

    const isFundProfitable = debtFundPnLSum >= 0;
    const totalInvested = directDebtInvestedSum + debtFundCostSum;

    return {
      directDebtHoldings: directHoldings,
      debtFundHoldings: fundHoldingsAggregated,
      totalProjectedMonthlyInterest: monthlyInterestSum,
      totalProjectedAnnualInterest: annualInterestSum,
      totalDebtFundPnL: debtFundPnLSum,
      totalDebtFundCost: debtFundCostSum,
      totalDirectDebtInvested: directDebtInvestedSum,
      totalMaturedDebt,
      isTotalFundProfitable: debtFundPnLSum >= 0,
      totalInvestedInDebt: directDebtInvestedSum + debtFundCostSum,
    };
  }, [
    investments,
    listedSecurities,
    isLoadingInvestments,
    isLoadingListedSecurities,
    language,
    t,
  ]);

  // Calculate expiring certificates
  const { expiringCertificatesSum, expiringCertificatesPercentage } =
    React.useMemo<ExpiringCertificates>(() => {
      if (isLoadingInvestments) {
        return {
          expiringCertificatesSum: 0,
          expiringCertificatesPercentage: 0,
        };
      }

      let localExpiringSum = 0;
      let localTotalCertificatesSum = 0;
      const now = new Date();
      const oneYearFromNow = addYears(now, 1);

      // Calculate expiring certificates from direct debt holdings
      const currentDebtHoldings = debtData.directDebtHoldings || [];
      currentDebtHoldings.forEach((debt: any) => {
        if (
          debt.debtSubType === "Certificate" &&
          debt.maturityDate &&
          debt.amountInvested
        ) {
          localTotalCertificatesSum += debt.amountInvested || 0;
          try {
            const maturityDate = parseISO(debt.maturityDate);
            if (
              isValid(maturityDate) &&
              isBefore(maturityDate, oneYearFromNow)
            ) {
              localExpiringSum += debt.amountInvested || 0;
            }
          } catch (e) {
            console.error("Error processing maturity date:", e);
          }
        }
      });

      const percentage =
        localTotalCertificatesSum > 0
          ? (localExpiringSum / localTotalCertificatesSum) * 100
          : 0;

      return {
        expiringCertificatesSum: localExpiringSum,
        expiringCertificatesPercentage: percentage,
      };
    }, [debtData.directDebtHoldings, isLoadingInvestments]);

  // Use the debt data directly in the component
  const {
    directDebtHoldings = [],
    debtFundHoldings = [],
    totalProjectedAnnualInterest = 0,
    totalProjectedMonthlyInterest = 0,
    totalDebtFundPnL = 0,
    totalDebtFundCost = 0,
    totalDirectDebtInvested = 0,
    totalMaturedDebt = 0,
    isTotalFundProfitable = false,
    totalInvestedInDebt = 0,
  } = debtData;

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
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className="space-y-8 relative min-h-[calc(100vh-10rem)]"
      data-testid="debts-page"
    >
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
            {totalDebtFundCost > 0
              ? ((totalDebtFundPnL / totalDebtFundCost) * 100).toFixed(2)
              : totalDebtFundPnL > 0
                ? "∞"
                : "0.00"}
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
                {`${t("direct")}: `}
                <span className="font-medium text-foreground">
                  {formatNumberForMobile(isMobile, totalDirectDebtInvested)}
                </span>
              </span>
              <span>
                {`${t("funds")}: `}
                <span className="font-medium text-foreground">
                  {formatNumberForMobile(
                    isMobile,
                    totalDebtFundCost,
                    debtFundHoldings[0]?.currency,
                  )}
                </span>
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
            <p>
              {`${t("projected_interest")}: `}
              <span className="font-medium text-foreground">
                {`${formatNumberForMobile(
                  isMobile,
                  totalProjectedMonthlyInterest,
                )} ${t("monthly")}`}
              </span>
            </p>
            <p>
              {`${t("projected_interest")}: `}
              <span className="font-medium text-foreground">
                {`${formatNumberForMobile(
                  isMobile,
                  totalProjectedAnnualInterest,
                )} ${t("annually")}`}
              </span>
            </p>
            <p>
              {`${t("certificates_expiring_soon")}: `}
              <span className="font-medium text-foreground">
                {`${formatNumberForMobile(
                  isMobile,
                  expiringCertificatesSum,
                )} - ${expiringCertificatesPercentage.toFixed(2)}%`}
              </span>
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {directDebtHoldings.length > 0 ? (
            [...directDebtHoldings]
              .sort((a, b) => {
                // Sort by day of the month, then by name if days are equal
                const dayA = a.maturityDay ? parseInt(a.maturityDay, 10) : 0;
                const dayB = b.maturityDay ? parseInt(b.maturityDay, 10) : 0;
                if (dayA !== dayB) return dayA - dayB;
                return (a.displayName || "").localeCompare(b.displayName || "");
              })
              .map((debt) => (
                <DirectDebtListItem key={debt.id} holding={debt} />
              ))
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_direct_debt_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6" style={{ marginBottom: "96px" }}>
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
          data-testid="add-debt-certificate-button"
        >
          <Plus className="h-7 w-7" data-testid="plus-icon" />
        </Button>
      </Link>
    </div>
  );
}
