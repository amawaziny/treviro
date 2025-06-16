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
  LineChart as LucideLineChart,
  ArrowRight,
  Banknote,
} from "lucide-react"; // Coins will be used as IncomeIcon replacement
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type {
  DebtInstrumentInvestment,
  ExpenseRecord,
  FixedEstimateRecord,
  IncomeRecord,
  Investment as InvestmentType,
  Transaction,
  ListedSecurity,
  StockInvestment,
  GoldInvestment,
  CurrencyInvestment,
  RealEstateInvestment,
  GoldMarketPrices,
  ExchangeRates,
} from "@/lib/types";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  formatNumberWithSuffix,
  formatCurrencyWithCommas,
  formatMonthYear,
} from "@/lib/utils";
import { calculateMonthlyCashFlowSummary } from "@/lib/financial-utils";
import { useToast } from "@/hooks/use-toast";
import { InvestmentBreakdownCards } from "@/components/dashboard/investment-breakdown-cards";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useGoldMarketPrices } from "@/hooks/use-gold-market-prices";
import { useExchangeRates } from "@/hooks/use-exchange-rates";

export default function DashboardPage() {
  const { t } = useLanguage();
  const {
    dashboardSummary,
    isLoading: isLoadingDashboardSummaryContext,
    incomeRecords,
    expenseRecords,
    fixedEstimates,
    investments,
    isLoading: isLoadingContext,
    recalculateDashboardSummary,
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

  const {
    totalIncome,
    monthlySalary,
    otherFixedIncomeMonthly,
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    totalExpensesOnly,
    livingExpensesMonthly,
    zakatFixedMonthly,
    charityFixedMonthly,
    otherFixedExpensesMonthly,
    realEstateInstallmentsMonthly,
    totalItemizedExpensesThisMonth,
    totalInvestmentsThisMonth,
    totalStockInvestmentThisMonth,
    totalDebtInvestmentThisMonth,
    totalGoldInvestmentThisMonth,
    netCashFlowThisMonth,
  } = calculateMonthlyCashFlowSummary({
    incomeRecords,
    expenseRecords,
    investments,
    fixedEstimates,
  });

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
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("overview_of_your_investment_portfolio_and_monthly_cash_flow")}
        </p>
      </div>
      <Separator />

      <div className="flex justify-end mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await recalculateDashboardSummary();
            toast({
              title: t("summary_recalculated"),
              description: t("dashboard_summary_values_have_been_updated"),
            });
          }}
        >
          {t("recalculate_summary")}
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_invested_amount")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className="text-2xl font-medium">
                {isMobile
                  ? formatNumberWithSuffix(totalInvested)
                  : formatCurrencyWithCommas(totalInvested)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("sum_of_all_purchase_costs")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
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
                className={`text-2xl font-medium ${totalRealizedPnL >= 0 ? "text-accent" : "text-destructive"}`}
              >
                {isMobile
                  ? formatNumberWithSuffix(totalRealizedPnL)
                  : formatCurrencyWithCommas(totalRealizedPnL)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("profitloss_from_all_completed_sales")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
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
                className={`text-2xl font-medium ${totalCurrentPortfolioPnL >= 0 ? "text-accent" : "text-destructive"}`}
              >
                {isMobile
                  ? formatNumberWithSuffix(totalCurrentPortfolioPnL)
                  : formatCurrencyWithCommas(totalCurrentPortfolioPnL)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("current_market_value_vs_total_cost")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_cash_balance")}
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className="text-2xl font-medium">
                {isMobile
                  ? formatNumberWithSuffix(totalCashBalance)
                  : formatCurrencyWithCommas(totalCashBalance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("estimated_available_cash")}
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Monthly Cash Flow Summary */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>{t("monthly_cash_flow_summary")}</CardTitle>
              <CardDescription>
                For {formatMonthYear(new Date())}
                {t("includes_current_months_new_investments")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cash-flow">
                {t("view_full_details")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Total Income Card */}
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t("total_income_this_month")}
                </CardTitle>
                <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium text-green-700 dark:text-green-300">
                  <span className="md:hidden">
                    {formatNumberWithSuffix(totalIncome)}
                  </span>
                  <span className="hidden md:inline">
                    {formatCurrencyWithCommas(totalIncome)}
                  </span>
                </p>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-0.5">
                  {monthlySalary > 0 && (
                    <p>
                      {t("monthly_salary_fixed")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(monthlySalary)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(monthlySalary)}
                      </span>
                    </p>
                  )}
                  {otherFixedIncomeMonthly > 0 && (
                    <p>
                      {t("other_fixed_income")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(otherFixedIncomeMonthly)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(otherFixedIncomeMonthly)}
                      </span>
                    </p>
                  )}
                  {totalManualIncomeThisMonth > 0 && (
                    <p>
                      {t("other_logged_income_incl_sales_profit")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(totalManualIncomeThisMonth)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(totalManualIncomeThisMonth)}
                      </span>
                    </p>
                  )}
                  {totalProjectedCertificateInterestThisMonth > 0 && (
                    <p>
                      {t("projected_debt_interest")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(
                          totalProjectedCertificateInterestThisMonth,
                        )}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(
                          totalProjectedCertificateInterestThisMonth,
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Total Expenses Card */}
            <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  {t("total_expenses_this_month")}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium text-red-700 dark:text-red-300">
                  <span className="md:hidden">
                    {formatNumberWithSuffix(totalExpensesOnly)}
                  </span>
                  <span className="hidden md:inline">
                    {formatCurrencyWithCommas(totalExpensesOnly)}
                  </span>
                </p>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
                  {totalItemizedExpensesThisMonth > 0 && (
                    <p>
                      {t("itemized_logged_expenses")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(totalItemizedExpensesThisMonth)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(
                          totalItemizedExpensesThisMonth,
                        )}
                      </span>
                    </p>
                  )}
                  {zakatFixedMonthly > 0 && (
                    <p>
                      {t("zakat_fixed")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(zakatFixedMonthly)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(zakatFixedMonthly)}
                      </span>
                    </p>
                  )}
                  {charityFixedMonthly > 0 && (
                    <p>
                      {t("charity_fixed")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(charityFixedMonthly)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(charityFixedMonthly)}
                      </span>
                    </p>
                  )}
                  {livingExpensesMonthly > 0 && (
                    <p>
                      {t("living_expenses")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(livingExpensesMonthly)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(livingExpensesMonthly)}
                      </span>
                    </p>
                  )}
                  {otherFixedExpensesMonthly > 0 && (
                    <p>
                      {t("other_fixed_expenses")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(otherFixedExpensesMonthly)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(otherFixedExpensesMonthly)}
                      </span>
                    </p>
                  )}
                  {realEstateInstallmentsMonthly > 0 && (
                    <p>
                      {t("real_estate_installments")}{" "}
                      <span className="md:hidden">
                        {formatNumberWithSuffix(realEstateInstallmentsMonthly)}
                      </span>
                      <span className="hidden md:inline">
                        {formatCurrencyWithCommas(
                          realEstateInstallmentsMonthly,
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Total Investments Card */}
            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {t("total_investments_this_month")}
                </CardTitle>
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {t("stocks")}
                  </span>
                  <span className="font-medium">
                    {formatNumberWithSuffix(totalStockInvestmentThisMonth)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {t("real_estate")}
                  </span>
                  <span className="font-medium">
                    {formatNumberWithSuffix(realEstateInstallmentsMonthly)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {t("debts")}
                  </span>
                  <span className="font-medium">
                    {formatNumberWithSuffix(totalDebtInvestmentThisMonth)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {t("gold")}
                  </span>
                  <span className="font-medium">
                    {formatNumberWithSuffix(totalGoldInvestmentThisMonth)}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-blue-100 dark:border-blue-800">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-sm">{t("total")}</span>
                    <span>
                      {formatNumberWithSuffix(totalInvestmentsThisMonth)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Remaining Cash Card */}
            <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("remaining_cash_after_expenses_investments")}
                </CardTitle>
                <Wallet className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium text-gray-700 dark:text-gray-300">
                  <span className="md:hidden">
                    {formatNumberWithSuffix(netCashFlowThisMonth)}
                  </span>
                  <span className="hidden md:inline">
                    {formatCurrencyWithCommas(netCashFlowThisMonth)}
                  </span>
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t("remaining_total_income_total_expenses_total_investments")}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <InvestmentDistributionChart />
        <MonthlyInvestmentDistributionChart />
      </div>
      <div className="lg:col-span-3">
        <InvestmentBreakdownCards />
      </div>
    </div>
  );
}
