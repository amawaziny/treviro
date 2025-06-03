
"use client"; 

import { InvestmentDistributionChart } from "@/components/dashboard/investment-distribution-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInvestments } from '@/hooks/use-investments';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Coins as IncomeIcon, LineChart as LucideLineChart, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { DebtInstrumentInvestment, ExpenseRecord, FixedEstimateRecord, IncomeRecord, Transaction, ListedSecurity, StockInvestment, GoldInvestment, CurrencyInvestment, RealEstateInvestment, GoldMarketPrices, ExchangeRates } from '@/lib/types';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { formatNumberWithSuffix, isGoldRelatedFund, isDebtRelatedFund, isRealEstateRelatedFund, isStockRelatedFund } from '@/lib/utils';
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

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatCurrencyEGPWithSuffix = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    const formattedNumber = formatNumberWithSuffix(value);
    return `EGP ${formattedNumber}`;
  };

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const realEstateInstallments = useMemo<{ total: number; installments: any[] }>(() => {
    if (!investments) return { total: 0, installments: [] };
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const installments = (investments || [])
      .filter((inv: any): inv is RealEstateInvestment => inv.type === 'Real Estate' && inv.installments !== undefined)
      .flatMap((inv: RealEstateInvestment) => (inv.installments || []).map((installment: any) => ({ ...installment, propertyName: inv.name || inv.propertyAddress || 'Unnamed Property', propertyId: inv.id })))
      .filter((installment: any) => {
        if (installment.status === 'Paid') return false;
        try {
          const dueDate = new Date(installment.dueDate);
          return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
        } catch (e) { return false; }
      });
    return { total: installments.reduce((sum: number, inst: any) => sum + (inst.amount || 0), 0), installments };
  }, [investments]);

  const realEstateInstallmentsThisMonth = realEstateInstallments.total;

  const {
    monthlySalary, otherFixedIncomeMonthly, totalManualIncomeThisMonth, totalProjectedCertificateInterestThisMonth,
    zakatFixedMonthly, charityFixedMonthly, otherFixedExpensesMonthly, totalItemizedExpensesThisMonth,
  } = useMemo(() => {
    let salary = 0, otherFixedInc = 0, manualIncome = 0, certificateInterest = 0;
    let zakat = 0, charity = 0, otherFixedExp = 0, itemizedExpensesSum = 0;
    (fixedEstimates || []).forEach(fe => {
      let monthlyAmount = fe.amount;
      if (fe.period === 'Yearly') monthlyAmount /= 12;
      else if (fe.period === 'Quarterly') monthlyAmount /= 3;
      if (fe.type === 'Salary' && !fe.isExpense) salary += monthlyAmount;
      else if (fe.isExpense) {
        if (fe.type === 'Zakat') zakat += monthlyAmount;
        else if (fe.type === 'Charity') charity += monthlyAmount;
        else otherFixedExp += monthlyAmount;
      } else if (!fe.isExpense) otherFixedInc += monthlyAmount;
    });
    (incomeRecords || []).forEach(income => {
      const incomeDate = parseDateString(income.date);
      if (incomeDate && isWithinInterval(incomeDate, { start: currentMonthStart, end: currentMonthEnd })) manualIncome += income.amount;
    });
    ((investments || []).filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[]).forEach(debt => {
      if (debt.interestRate && debt.amountInvested) certificateInterest += (debt.amountInvested * debt.interestRate / 100) / 12;
    });
    (expenseRecords || []).forEach(expense => {
      const expenseDate = parseDateString(expense.date);
      if (expenseDate && isWithinInterval(expenseDate, { start: currentMonthStart, end: currentMonthEnd })) {
        if (expense.category === 'Credit Card' && expense.isInstallment && expense.numberOfInstallments && expense.numberOfInstallments > 0) {
          itemizedExpensesSum += expense.amount / expense.numberOfInstallments;
        } else itemizedExpensesSum += expense.amount;
      }
    });
    return { monthlySalary: salary, otherFixedIncomeMonthly: otherFixedInc, totalManualIncomeThisMonth: manualIncome, totalProjectedCertificateInterestThisMonth: certificateInterest, zakatFixedMonthly: zakat, charityFixedMonthly: charity, otherFixedExpensesMonthly: otherFixedExp, totalItemizedExpensesThisMonth: itemizedExpensesSum };
  }, [fixedEstimates, incomeRecords, investments, expenseRecords, currentMonthStart, currentMonthEnd]);

  const totalIncomeThisMonth = monthlySalary + otherFixedIncomeMonthly + totalManualIncomeThisMonth + totalProjectedCertificateInterestThisMonth;
  const totalExpensesThisMonth = zakatFixedMonthly + charityFixedMonthly + otherFixedExpensesMonthly + totalItemizedExpensesThisMonth + realEstateInstallmentsThisMonth;
  const netCashFlowThisMonth = totalIncomeThisMonth - totalExpensesThisMonth;

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your investment portfolio and monthly cash flow.</p>
      </div>
      <Separator />
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={async () => { await recalculateDashboardSummary(); toast({ title: "Summary recalculated!", description: "Dashboard summary values have been updated." }); }}>
          Recalculate Summary
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-3xl font-bold">{isMobile ? formatCurrencyEGPWithSuffix(totalInvested) : formatCurrencyEGP(totalInvested)}</p>}
            <p className="text-xs text-muted-foreground">Sum of all purchase costs.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realized P/L</CardTitle>
            {totalRealizedPnL >= 0 ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className={`text-3xl font-bold ${totalRealizedPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>{isMobile ? formatCurrencyEGPWithSuffix(totalRealizedPnL) : formatCurrencyEGP(totalRealizedPnL)}</p>}
            <p className="text-xs text-muted-foreground">Profit/Loss from all completed sales.</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Current Portfolio P/L</CardTitle>
             {totalCurrentPortfolioPnL >= 0 ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className={`text-3xl font-bold ${totalCurrentPortfolioPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>{isMobile ? formatCurrencyEGPWithSuffix(totalCurrentPortfolioPnL) : formatCurrencyEGP(totalCurrentPortfolioPnL)}</p>}
            <p className="text-xs text-muted-foreground">Current market value vs. total cost.</p>
          </CardContent>
        </Card>
      </div>
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Monthly Cash Flow Summary</CardTitle>
              <CardDescription>For {format(new Date(), 'MMMM yyyy')}.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cash-flow">View Full Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
                <div className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Income</p>
                  <IncomeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{isMobile ? formatCurrencyEGPWithSuffix(totalIncomeThisMonth) : formatCurrencyEGP(totalIncomeThisMonth)}</p>
              </div>
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
                <div className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</p>
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{isMobile ? formatCurrencyEGPWithSuffix(totalExpensesThisMonth) : formatCurrencyEGP(totalExpensesThisMonth)}</p>
              </div>
              <div className={`p-4 border rounded-lg ${netCashFlowThisMonth >= 0 ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700" : "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700"}`}>
                <div className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <p className={`text-sm font-medium ${netCashFlowThisMonth >=0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>Net Cash Flow</p>
                  <Wallet className={`h-4 w-4 ${netCashFlowThisMonth >=0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>
                <p className={`text-2xl font-bold ${netCashFlowThisMonth >=0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{isMobile ? formatCurrencyEGPWithSuffix(netCashFlowThisMonth) : formatCurrencyEGP(netCashFlowThisMonth)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="lg:col-span-3">
        <InvestmentDistributionChart />
      </div>
      <div className="lg:col-span-3">
        <InvestmentBreakdownCards />
      </div>
    </div>
  );
}

    