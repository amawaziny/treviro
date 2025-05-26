
"use client";

import React, { useMemo } from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, Landmark, PiggyBank, FileText, Wallet, Gift, HandHeart } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { DebtInstrumentInvestment, Transaction, IncomeRecord, ExpenseRecord, MonthlySettings } from '@/lib/types';

export default function CashFlowPage() {
  const {
    incomeRecords,
    expenseRecords,
    monthlySettings, // Fetch monthlySettings
    investments,
    transactions,
    isLoading: isLoadingContext,
  } = useInvestments();

  const isLoading = isLoadingContext; // Consider isLoading from monthlySettings if it were separate

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const {
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    totalProfitFromSalesThisMonth,
    totalItemizedExpensesThisMonth,
    estimatedLiving,
    estimatedZakatContribution,
    estimatedCharityContribution
  } = useMemo(() => {
    let manualIncome = 0;
    let certificateInterest = 0;
    let salesProfit = 0;
    let itemizedExpensesSum = 0;

    (incomeRecords || []).forEach(record => {
      if (isWithinInterval(new Date(record.date), { start: currentMonthStart, end: currentMonthEnd })) {
        manualIncome += record.amount;
      }
    });

    const directDebtInvestments = (investments || []).filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];
    directDebtInvestments.forEach(debt => {
      // Only include interest from certificates for now, as per previous logic
      if (debt.debtSubType === 'Certificate' && debt.interestRate && debt.amountInvested) {
        const annualInterest = (debt.amountInvested * debt.interestRate) / 100;
        certificateInterest += annualInterest / 12;
      }
    });

    const salesThisMonth = (transactions || []).filter(tx =>
      tx.type === 'sell' &&
      tx.profitOrLoss !== undefined &&
      isWithinInterval(new Date(tx.date), { start: currentMonthStart, end: currentMonthEnd })
    );
    salesThisMonth.forEach(sale => {
      salesProfit += sale.profitOrLoss || 0;
    });

    (expenseRecords || []).forEach(expense => {
      if (isWithinInterval(new Date(expense.date), { start: currentMonthStart, end: currentMonthEnd })) {
        itemizedExpensesSum += expense.amount;
      }
    });

    return {
      totalManualIncomeThisMonth: manualIncome,
      totalProjectedCertificateInterestThisMonth: certificateInterest,
      totalProfitFromSalesThisMonth: salesProfit,
      totalItemizedExpensesThisMonth: itemizedExpensesSum,
      estimatedLiving: monthlySettings?.estimatedLivingExpenses ?? 0,
      estimatedZakatContribution: monthlySettings?.estimatedZakat ?? 0,
      estimatedCharityContribution: monthlySettings?.estimatedCharity ?? 0,
    };
  }, [incomeRecords, expenseRecords, monthlySettings, investments, transactions, currentMonthStart, currentMonthEnd]);

  const totalIncome = totalManualIncomeThisMonth + totalProjectedCertificateInterestThisMonth + totalProfitFromSalesThisMonth;
  const totalFixedEstimates = estimatedLiving + estimatedZakatContribution + estimatedCharityContribution;
  const totalExpenses = totalItemizedExpensesThisMonth + totalFixedEstimates;
  const remainingAmount = totalIncome - totalExpenses;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-1/2" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-12 w-3/4" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Monthly Cash Flow
          </h1>
          <p className="text-muted-foreground">
            Overview for {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Income This Month</CardTitle>
            <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrencyEGP(totalIncome)}</p>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-0.5">
              <p>Manual Income: {formatCurrencyEGP(totalManualIncomeThisMonth)}</p>
              <p>Projected Certificate Interest: {formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</p>
              <p>Profit from Sales: {formatCurrencyEGP(totalProfitFromSalesThisMonth)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses This Month</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrencyEGP(totalExpenses)}</p>
             <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
                <p>Itemized Logged Expenses: {formatCurrencyEGP(totalItemizedExpensesThisMonth)}</p>
                <p>Est. Living Expenses: {formatCurrencyEGP(estimatedLiving)}</p>
                <p>Est. Zakat: {formatCurrencyEGP(estimatedZakatContribution)}</p>
                <p>Est. Charity: {formatCurrencyEGP(estimatedCharityContribution)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={remainingAmount >= 0 ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700" : "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${remainingAmount >=0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                Remaining Amount
            </CardTitle>
            <Wallet className={`h-5 w-5 ${remainingAmount >=0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remainingAmount >=0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                {formatCurrencyEGP(remainingAmount)}
            </p>
            <p className={`text-xs mt-1 ${remainingAmount >=0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {remainingAmount >= 0 ? "Available for investment or savings." : "Expenses exceed income this month."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Income Details</CardTitle>
                <CardDescription>Breakdown of income sources for {format(new Date(), 'MMMM yyyy')}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between"><span><PiggyBank className="inline mr-2 h-4 w-4 text-green-600" />Manually Logged Income:</span> <span>{formatCurrencyEGP(totalManualIncomeThisMonth)}</span></div>
                <div className="flex justify-between"><span><FileText className="inline mr-2 h-4 w-4 text-green-600" />Projected Certificate Interest:</span> <span>{formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</span></div>
                <div className="flex justify-between"><span><TrendingUp className="inline mr-2 h-4 w-4 text-green-600" />Profit from Security Sales:</span> <span>{formatCurrencyEGP(totalProfitFromSalesThisMonth)}</span></div>
                <hr className="my-2"/>
                <div className="flex justify-between font-semibold"><span>Total Projected Income:</span> <span>{formatCurrencyEGP(totalIncome)}</span></div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>Breakdown of expenses for {format(new Date(), 'MMMM yyyy')}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between"><span><TrendingDown className="inline mr-2 h-4 w-4 text-red-600" />Itemized Logged Expenses:</span> <span>{formatCurrencyEGP(totalItemizedExpensesThisMonth)}</span></div>
                <div className="flex justify-between"><span><Landmark className="inline mr-2 h-4 w-4 text-red-600" />Est. Living Expenses:</span> <span>{formatCurrencyEGP(estimatedLiving)}</span></div>
                <div className="flex justify-between"><span><Gift className="inline mr-2 h-4 w-4 text-red-600" />Est. Zakat:</span> <span>{formatCurrencyEGP(estimatedZakatContribution)}</span></div>
                <div className="flex justify-between"><span><HandHeart className="inline mr-2 h-4 w-4 text-red-600" />Est. Charity:</span> <span>{formatCurrencyEGP(estimatedCharityContribution)}</span></div>
                <hr className="my-2"/>
                <div className="flex justify-between font-semibold"><span>Total Projected Expenses:</span> <span>{formatCurrencyEGP(totalExpenses)}</span></div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
