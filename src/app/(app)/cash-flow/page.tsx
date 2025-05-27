
"use client";

import React, { useMemo } from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, Landmark, PiggyBank, FileText, Wallet, Gift, HandHeart, Coins, Settings2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { DebtInstrumentInvestment, Transaction, IncomeRecord, ExpenseRecord, FixedEstimateRecord } from '@/lib/types';

export default function CashFlowPage() {
  const {
    incomeRecords,
    expenseRecords,
    fixedEstimates, // Changed from monthlySettings
    investments,
    transactions,
    isLoading: isLoadingContext,
  } = useInvestments();

  const isLoading = isLoadingContext;

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const {
    monthlySalary,
    otherFixedIncomeMonthly,
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    totalProfitFromSalesThisMonth,
    zakatFixedMonthly,
    charityFixedMonthly,
    otherFixedExpensesMonthly,
    totalItemizedExpensesThisMonth,
  } = useMemo(() => {
    let salary = 0;
    let otherFixedInc = 0;
    let manualIncome = 0;
    let certificateInterest = 0;
    let salesProfit = 0;

    let zakat = 0;
    let charity = 0;
    let otherFixedExp = 0;
    let itemizedExpensesSum = 0;

    const fixedEstimatesList = fixedEstimates || [];
    const incomeRecordsList = incomeRecords || [];
    const investmentsList = investments || [];
    const transactionsList = transactions || [];
    const expenseRecordsList = expenseRecords || [];


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

    // Process IncomeRecords for the current month
    incomeRecordsList.forEach(record => {
      if (isWithinInterval(new Date(record.date), { start: currentMonthStart, end: currentMonthEnd })) {
        const isLikelySalaryRecord = record.type === 'Other' &&
                                    (record.description?.toLowerCase().includes('salary') ||
                                     record.source?.toLowerCase().includes('salary') ||
                                     record.description?.toLowerCase().includes('paycheck') ||
                                     record.source?.toLowerCase().includes('paycheck'));

        if (hasFixedSalaryEstimate && isLikelySalaryRecord) {
          // Skip this record as it's likely a duplicate of the fixed salary
        } else {
          manualIncome += record.amount;
        }
      }
    });

    // Process Certificate Interest
    const directDebtInvestments = investmentsList.filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];
    directDebtInvestments.forEach(debt => {
      if (debt.interestRate && debt.amountInvested) { // All direct debt types can have interest
        const annualInterest = (debt.amountInvested * debt.interestRate) / 100;
        certificateInterest += annualInterest / 12;
      }
    });

    // Process Profit from Sales
    const salesThisMonth = transactionsList.filter(tx =>
      tx.type === 'sell' &&
      tx.profitOrLoss !== undefined &&
      isWithinInterval(new Date(tx.date), { start: currentMonthStart, end: currentMonthEnd })
    );
    salesThisMonth.forEach(sale => {
      salesProfit += sale.profitOrLoss || 0;
    });

    // Process Itemized Expenses
    expenseRecordsList.forEach(expense => {
      if (isWithinInterval(new Date(expense.date), { start: currentMonthStart, end: currentMonthEnd })) {
        if (expense.category === 'Credit Card' && expense.isInstallment && expense.numberOfInstallments && expense.numberOfInstallments > 0) {
          itemizedExpensesSum += expense.amount / expense.numberOfInstallments;
        } else {
          itemizedExpensesSum += expense.amount;
        }
      }
    });

    return {
      monthlySalary: salary,
      otherFixedIncomeMonthly: otherFixedInc,
      totalManualIncomeThisMonth: manualIncome,
      totalProjectedCertificateInterestThisMonth: certificateInterest,
      totalProfitFromSalesThisMonth: salesProfit,
      zakatFixedMonthly: zakat,
      charityFixedMonthly: charity,
      otherFixedExpensesMonthly: otherFixedExp,
      totalItemizedExpensesThisMonth: itemizedExpensesSum,
    };
  }, [fixedEstimates, incomeRecords, investments, transactions, expenseRecords, currentMonthStart, currentMonthEnd]);

  const totalIncome = monthlySalary + otherFixedIncomeMonthly + totalManualIncomeThisMonth + totalProjectedCertificateInterestThisMonth + totalProfitFromSalesThisMonth;
  const totalExpenses = zakatFixedMonthly + charityFixedMonthly + otherFixedExpensesMonthly + totalItemizedExpensesThisMonth;
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
            <Coins className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrencyEGP(totalIncome)}</p>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-0.5">
              {monthlySalary > 0 && <p>Monthly Salary (Fixed): {formatCurrencyEGP(monthlySalary)}</p>}
              {otherFixedIncomeMonthly > 0 && <p>Other Fixed Income: {formatCurrencyEGP(otherFixedIncomeMonthly)}</p>}
              {totalManualIncomeThisMonth > 0 && <p>Other Logged Income: {formatCurrencyEGP(totalManualIncomeThisMonth)}</p>}
              {totalProjectedCertificateInterestThisMonth > 0 && <p>Projected Debt Interest: {formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</p>}
              {totalProfitFromSalesThisMonth > 0 && <p>Profit from Sales: {formatCurrencyEGP(totalProfitFromSalesThisMonth)}</p>}
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
                {totalItemizedExpensesThisMonth > 0 && <p>Itemized Logged Expenses: {formatCurrencyEGP(totalItemizedExpensesThisMonth)}</p>}
                {zakatFixedMonthly > 0 && <p>Zakat (Fixed): {formatCurrencyEGP(zakatFixedMonthly)}</p>}
                {charityFixedMonthly > 0 && <p>Charity (Fixed): {formatCurrencyEGP(charityFixedMonthly)}</p>}
                {otherFixedExpensesMonthly > 0 && <p>Other Fixed Expenses: {formatCurrencyEGP(otherFixedExpensesMonthly)}</p>}
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
                {monthlySalary > 0 && <div className="flex justify-between"><span><DollarSign className="inline mr-2 h-4 w-4 text-green-600" />Monthly Salary (Fixed):</span> <span>{formatCurrencyEGP(monthlySalary)}</span></div>}
                {otherFixedIncomeMonthly > 0 && <div className="flex justify-between"><span><Settings2 className="inline mr-2 h-4 w-4 text-green-600" />Other Fixed Income:</span> <span>{formatCurrencyEGP(otherFixedIncomeMonthly)}</span></div>}
                {totalManualIncomeThisMonth > 0 && <div className="flex justify-between"><span><PiggyBank className="inline mr-2 h-4 w-4 text-green-600" />Other Logged Income:</span> <span>{formatCurrencyEGP(totalManualIncomeThisMonth)}</span></div>}
                {totalProjectedCertificateInterestThisMonth > 0 && <div className="flex justify-between"><span><FileText className="inline mr-2 h-4 w-4 text-green-600" />Projected Debt Interest:</span> <span>{formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</span></div>}
                {totalProfitFromSalesThisMonth > 0 && <div className="flex justify-between"><span><TrendingUp className="inline mr-2 h-4 w-4 text-green-600" />Profit from Security Sales:</span> <span>{formatCurrencyEGP(totalProfitFromSalesThisMonth)}</span></div>}
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
                {totalItemizedExpensesThisMonth > 0 && <div className="flex justify-between"><span><TrendingDown className="inline mr-2 h-4 w-4 text-red-600" />Itemized Logged Expenses (Monthly Impact):</span> <span>{formatCurrencyEGP(totalItemizedExpensesThisMonth)}</span></div>}
                {zakatFixedMonthly > 0 && <div className="flex justify-between"><span><Gift className="inline mr-2 h-4 w-4 text-red-600" />Zakat (Fixed):</span> <span>{formatCurrencyEGP(zakatFixedMonthly)}</span></div>}
                {charityFixedMonthly > 0 && <div className="flex justify-between"><span><HandHeart className="inline mr-2 h-4 w-4 text-red-600" />Charity (Fixed):</span> <span>{formatCurrencyEGP(charityFixedMonthly)}</span></div>}
                {otherFixedExpensesMonthly > 0 && <div className="flex justify-between"><span><Settings2 className="inline mr-2 h-4 w-4 text-red-600" />Other Fixed Expenses:</span> <span>{formatCurrencyEGP(otherFixedExpensesMonthly)}</span></div>}
                <hr className="my-2"/>
                <div className="flex justify-between font-semibold"><span>Total Projected Expenses:</span> <span>{formatCurrencyEGP(totalExpenses)}</span></div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
