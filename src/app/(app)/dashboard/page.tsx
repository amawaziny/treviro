
"use client"; 

import { InvestmentDistributionChart } from "@/components/dashboard/investment-distribution-chart";
import { MonthlyInvestmentDistributionChart } from "@/components/dashboard/monthly-investment-distribution-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInvestments } from '@/hooks/use-investments';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Coins, Briefcase, LineChart as LucideLineChart, ArrowRight, Banknote } from "lucide-react"; // Coins will be used as IncomeIcon replacement
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { DebtInstrumentInvestment, ExpenseRecord, FixedEstimateRecord, IncomeRecord, Investment as InvestmentType, Transaction, ListedSecurity, StockInvestment, GoldInvestment, CurrencyInvestment, RealEstateInvestment, GoldMarketPrices, ExchangeRates } from '@/lib/types';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { formatNumberWithSuffix, isGoldRelatedFund, isDebtRelatedFund, isRealEstateRelatedFund, isStockRelatedFund } from '@/lib/utils';
import { calculateMonthlyCashFlowSummary } from '@/lib/financial-utils';
import { useToast } from '@/hooks/use-toast';
import { InvestmentBreakdownCards } from '@/components/dashboard/investment-breakdown-cards';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import { useGoldMarketPrices } from '@/hooks/use-gold-market-prices';
import { useExchangeRates } from '@/hooks/use-exchange-rates';

// Helper function to parse YYYY-MM-DD string to a local Date object
const parseDateString = (dateStr?: string): Date | null => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
};

