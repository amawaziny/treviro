"use client";
import { useLanguage } from "@/contexts/language-context";

import { InvestmentDistributionChart } from "@/components/dashboard/investment-distribution-chart";
import { MonthlyInvestmentDistributionChart } from "@/components/dashboard/monthly-investment-distribution-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInvestments } from "@/hooks/use-investments";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Coins,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Banknote,
  Building,
} from "lucide-react"; // Coins will be used as IncomeIcon replacement
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from "react";
import type {
  StockInvestment,
  GoldInvestment,
  CurrencyInvestment,
} from "@/lib/types";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { CashFlowSummaryCards } from "@/components/cash-flow/CashFlowSummaryCards";
import { formatMonthYear, formatNumberForMobile } from "@/lib/utils";
import { calculateMonthlyCashFlowSummary } from "@/lib/financial-utils";
import { useToast } from "@/hooks/use-toast";
import { InvestmentBreakdownCards } from "@/components/dashboard/investment-breakdown-cards";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useGoldMarketPrices } from "@/hooks/use-gold-market-prices";
import { useExchangeRates } from "@/hooks/use-exchange-rates";

export default function DashboardPage() {
  const { t, language, dir } = useLanguage();
  const ForwardArrowIcon = language === "ar" ? ArrowLeft : ArrowRight;

  const {
    dashboardSummary,
    isLoading: isLoadingDashboardSummaryContext,
    incomeRecords,
    expenseRecords,
    fixedEstimates,
    investments,
    transactions,
    isLoading: isLoadingContext,
    recalculateDashboardSummary,
    appSettings,
  } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const { goldMarketPrices, isLoading: isLoadingGoldPrices } =
    useGoldMarketPrices();
  const { exchangeRates, isLoading: isLoadingExchangeRates } =
    useExchangeRates();

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isLoading =
    isLoadingDashboardSummaryContext ||
    isLoadingContext ||
    isLoadingListedSecurities ||
    isLoadingGoldPrices ||
    isLoadingExchangeRates;

  const totalInvested = dashboardSummary?.totalInvestedAcrossAllAssets ?? 0;
  const totalRealizedPnL = dashboardSummary?.totalRealizedPnL ?? 0;
  const totalCashBalance = dashboardSummary?.totalCashBalance ?? 0;

  const cashFlowSummary = useMemo(() => {
    return calculateMonthlyCashFlowSummary({
      incomeRecords: incomeRecords || [],
      expenseRecords: expenseRecords || [],
      investments: investments || [],
      fixedEstimates: fixedEstimates || [],
      transactions: transactions || [],
    });
  }, [incomeRecords, expenseRecords, investments, fixedEstimates]);

  const { totalCurrentPortfolioValue, totalPortfolioCostBasis } =
    useMemo(() => {
      if (isLoading)
        return { totalCurrentPortfolioValue: 0, totalPortfolioCostBasis: 0 };

      let currentValueSum = 0;
      let costBasisSum = 0;

      (investments || []).forEach((inv) => {
        costBasisSum += inv.amountInvested || 0;
        let currentVal = inv.amountInvested || 0; // Default to cost if no market price

        if (inv.type === "Stocks") {
          const stockInv = inv as StockInvestment;
          const security = listedSecurities.find(
            (ls) => ls.symbol === stockInv.tickerSymbol,
          );
          if (security && security.price && stockInv.numberOfShares) {
            currentVal = security.price * stockInv.numberOfShares;
          }
        } else if (inv.type === "Gold") {
          const goldInv = inv as GoldInvestment;
          if (goldMarketPrices && goldInv.quantityInGrams) {
            let pricePerUnit: number | undefined;
            if (goldInv.goldType === "K24")
              pricePerUnit = goldMarketPrices.pricePerGramK24;
            else if (goldInv.goldType === "K21")
              pricePerUnit = goldMarketPrices.pricePerGramK21;
            else if (goldInv.goldType === "Pound")
              pricePerUnit = goldMarketPrices.pricePerGoldPound;
            else if (goldInv.goldType === "Ounce")
              pricePerUnit = goldMarketPrices.pricePerOunce;
            if (pricePerUnit)
              currentVal = pricePerUnit * goldInv.quantityInGrams;
          }
        } else if (inv.type === "Currencies") {
          const currInv = inv as CurrencyInvestment;
          const rateKey = `${currInv.currencyCode.toUpperCase()}_EGP`;
          if (
            exchangeRates &&
            exchangeRates[rateKey] &&
            currInv.foreignCurrencyAmount
          ) {
            currentVal = exchangeRates[rateKey] * currInv.foreignCurrencyAmount;
          }
        }
        currentValueSum += currentVal;
      });
      return {
        totalCurrentPortfolioValue: currentValueSum,
        totalPortfolioCostBasis: costBasisSum,
      };
    }, [
      investments,
      listedSecurities,
      goldMarketPrices,
      exchangeRates,
      isLoading,
    ]);

  const totalCurrentPortfolioPnL =
    totalCurrentPortfolioValue - totalPortfolioCostBasis;

  return (
    <div dir={dir} className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("Dashboard")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("overview_of_your_investment_portfolio_and_monthly_cash_flow")}
        </p>
      </div>
      <Separator />

      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          data-testid="recalculate-summary-button"
          onClick={async () => {
            await recalculateDashboardSummary();
            toast({
              title: t("summary_recalculated"),
              description: t("dashboard_summary_values_have_been_updated"),
              testId: "toast-summary-recalculated",
            });
          }}
        >
          <Building className="h-4 w-4" />
          {t("recalculate_summary")}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-1" data-testid="total-invested-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_invested_amount")}
            </CardTitle>
            <DollarSign
              className="h-4 w-4 text-muted-foreground"
              data-testid="total-invested-icon"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className="text-xl font-medium">
                {formatNumberForMobile(isMobile, totalInvested)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("sum_of_all_purchase_costs")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1" data-testid="total-realized-pl-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_realized_pl")}
            </CardTitle>
            {totalRealizedPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-accent" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p
                className={`text-xl font-medium ${totalRealizedPnL >= 0 ? "text-accent" : "text-destructive"}`}
              >
                {formatNumberForMobile(isMobile, totalRealizedPnL)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("profitloss_from_all_completed_sales")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1" data-testid="current-portfolio-pl-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_current_portfolio_pl")}
            </CardTitle>
            {totalCurrentPortfolioPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-accent" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p
                className={`text-xl font-medium ${totalCurrentPortfolioPnL >= 0 ? "text-accent" : "text-destructive"}`}
              >
                {formatNumberForMobile(isMobile, totalCurrentPortfolioPnL)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("current_market_value_vs_total_cost")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1" data-testid="total-cash-balance-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_cash_balance")}
            </CardTitle>
            <Banknote
              className="h-4 w-4 text-muted-foreground"
              data-testid="cash-balance-icon"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className="text-xl font-medium">
                {formatNumberForMobile(isMobile, totalCashBalance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("estimated_available_cash")}
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Monthly Cash Flow Summary */}
      <Card className="mb-8" data-testid="monthly-cash-flow-section">
        <CardHeader data-testid="monthly-cash-flow-header">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>{t("monthly_cash_flow_summary")}</CardTitle>
              <CardDescription>
                {`${t("For")} ${formatMonthYear(new Date(), language)} ${t("includes_current_months_new_investments")}`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cash-flow">
                {t("view_full_details")}
                <ForwardArrowIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CashFlowSummaryCards cashFlowSummary={cashFlowSummary} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div data-testid="investment-distribution-chart">
          <InvestmentDistributionChart />
        </div>
        <div data-testid="monthly-investment-distribution-chart">
          <MonthlyInvestmentDistributionChart />
        </div>
      </div>
      <div className="lg:col-span-3" data-testid="investment-breakdown-section">
        {dashboardSummary && (
          <InvestmentBreakdownCards
            dashboardSummary={dashboardSummary}
            appSettings={{
              investmentTypePercentages:
                appSettings?.investmentTypePercentages || {
                  "Real Estate": 30,
                  Stocks: 25,
                  "Debt Instruments": 20,
                  Currencies: 10,
                  Gold: 15,
                },
            }}
          />
        )}
      </div>
    </div>
  );
}
