
"use client";

import React, { useMemo } from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingDown, Landmark, PiggyBank, FileText, Wallet, Gift, HandHeart, Coins, Settings2, Briefcase } from 'lucide-react';
import { formatNumberWithSuffix, formatMonthYear, isInCurrentMonth } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { 
  DebtInstrumentInvestment, 
  Transaction, 
  IncomeRecord, 
  ExpenseRecord, 
  FixedEstimateRecord,
  RealEstateInvestment,
  Investment
} from '@/lib/types';
import type { Installment } from '@/components/investments/installment-table';

// Helper function to parse YYYY-MM-DD string to a local Date object
const parseDateString = (dateStr?: string): Date | null => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
};

export default function CashFlowPage() {
  const {
    incomeRecords,
    expenseRecords,
    fixedEstimates,
    investments,
    transactions,
    isLoading: isLoadingContext,
  } = useInvestments();

  const isLoading = isLoadingContext;
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { 
      style: 'currency', 
      currency: 'EGP', 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value);
  };

  const formatCurrencyEGPForMobile = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return 'EGP ' + formatNumberWithSuffix(value);
  };

  // Define the type for installments with property info
  type InstallmentWithProperty = Installment & {
    propertyName: string;
    propertyId: string;
  };

  // Get real estate installments due this month with property info
  const realEstateInstallments = useMemo<{ total: number; installments: InstallmentWithProperty[] }>(() => {
    if (!investments) return { total: 0, installments: [] };
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const installmentsList = investments
      .filter((inv): inv is RealEstateInvestment => inv.type === 'Real Estate' && inv.installments !== undefined)
      .flatMap((inv: RealEstateInvestment) => {
        return (inv.installments || []).map((installment: Installment) => ({
          ...installment,
          propertyName: inv.name || inv.propertyAddress || 'Unnamed Property',
          propertyId: inv.id
        }));
      })
      .filter((installment: InstallmentWithProperty) => {
        if (installment.status === 'Paid') return false;
        
        try {
          const dueDate = new Date(installment.dueDate);
          return (
            dueDate.getMonth() === currentMonth &&
            dueDate.getFullYear() === currentYear
          );
        } catch (e) {
          return false;
        }
      });

    return {
      total: installmentsList.reduce((sum, inst) => sum + (inst.amount || 0), 0),
      installments: installmentsList
    };
  }, [investments]);

  // Calculate total real estate installments for the current month
  const realEstateInstallmentsThisMonth = realEstateInstallments.total;

  const {
    monthlySalary,
    otherFixedIncomeMonthly,
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    zakatFixedMonthly,
    charityFixedMonthly,
    livingExpensesMonthly,
    otherFixedExpensesMonthly,
    totalItemizedExpensesThisMonth,
    investmentsMadeThisMonth, // Added this
  } = useMemo(() => {
    let salary = 0;
    let otherFixedInc = 0;
    let manualIncome = 0;
    let certificateInterest = 0;

    let zakat = 0;
    let charity = 0;
    let livingExpenses = 0;
    let otherFixedExp = 0;
    let itemizedExpensesSum = 0;
    let currentMonthInvestments = 0; // Added this

    const fixedEstimatesList = fixedEstimates || [];
    const incomeRecordsList = incomeRecords || [];
    const investmentsList = investments || [];
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
      } else if (fe.isExpense) {
        if (fe.type === 'Zakat') {
          zakat += monthlyAmount;
        } else if (fe.type === 'Charity') {
          charity += monthlyAmount;
        } else if (fe.type === 'Living Expenses') {
          livingExpenses += monthlyAmount;
        } else if (fe.type === 'Other') {
          otherFixedExp += monthlyAmount;
        }
      } else if (!fe.isExpense) {
        otherFixedInc += monthlyAmount;
      }
    });

    // Process Manual Income Records
    incomeRecordsList.forEach(income => {
      const incomeDate = parseDateString(income.date);
      if (incomeDate && isWithinInterval(incomeDate, { start: currentMonthStart, end: currentMonthEnd })) {
        manualIncome += income.amount;
      }
    });

    // Process Dividend Transactions as Income
    if (transactions) {
      transactions.forEach(tx => {
        if (tx.type === 'dividend') {
          const txDate = parseDateString(tx.date);
          if (txDate && isWithinInterval(txDate, { start: currentMonthStart, end: currentMonthEnd })) {
            manualIncome += tx.amount ?? tx.totalAmount ?? 0;
          }
        }
      });
    }

    // Process Certificate Interest (Direct Debt Interest)
    const directDebtInvestments = investmentsList.filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];
    directDebtInvestments.forEach(debt => {
      if (debt.interestRate && debt.amountInvested) { 
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
    
    // Process Investments Made This Month
    investmentsList.forEach((inv: Investment) => {
      if (inv.purchaseDate) {
        const purchaseDateObj = parseDateString(inv.purchaseDate);
        if (purchaseDateObj && isWithinInterval(purchaseDateObj, { start: currentMonthStart, end: currentMonthEnd })) {
          currentMonthInvestments += inv.amountInvested || 0;
        }
      }
    });


    return {
      monthlySalary: salary,
      otherFixedIncomeMonthly: otherFixedInc,
      totalManualIncomeThisMonth: manualIncome,
      totalProjectedCertificateInterestThisMonth: certificateInterest,
      zakatFixedMonthly: zakat,
      charityFixedMonthly: charity,
      livingExpensesMonthly: livingExpenses,
      otherFixedExpensesMonthly: otherFixedExp,
      totalItemizedExpensesThisMonth: itemizedExpensesSum,
      investmentsMadeThisMonth: currentMonthInvestments, // Added this
    };
  }, [fixedEstimates, incomeRecords, investments, expenseRecords, currentMonthStart, currentMonthEnd]);

  const totalIncome = monthlySalary + otherFixedIncomeMonthly + totalManualIncomeThisMonth + totalProjectedCertificateInterestThisMonth;
  const totalExpensesOnly = zakatFixedMonthly + 
    charityFixedMonthly + 
    livingExpensesMonthly +
    otherFixedExpensesMonthly + 
    totalItemizedExpensesThisMonth + 
    realEstateInstallmentsThisMonth;
  const totalInvestmentsOnly = investmentsMadeThisMonth;
  const totalExpenses = totalExpensesOnly + totalInvestmentsOnly;
  const netCashFlow = totalIncome - totalExpenses; // net cash flow remains the same, but now we show breakdowns
  const netCashThisMonth = totalIncome - totalExpensesOnly;


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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Monthly Cash Flow</h1>
          <p className="text-muted-foreground">Track your income, expenses, and recurring estimates to understand your monthly cash flow and financial health.</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6 w-full items-stretch">
        <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Income This Month</CardTitle>
            <Coins className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              <span className="md:hidden">{formatCurrencyEGPForMobile(totalIncome)}</span>
              <span className="hidden md:inline">{formatCurrencyEGP(totalIncome)}</span>
            </p>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-0.5">
              {monthlySalary > 0 && <p>Monthly Salary (Fixed): <span className="md:hidden">{formatCurrencyEGPForMobile(monthlySalary)}</span><span className="hidden md:inline">{formatCurrencyEGP(monthlySalary)}</span></p>}
              {otherFixedIncomeMonthly > 0 && <p>Other Fixed Income: <span className="md:hidden">{formatCurrencyEGPForMobile(otherFixedIncomeMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedIncomeMonthly)}</span></p>}
              {totalManualIncomeThisMonth > 0 && <p>Other Logged Income (incl. Sales Profit): <span className="md:hidden">{formatCurrencyEGPForMobile(totalManualIncomeThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalManualIncomeThisMonth)}</span></p>}
              {totalProjectedCertificateInterestThisMonth > 0 && <p>Projected Debt Interest: <span className="md:hidden">{formatCurrencyEGPForMobile(totalProjectedCertificateInterestThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</span></p>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses This Month</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              <span className="md:hidden">{formatCurrencyEGPForMobile(totalExpensesOnly)}</span>
              <span className="hidden md:inline">{formatCurrencyEGP(totalExpensesOnly)}</span>
            </p>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
              {totalItemizedExpensesThisMonth > 0 && <p>Itemized Logged Expenses: <span className="md:hidden">{formatCurrencyEGPForMobile(totalItemizedExpensesThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalItemizedExpensesThisMonth)}</span></p>}
              {zakatFixedMonthly > 0 && <p>Zakat (Fixed): <span className="md:hidden">{formatCurrencyEGPForMobile(zakatFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(zakatFixedMonthly)}</span></p>}
              {charityFixedMonthly > 0 && <p>Charity (Fixed): <span className="md:hidden">{formatCurrencyEGPForMobile(charityFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(charityFixedMonthly)}</span></p>}
              {livingExpensesMonthly > 0 && <p>Living Expenses: <span className="md:hidden">{formatCurrencyEGPForMobile(livingExpensesMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(livingExpensesMonthly)}</span></p>}
              {otherFixedExpensesMonthly > 0 && <p>Other Fixed Expenses: <span className="md:hidden">{formatCurrencyEGPForMobile(otherFixedExpensesMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedExpensesMonthly)}</span></p>}
              {realEstateInstallments.installments.length > 0 && (
                <p>Real Estate Installments: <span className="md:hidden">{formatCurrencyEGPForMobile(realEstateInstallments.total)}</span><span className="hidden md:inline">{formatCurrencyEGP(realEstateInstallments.total)}</span></p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Investments This Month</CardTitle>
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              <span className="md:hidden">{formatCurrencyEGPForMobile(totalInvestmentsOnly)}</span>
              <span className="hidden md:inline">{formatCurrencyEGP(totalInvestmentsOnly)}</span>
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Investments Made: <span className="md:hidden">{formatCurrencyEGPForMobile(totalInvestmentsOnly)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalInvestmentsOnly)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining Cash After Expenses & Investments</CardTitle>
            <Wallet className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              <span className="md:hidden">{formatCurrencyEGPForMobile(totalIncome - totalExpenses)}</span>
              <span className="hidden md:inline">{formatCurrencyEGP(totalIncome - totalExpenses)}</span>
            </p>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Remaining = Total Income - Total Expenses - Total Investments
            </div>
          </CardContent>
        </Card>
      </div>
      {incomeRecords.filter((income: IncomeRecord) => {
        const incomeDate = parseDateString(income.date);
        return incomeDate && isWithinInterval(incomeDate, { start: currentMonthStart, end: currentMonthEnd });
      }).map((income: IncomeRecord, idx: number) => (
        <div key={`manual-income-${idx}`} className="flex justify-between text-xs">
          <span>{format(new Date(income.date), 'dd-MM-yyyy')} {income.description ? `- ${income.description}` : ''}</span>
          <span>{formatCurrencyEGP(income.amount)}</span>
        </div>
      ))}
      {transactions && transactions.filter((tx: Transaction) => tx.type === 'dividend').filter((tx: Transaction) => {
        const txDate = parseDateString(tx.date);
        return txDate && isWithinInterval(txDate, { start: currentMonthStart, end: currentMonthEnd });
      }).map((tx: Transaction, idx: number) => (
        <div key={`dividend-income-${idx}`} className="flex justify-between text-xs">
          <span>{format(new Date(tx.date), 'dd-MM-yyyy')} - Dividend {tx.tickerSymbol ? `(${tx.tickerSymbol})` : ''}</span>
          <span>{formatCurrencyEGP((tx as any).amount ?? (tx as any).totalAmount ?? 0)}</span>
        </div>
      ))}
      <div className="flex justify-between text-xs font-semibold mt-1">
        <span>Total Other Logged Income:</span>
        <span><span className="md:hidden">{formatCurrencyEGPForMobile(totalManualIncomeThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalManualIncomeThisMonth)}</span></span>
      </div>
      {totalProjectedCertificateInterestThisMonth > 0 && (
        <div className="flex justify-between">
          <span><FileText className="inline mr-2 h-4 w-4 text-green-600" />Projected Debt Interest:</span>
          <span>
            <span className="md:hidden">{formatCurrencyEGPForMobile(totalProjectedCertificateInterestThisMonth)}</span>
            <span className="hidden md:inline">{formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</span>
          </span>
    <hr className="my-2" />
    <div className="flex justify-between font-bold">
      <span>Total Projected Income:</span>
      <span>{formatCurrencyEGPForMobile(totalIncome)}</span>
    </div>
    <Card className="flex flex-col h-full flex-1 min-h-[120px]">
      <CardHeader>
        <CardTitle>Expense Details</CardTitle>
        <CardDescription>Breakdown of expenses for {formatMonthYear(currentMonthStart)}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {zakatFixedMonthly > 0 && (
          <div className="flex justify-between items-center text-red-500 font-semibold"><Gift className="h-4 w-4 mr-1" /> Zakat (Fixed): <span>{formatCurrencyEGPForMobile(zakatFixedMonthly)}</span></div>
        )}
        {charityFixedMonthly > 0 && (
          <div className="flex justify-between items-center text-red-500 font-semibold"><HandHeart className="h-4 w-4 mr-1" /> Charity (Fixed): <span>{formatCurrencyEGPForMobile(charityFixedMonthly)}</span></div>
        )}
        {livingExpensesMonthly > 0 && (
          <div className="flex justify-between items-center text-red-500 font-semibold"><TrendingDown className="h-4 w-4 mr-1" /> Living Expenses: <span>{formatCurrencyEGPForMobile(livingExpensesMonthly)}</span></div>
        )}
        {otherFixedExpensesMonthly > 0 && (
          <div className="flex justify-between items-center text-red-500 font-semibold">Other Fixed Expenses: <span>{formatCurrencyEGPForMobile(otherFixedExpensesMonthly)}</span></div>
        )}
        {totalItemizedExpensesThisMonth > 0 && (
          <div className="flex justify-between items-center text-red-500 font-semibold">Itemized Logged Expenses: <span>{formatCurrencyEGPForMobile(totalItemizedExpensesThisMonth)}</span></div>
        )}
        {realEstateInstallments.installments.length > 0 && (
          <div>
            <div className="font-semibold text-base mt-2 mb-1 text-red-700 dark:text-red-300">Real Estate Installments <span className="text-xs font-normal">({realEstateInstallments.installments.length})</span>:</div>
            <ul className="space-y-2 pl-4 border-l-2 border-red-200 dark:border-red-700">
              {realEstateInstallments.installments.map((installment) => (
                <li key={`${installment.propertyId}-${installment.number}`} className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm">
                    <Landmark className="h-4 w-4 text-red-500" />
                    <span className="whitespace-pre-line">{installment.propertyName} (#{installment.number})</span>
                  </span>
                  <span className="font-medium text-right">
                    {formatCurrencyEGPForMobile(installment.amount || 0)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-2 border-t border-red-100 dark:border-red-900 mt-2 font-bold">
              <span>Total Real Estate Installments:</span>
              <span>{formatCurrencyEGPForMobile(realEstateInstallments.total)}</span>
            </div>
          </div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between font-bold">
          <span>Total Projected Expenses:</span>
          <span>{formatCurrencyEGPForMobile(totalExpensesOnly)}</span>
        </div>
      </CardContent>
    </Card>
    <Card className="flex flex-col h-full flex-1 min-h-[120px]">
      <CardHeader>
        <CardTitle>Investments Details</CardTitle>
        <CardDescription>New investments made in {formatMonthYear(currentMonthStart)}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {investmentsMadeThisMonth > 0 ? (
          <div className="flex justify-between items-center text-blue-600 font-semibold">
            <Briefcase className="h-4 w-4 mr-1" />Investments Made This Month:
            <span>{formatCurrencyEGPForMobile(investmentsMadeThisMonth)}</span>
          </div>
        ) : (
          <div className="text-muted-foreground">No new investments this month.</div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between font-bold">
          <span>Total Investments:</span>
          <span>{formatCurrencyEGPForMobile(totalInvestmentsOnly)}</span>
        </div>
      </CardContent>
    </Card>
  </div>
  )}
  </div>
)}
