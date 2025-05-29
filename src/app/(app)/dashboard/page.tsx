"use client"; 

import { InvestmentDistributionChart } from "@/components/dashboard/investment-distribution-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInvestments } from "@/hooks/use-investments";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Coins as IncomeIcon, LineChart as LucideLineChart, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { DebtInstrumentInvestment, ExpenseRecord, FixedEstimateRecord, IncomeRecord, Transaction } from '@/lib/types';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { formatNumberWithSuffix } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { InvestmentBreakdownCards } from '@/components/dashboard/investment-breakdown-cards';

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
    isLoading: isLoadingDashboardSummary,
    incomeRecords,
    expenseRecords,
    fixedEstimates,
    investments,
    isLoading: isLoadingContext, // This will be true if any context data is loading
    recalculateDashboardSummary,
  } = useInvestments();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isLoading = isLoadingDashboardSummary || isLoadingContext;

  const totalInvested = dashboardSummary?.totalInvestedAcrossAllAssets ?? 0;
  const totalRealizedPnL = dashboardSummary?.totalRealizedPnL ?? 0;

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatCurrencyEGPWithSuffix = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    const formattedNumber = formatNumberWithSuffix(value);
    // Assuming formatNumberWithSuffix doesn't include currency symbol, add EGP prefix
    return `EGP ${formattedNumber}`;
  };

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const {
    totalIncomeThisMonth,
    totalExpensesThisMonth,
    netCashFlowThisMonth,
  } = useMemo(() => {
    let salary = 0;
    let otherFixedInc = 0;
    let manualIncome = 0;
    let certificateInterest = 0;

    let zakat = 0;
    let charity = 0;
    let otherFixedExp = 0;
    let itemizedExpensesSum = 0;

    const fixedEstimatesList = fixedEstimates || [];
    const incomeRecordsList = incomeRecords || [];
    const investmentsList = investments || [];
    const expenseRecordsList = expenseRecords || [];

    const directDebtInvestments = investmentsList.filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];

    // Process Fixed Estimates
    fixedEstimatesList.forEach(fe => {
      let monthlyAmount = fe.amount;
      if (fe.period === 'Yearly') {
        monthlyAmount /= 12;
      } else if (fe.period === 'Quarterly') {
        monthlyAmount /= 3;
      }

      if (fe.type === 'Salary' && !fe.isExpense) {
        salary += monthlyAmount;
      } else if (fe.type === 'Zakat' && fe.isExpense) {
        zakat += monthlyAmount;
      } else if (fe.type === 'Charity' && fe.isExpense) {
        charity += monthlyAmount;
      } else if (fe.type === 'Other') {
        if (fe.isExpense) {
          otherFixedExp += monthlyAmount;
        } else {
          otherFixedInc += monthlyAmount;
        }
      }
    });

    const hasFixedSalaryEstimate = fixedEstimatesList.some(fe => fe.type === 'Salary' && !fe.isExpense && fe.amount > 0);

    // Process IncomeRecords for the current month (excluding likely salary if fixed salary exists)
    incomeRecordsList.forEach(record => {
      const recordDate = parseDateString(record.date);
      if (recordDate && isWithinInterval(recordDate, { start: currentMonthStart, end: currentMonthEnd })) {
        const isLikelySalaryRecord = record.type === 'Other' &&
                                    (record.description?.toLowerCase().includes('salary') ||
                                     record.source?.toLowerCase().includes('salary') ||
                                     record.description?.toLowerCase().includes('paycheck') ||
                                     record.source?.toLowerCase().includes('paycheck'));
        if (hasFixedSalaryEstimate && isLikelySalaryRecord) {
          // Skip
        } else {
          manualIncome += record.amount; // This includes profits from sales (type 'Profit Share')
        }
      }
    });

    // Process Certificate Interest (Direct Debt Interest)
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-based
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    directDebtInvestments.forEach(debt => {
      if (debt.interestRate && debt.amountInvested && debt.debtSubType === 'Certificate' && debt.certificateInterestFrequency && debt.maturityDate) {
        const annualInterest = (debt.amountInvested * debt.interestRate) / 100;
        const maturity = parseDateString(debt.maturityDate);
        if (!maturity) return;
        const payoutDay = maturity.getDate();
        const payoutMonth = maturity.getMonth(); // 0-based
        const payoutYear = maturity.getFullYear();
        let shouldAdd = false;
        if (debt.certificateInterestFrequency === 'Monthly') {
          // Always add if today is on/after payout day
          shouldAdd = currentDay >= payoutDay;
        } else if (debt.certificateInterestFrequency === 'Quarterly') {
          // Add only if (currentMonth - payoutMonth) % 3 === 0 and day >= payoutDay
          const monthsSince = (currentYear - payoutYear) * 12 + (currentMonth - payoutMonth);
          shouldAdd = monthsSince >= 0 && monthsSince % 3 === 0 && currentDay >= payoutDay;
        } else if (debt.certificateInterestFrequency === 'Yearly') {
          // Add only if currentMonth === payoutMonth and day >= payoutDay
          shouldAdd = (currentMonth === payoutMonth) && (currentDay >= payoutDay);
        }
        if (shouldAdd) {
          if (debt.certificateInterestFrequency === 'Monthly') {
            certificateInterest += annualInterest / 12;
          } else if (debt.certificateInterestFrequency === 'Quarterly') {
            certificateInterest += annualInterest / 4;
          } else if (debt.certificateInterestFrequency === 'Yearly') {
            certificateInterest += annualInterest;
          }
        }
      } else if (debt.interestRate && debt.amountInvested) {
        // Fallback for legacy or non-certificate debt: keep old logic
        const annualInterest = (debt.amountInvested * debt.interestRate) / 100;
        certificateInterest += annualInterest / 12;
      }
    });
    
    // Process Itemized Expenses
    expenseRecordsList.forEach(expense => {
      const expenseDate = parseDateString(expense.date);
      if (expenseDate && isWithinInterval(expenseDate, { start: currentMonthStart, end: currentMonthEnd })) {
        if (expense.category === 'Credit Card' && expense.isInstallment && expense.numberOfInstallments && expense.numberOfInstallments > 0) {
          itemizedExpensesSum += expense.amount / expense.numberOfInstallments;
        } else {
          itemizedExpensesSum += expense.amount;
        }
      }
    });

    const incomeSum = salary + otherFixedInc + manualIncome + certificateInterest;
    const expenseSum = zakat + charity + otherFixedExp + itemizedExpensesSum;

    return {
      totalIncomeThisMonth: incomeSum,
      totalExpensesThisMonth: expenseSum,
      netCashFlowThisMonth: incomeSum - expenseSum,
    };
  }, [fixedEstimates, incomeRecords, investments, expenseRecords, currentMonthStart, currentMonthEnd]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your investment portfolio and monthly cash flow.</p>
      </div>
      
      <Separator />

      <div className="flex justify-end mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await recalculateDashboardSummary();
            toast({ title: "Summary recalculated!", description: "Dashboard summary values have been updated." });
          }}
        >
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
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{isMobile ? formatCurrencyEGPWithSuffix(totalInvested) : formatCurrencyEGP(totalInvested)}</p>
            )}
            <p className="text-xs text-muted-foreground">Sum of all purchase costs.</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realized P/L</CardTitle>
            {totalRealizedPnL >= 0 ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <p className={`text-3xl font-bold ${totalRealizedPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {isMobile ? formatCurrencyEGPWithSuffix(totalRealizedPnL) : formatCurrencyEGP(totalRealizedPnL)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Profit/Loss from all completed sales.</p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Portfolio Value</CardTitle>
            <LucideLineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-3xl font-bold text-muted-foreground/70">(Coming Soon)</p>
            <p className="text-xs text-muted-foreground">Unrealized P/L and market value.</p>
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
              <Link href="/cash-flow">
                View Full Details <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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