export default function DashboardPage() {
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
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();
  const { goldMarketPrices, isLoading: isLoadingGoldPrices } = useGoldMarketPrices();
  const { exchangeRates, isLoading: isLoadingExchangeRates } = useExchangeRates();
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isLoading = isLoadingDashboardSummaryContext || isLoadingContext || isLoadingListedSecurities || isLoadingGoldPrices || isLoadingExchangeRates;

  const totalInvested = dashboardSummary?.totalInvestedAcrossAllAssets ?? 0;
  const totalRealizedPnL = dashboardSummary?.totalRealizedPnL ?? 0;
  const totalCashBalance = dashboardSummary?.totalCashBalance ?? 0;

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatCurrencyEGPWithSuffix = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    const formattedNumber = formatNumberWithSuffix(value);
    return `EGP ${formattedNumber}`;
  };


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
    totalInvestmentsOnly,
    netCashFlowThisMonth
  } = calculateMonthlyCashFlowSummary({
    incomeRecords,
    expenseRecords,
    investments,
    fixedEstimates
  });


  const { totalCurrentPortfolioValue, totalPortfolioCostBasis } = useMemo(() => {
    if (isLoading) return { totalCurrentPortfolioValue: 0, totalPortfolioCostBasis: 0 };

    let currentValueSum = 0;
    let costBasisSum = 0;

    (investments || []).forEach(inv => {
      costBasisSum += inv.amountInvested || 0;
      let currentVal = inv.amountInvested || 0; // Default to cost if no market price

      if (inv.type === 'Stocks') {
        const stockInv = inv as StockInvestment;
        const security = listedSecurities.find(ls => ls.symbol === stockInv.tickerSymbol);
        if (security && security.price && stockInv.numberOfShares) {
          currentVal = security.price * stockInv.numberOfShares;
        }
      } else if (inv.type === 'Gold') {
        const goldInv = inv as GoldInvestment;
        if (goldMarketPrices && goldInv.quantityInGrams) {
          let pricePerUnit: number | undefined;
          if (goldInv.goldType === 'K24') pricePerUnit = goldMarketPrices.pricePerGramK24;
          else if (goldInv.goldType === 'K21') pricePerUnit = goldMarketPrices.pricePerGramK21;
          else if (goldInv.goldType === 'Pound') pricePerUnit = goldMarketPrices.pricePerGoldPound;
          else if (goldInv.goldType === 'Ounce') pricePerUnit = goldMarketPrices.pricePerOunce;
          if (pricePerUnit) currentVal = pricePerUnit * goldInv.quantityInGrams;
        }
      } else if (inv.type === 'Currencies') {
        const currInv = inv as CurrencyInvestment;
        const rateKey = `${currInv.currencyCode.toUpperCase()}_EGP`;
        if (exchangeRates && exchangeRates[rateKey] && currInv.foreignCurrencyAmount) {
          currentVal = exchangeRates[rateKey] * currInv.foreignCurrencyAmount;
        }
      }
      currentValueSum += currentVal;
    });
    return { totalCurrentPortfolioValue: currentValueSum, totalPortfolioCostBasis: costBasisSum };
  }, [investments, listedSecurities, goldMarketPrices, exchangeRates, isLoading]);
  
  const totalCurrentPortfolioPnL = totalCurrentPortfolioValue - totalPortfolioCostBasis;

  const totalExpensesThisMonth = totalItemizedExpensesThisMonth + totalInvestmentsThisMonth;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your investment portfolio and monthly cash flow.</p>
      </div>
      <Separator />

      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={async () => { await recalculateDashboardSummary(); toast({ title: "Summary recalculated!", description: "Dashboard summary values have been updated." }); }}>
          Recalculate Summary
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-2xl font-medium">{isMobile ? formatCurrencyEGPWithSuffix(totalInvested) : formatCurrencyEGP(totalInvested)}</p>}
            <p className="text-xs text-muted-foreground">Sum of all purchase costs.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realized P/L</CardTitle>
            {totalRealizedPnL >= 0 ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className={`text-2xl font-medium ${totalRealizedPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>{isMobile ? formatCurrencyEGPWithSuffix(totalRealizedPnL) : formatCurrencyEGP(totalRealizedPnL)}</p>}
            <p className="text-xs text-muted-foreground">Profit/Loss from all completed sales.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Current Portfolio P/L</CardTitle>
             {totalCurrentPortfolioPnL >= 0 ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className={`text-2xl font-medium ${totalCurrentPortfolioPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>{isMobile ? formatCurrencyEGPWithSuffix(totalCurrentPortfolioPnL) : formatCurrencyEGP(totalCurrentPortfolioPnL)}</p>}
            <p className="text-xs text-muted-foreground">Current market value vs. total cost.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Balance</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-2xl font-medium">{isMobile ? formatCurrencyEGPWithSuffix(totalCashBalance) : formatCurrencyEGP(totalCashBalance)}</p>}
            <p className="text-xs text-muted-foreground">Estimated available cash.</p>
          </CardContent>
        </Card>
      </div>
           {/* Monthly Cash Flow Summary */}
           <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Monthly Cash Flow Summary</CardTitle>
              <CardDescription>For {format(new Date(), 'MMMM yyyy')}. Includes current month's new investments.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cash-flow">View Full Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Total Income Card */}
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Income This Month</CardTitle>
                <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium text-green-700 dark:text-green-300">
                  <span className="md:hidden">{formatCurrencyEGPWithSuffix(totalIncome)}</span>
                  <span className="hidden md:inline">{formatCurrencyEGP(totalIncome)}</span>
                </p>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-0.5">
                  {monthlySalary > 0 && <p>Monthly Salary (Fixed): <span className="md:hidden">{formatCurrencyEGPWithSuffix(monthlySalary)}</span><span className="hidden md:inline">{formatCurrencyEGP(monthlySalary)}</span></p>}
                  {otherFixedIncomeMonthly > 0 && <p>Other Fixed Income: <span className="md:hidden">{formatCurrencyEGPWithSuffix(otherFixedIncomeMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedIncomeMonthly)}</span></p>}
                  {totalManualIncomeThisMonth > 0 && <p>Other Logged Income (incl. Sales Profit): <span className="md:hidden">{formatCurrencyEGPWithSuffix(totalManualIncomeThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalManualIncomeThisMonth)}</span></p>}
                  {totalProjectedCertificateInterestThisMonth > 0 && <p>Projected Debt Interest: <span className="md:hidden">{formatCurrencyEGPWithSuffix(totalProjectedCertificateInterestThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</span></p>}
                </div>
              </CardContent>
            </Card>
            {/* Total Expenses Card */}
            <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses This Month</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium text-red-700 dark:text-red-300">
                  <span className="md:hidden">{formatCurrencyEGPWithSuffix(totalExpensesOnly)}</span>
                  <span className="hidden md:inline">{formatCurrencyEGP(totalExpensesOnly)}</span>
                </p>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
                  {totalItemizedExpensesThisMonth > 0 && <p>Itemized Logged Expenses: <span className="md:hidden">{formatCurrencyEGPWithSuffix(totalItemizedExpensesThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalItemizedExpensesThisMonth)}</span></p>}
                  {zakatFixedMonthly > 0 && <p>Zakat (Fixed): <span className="md:hidden">{formatCurrencyEGPWithSuffix(zakatFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(zakatFixedMonthly)}</span></p>}
                  {charityFixedMonthly > 0 && <p>Charity (Fixed): <span className="md:hidden">{formatCurrencyEGPWithSuffix(charityFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(charityFixedMonthly)}</span></p>}
                  {livingExpensesMonthly > 0 && <p>Living Expenses: <span className="md:hidden">{formatCurrencyEGPWithSuffix(livingExpensesMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(livingExpensesMonthly)}</span></p>}
                  {otherFixedExpensesMonthly > 0 && <p>Other Fixed Expenses: <span className="md:hidden">{formatCurrencyEGPWithSuffix(otherFixedExpensesMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedExpensesMonthly)}</span></p>}
                  {realEstateInstallmentsMonthly > 0 && (
                    <p>Real Estate Installments: <span className="md:hidden">{formatCurrencyEGPWithSuffix(realEstateInstallmentsMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(realEstateInstallmentsMonthly)}</span></p>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Total Investments Card */}
            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Investments This Month</CardTitle>
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Stocks:</span>
                  <span className="font-medium">{formatCurrencyEGPWithSuffix(totalStockInvestmentThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Real Estate:</span>
                  <span className="font-medium">{formatCurrencyEGPWithSuffix(realEstateInstallmentsMonthly)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Debts:</span>
                  <span className="font-medium">{formatCurrencyEGPWithSuffix(totalDebtInvestmentThisMonth)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 dark:text-blue-300">Gold:</span>
                  <span className="font-medium">{formatCurrencyEGPWithSuffix(totalGoldInvestmentThisMonth)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-blue-100 dark:border-blue-800">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-sm">Total:</span>
                    <span>{formatCurrencyEGPWithSuffix(totalInvestmentsThisMonth)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Remaining Cash Card */}
            <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 flex flex-col h-[220px] flex-1">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining Cash After Expenses & Investments</CardTitle>
                <Wallet className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium text-gray-700 dark:text-gray-300">
                  <span className="md:hidden">{formatCurrencyEGPWithSuffix(netCashFlowThisMonth)}</span>
                  <span className="hidden md:inline">{formatCurrencyEGP(netCashFlowThisMonth)}</span>
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Remaining = Total Income - Total Expenses - Total Investments
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

    
