"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { cn, formatNumberForMobile } from "@/lib/utils";
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
  Landmark,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DirectDebtListItem } from "@/components/investments/debt/my-debt-list-item";
import { parseISO, isValid, addYears, isBefore, getDate } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";

type ExpiringCertificates = {
  expiringCertificatesSum: number;
  expiringCertificatesPercentage: number;
};

export default function MyDebtInstrumentsPage() {
  const { t, language } = useLanguage();
  const {
    debtInvestments,
    debtFundInvestments,
    totalDebt,
    deleteInvestment,
    isLoading,
  } = useInvestments();
  const isMobile = useIsMobile();

  // Calculate expiring certificates
  const { expiringCertificatesSum, expiringCertificatesPercentage } =
    React.useMemo<ExpiringCertificates>(() => {
      if (isLoading) {
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
      debtInvestments.forEach((debt) => {
        if (
          debt.debtSubType === "Certificate" &&
          debt.maturityDate &&
          debt.totalInvested
        ) {
          localTotalCertificatesSum += debt.totalInvested || 0;
          try {
            const maturityDate = parseISO(debt.maturityDate);
            if (
              isValid(maturityDate) &&
              isBefore(maturityDate, oneYearFromNow)
            ) {
              localExpiringSum += debt.totalInvested || 0;
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
    }, [debtInvestments, isLoading]);

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
          {totalDebt.unrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-accent" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-xl font-bold",
              totalDebt.unrealizedPnL >= 0 ? "text-accent" : "text-destructive",
            )}
          >
            {formatNumberForMobile(isMobile, totalDebt.unrealizedPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalDebt.unrealizedPnLPercent === Infinity
              ? "∞"
              : totalDebt.unrealizedPnLPercent.toFixed(2)}
            {t("overall_pl")}
          </p>
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("total_invested_in_debt")}
              </span>
              <span className="font-semibold">
                {formatNumberForMobile(isMobile, totalDebt.totalInvested)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {`${t("direct")}: `}
                <span className="font-medium text-foreground">
                  {formatNumberForMobile(
                    isMobile,
                    totalDebt.totalDirectDebtInvested,
                  )}
                </span>
              </span>
              <span>
                {`${t("funds")}: `}
                <span className="font-medium text-foreground">
                  {formatNumberForMobile(
                    isMobile,
                    totalDebt.totalFundDebtInvested,
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
                  totalDebt.totalProjectedDebtMonthlyInterest,
                )} ${t("monthly")}`}
              </span>
            </p>
            <p>
              {`${t("projected_interest")}: `}
              <span className="font-medium text-foreground">
                {`${formatNumberForMobile(
                  isMobile,
                  totalDebt.totalProjectedDebtAnnualInterest,
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
          {debtInvestments.length > 0 ? (
            [...debtInvestments]
              .sort((a, b) => {
                // Sort by day of the month, then by name if days are equal
                const dayA = getDate(a.maturityDate);
                const dayB = getDate(b.maturityDate);
                if (dayA !== dayB) return dayA - dayB;
                return (a.name || "").localeCompare(b.name || "");
              })
              .map((debt) => (
                <DirectDebtListItem
                  key={debt.id}
                  investment={debt}
                  removeDirectDebtInvestment={deleteInvestment}
                />
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
          {debtFundInvestments.length > 0 ? (
            debtFundInvestments.map((holding) => {
              return (
                <InvestmentSecurityCard key={holding.id} investment={holding} />
              );
            })
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_debt_fund_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>

      <Link href="/investments/buy-new?type=Debt Instruments" passHref>
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
