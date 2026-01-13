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
import { useInvestments } from "@/contexts/investment-context";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coins,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Banknote,
  Building,
} from "lucide-react"; // Coins will be used as IncomeIcon replacement
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from "react";
import {
  DashboardSummaries,
  defaultAppSettings,
  defaultDashboardSummaries,
  defaultDashboardSummary,
  Investment,
} from "@/lib/types";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { CashFlowSummaryCards } from "@/components/cash-flow/CashFlowSummaryCards";
import { formatMonthYear, formatNumberForMobile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InvestmentBreakdownCards } from "@/components/dashboard/investment-breakdown-cards";
import { useTransactions } from "@/hooks/use-transactions";
import { useDashboard } from "@/hooks/use-dashboard";
import useFinancialRecords from "@/hooks/use-financial-records";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useCashflow } from "@/hooks/use-cashflow";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const ForwardArrowIcon = language === "ar" ? ArrowLeft : ArrowRight;

  const month = useMemo(() => startOfDay(new Date()), []);
  const startMonth = useMemo(() => startOfMonth(new Date()), []);
  const endMonth = useMemo(() => endOfMonth(new Date()), []);

  const { investments, isLoading: isLoadingInvestments } = useInvestments();

  const {
    dashboardSummary,
    isLoading: isLoadingDashboard,
    refreshDashboard,
  } = useDashboard();

  const {
    expensesManualCreditCard,
    fixedEstimates,
    isLoading: isLoadingFinancialRecords,
  } = useFinancialRecords(startMonth, endMonth);

  const { appSettings, isLoading: isLoadingAppSettings } = useAppSettings();

  const { transactions, isLoading: isLoadingTransactions } = useTransactions(
    startMonth,
    endMonth,
  );

  // let transactions: [] = [];
  // let isLoadingTransactions = false;

  const isLoading =
    isLoadingDashboard ||
    isLoadingFinancialRecords ||
    isLoadingAppSettings ||
    isLoadingTransactions ||
    isLoadingInvestments;

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const totalInvested = dashboardSummary?.totalInvested ?? 0;
  const totalRealizedPnL = dashboardSummary?.totalRealizedPnL ?? 0;
  const totalCashBalance = dashboardSummary?.totalCashBalance ?? 0;
  const totalCurrentPortfolioPnL = dashboardSummary?.totalUnrealizedPnL ?? 0;

  const {
    totalIncome,
    totalProjectedDebtMonthlyInterest,
    totalExpenses,
    incomeTillNow,
    totalFixedIncome,
    totalFixedExpenses,
    totalRealEstateInstallments,
    totalSecuritiesInvestments,
    totalDebtInvestments,
    totalGoldInvestments,
    totalInvestments,
    totalExpensesManualCreditCard,
    totalCurrencyInvestments,
  } = useCashflow({
    expensesManualCreditCard,
    investments,
    fixedEstimates,
    transactions,
    month,
  });

  return (
    <div className="space-y-8" data-testid="dashboard-page">
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
            await refreshDashboard();
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

      {/* New summary cards for Net Invested Assets and Net Worth */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-4">
        <Card className="lg:col-span-1" data-testid="net-invested-assets-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("net_invested_assets")}
            </CardTitle>
            <Briefcase
              className="h-4 w-4 text-muted-foreground"
              data-testid="net-invested-assets-icon"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p
                data-testid="net-invested-assets-amount"
                className="text-xl font-medium"
              >
                {formatNumberForMobile(
                  isMobile,
                  totalInvested + totalCashBalance,
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("net_invested_assets_desc")}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1" data-testid="net-worth-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("net_worth")}
            </CardTitle>
            <Coins
              className="h-4 w-4 text-muted-foreground"
              data-testid="net-worth-icon"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p data-testid="net-worth-amount" className="text-xl font-medium">
                {formatNumberForMobile(
                  isMobile,
                  totalInvested +
                    totalCashBalance +
                    totalRealizedPnL +
                    totalCurrentPortfolioPnL,
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("net_worth_desc")}
            </p>
          </CardContent>
        </Card>
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
              <p
                className="text-xl font-medium"
                data-testid="total-invested-amount"
              >
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
                data-testid="total-realized-pl-amount"
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
                data-testid="total-current-portfolio-pl-amount"
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
              <p
                data-testid="total-cash-balance-amount"
                className="text-xl font-medium"
              >
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
          <CashFlowSummaryCards
            totalIncome={totalIncome}
            totalFixedIncome={totalFixedIncome}
            totalProjectedDebtMonthlyInterest={
              totalProjectedDebtMonthlyInterest
            }
            incomeTillNow={incomeTillNow}
            totalExpenses={totalExpenses}
            totalFixedExpenses={totalFixedExpenses}
            totalExpensesManualCreditCard={totalExpensesManualCreditCard}
            totalRealEstateInstallments={totalRealEstateInstallments}
            totalStockInvestments={totalSecuritiesInvestments}
            totalDebtInvestments={totalDebtInvestments}
            totalGoldInvestments={totalGoldInvestments}
            totalInvestments={totalInvestments}
          />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div data-testid="investment-distribution-chart">
          <InvestmentDistributionChart
            investments={investments}
            isLoading={isLoading}
          />
        </div>
        <div data-testid="monthly-investment-distribution-chart">
          <MonthlyInvestmentDistributionChart
            totalSecuritiesInvestments={totalSecuritiesInvestments}
            totalGoldInvestments={totalGoldInvestments}
            totalDebtInvestments={totalDebtInvestments}
            totalRealEstateInstallments={totalRealEstateInstallments}
            totalExpenses={totalExpenses}
            totalCurrencyInvestments={totalCurrencyInvestments}
            isLoading={isLoading}
          />
        </div>
      </div>
      <div className="lg:col-span-3" data-testid="investment-breakdown-section">
        {dashboardSummary && (
          <InvestmentBreakdownCards
            dashboardSummary={dashboardSummary}
            appSettings={{
              investmentTypePercentages:
                appSettings?.investmentTypePercentages ||
                defaultAppSettings.investmentTypePercentages,
            }}
          />
        )}
      </div>
    </div>
  );
}
