"use client";

import React, { useMemo } from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingDown, Landmark, PiggyBank, FileText, Wallet, Gift, HandHeart, Coins, Settings2 } from 'lucide-react';
import { formatNumberWithSuffix } from '@/lib/utils';
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
    
    const installments = investments
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
      total: installments.reduce((sum, inst) => sum + (inst.amount || 0), 0),
      installments
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
    otherFixedExpensesMonthly,
    totalItemizedExpensesThisMonth,
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
        } else {
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

    return {
      monthlySalary: salary,
      otherFixedIncomeMonthly: otherFixedInc,
      totalManualIncomeThisMonth: manualIncome,
      totalProjectedCertificateInterestThisMonth: certificateInterest,
      zakatFixedMonthly: zakat,
      charityFixedMonthly: charity,
      otherFixedExpensesMonthly: otherFixedExp,
      totalItemizedExpensesThisMonth: itemizedExpensesSum,
    };
  }, [fixedEstimates, incomeRecords, investments, expenseRecords, currentMonthStart, currentMonthEnd]);

  const totalIncome = monthlySalary + otherFixedIncomeMonthly + totalManualIncomeThisMonth + totalProjectedCertificateInterestThisMonth;
  const totalExpenses = zakatFixedMonthly + 
    charityFixedMonthly + 
    otherFixedExpensesMonthly + 
    totalItemizedExpensesThisMonth + 
    realEstateInstallmentsThisMonth;
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

        <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses This Month</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              <span className="md:hidden">{formatCurrencyEGPForMobile(totalExpenses)}</span>
              <span className="hidden md:inline">{formatCurrencyEGP(totalExpenses)}</span>
            </p>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
              {totalItemizedExpensesThisMonth > 0 && <p>Itemized Logged Expenses: <span className="md:hidden">{formatCurrencyEGPForMobile(totalItemizedExpensesThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalItemizedExpensesThisMonth)}</span></p>}
              {zakatFixedMonthly > 0 && <p>Zakat (Fixed): <span className="md:hidden">{formatCurrencyEGPForMobile(zakatFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(zakatFixedMonthly)}</span></p>}
              {charityFixedMonthly > 0 && <p>Charity (Fixed): <span className="md:hidden">{formatCurrencyEGPForMobile(charityFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(charityFixedMonthly)}</span></p>}
              {otherFixedExpensesMonthly > 0 && <p>Other Fixed Expenses: <span className="md:hidden">{formatCurrencyEGPForMobile(otherFixedExpensesMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedExpensesMonthly)}</span></p>}
              {realEstateInstallments.installments.length > 0 && (
                <p>Real Estate Installments: <span className="md:hidden">{formatCurrencyEGPForMobile(realEstateInstallments.total)}</span><span className="hidden md:inline">{formatCurrencyEGP(realEstateInstallments.total)}</span></p>
              )}
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
              <span className="md:hidden">{formatCurrencyEGPForMobile(remainingAmount)}</span>
              <span className="hidden md:inline">{formatCurrencyEGP(remainingAmount)}</span>
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
                {otherFixedIncomeMonthly > 0 && <div className="flex justify-between"><span><Settings2 className="inline mr-2 h-4 w-4 text-green-600" />Other Fixed Income:</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(otherFixedIncomeMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedIncomeMonthly)}</span></span></div>}
                {totalManualIncomeThisMonth > 0 && <div className="flex justify-between"><span><PiggyBank className="inline mr-2 h-4 w-4 text-green-600" />Other Logged Income (incl. Sales Profit):</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(totalManualIncomeThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalManualIncomeThisMonth)}</span></span></div>}
                {totalProjectedCertificateInterestThisMonth > 0 && <div className="flex justify-between"><span><FileText className="inline mr-2 h-4 w-4 text-green-600" />Projected Debt Interest:</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(totalProjectedCertificateInterestThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalProjectedCertificateInterestThisMonth)}</span></span></div>}
                <hr className="my-2"/>
                <div className="flex justify-between font-semibold"><span>Total Projected Income:</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(totalIncome)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalIncome)}</span></span></div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>Breakdown of expenses for {format(new Date(), 'MMMM yyyy')}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {totalItemizedExpensesThisMonth > 0 && <div className="flex justify-between"><span><TrendingDown className="inline mr-2 h-4 w-4 text-red-600" />Itemized Logged Expenses (Monthly Impact):</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(totalItemizedExpensesThisMonth)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalItemizedExpensesThisMonth)}</span></span></div>}
                {zakatFixedMonthly > 0 && <div className="flex justify-between"><span><Gift className="inline mr-2 h-4 w-4 text-red-600" />Zakat (Fixed):</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(zakatFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(zakatFixedMonthly)}</span></span></div>}
                {charityFixedMonthly > 0 && <div className="flex justify-between"><span><HandHeart className="inline mr-2 h-4 w-4 text-red-600" />Charity (Fixed):</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(charityFixedMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(charityFixedMonthly)}</span></span></div>}
                {otherFixedExpensesMonthly > 0 && <div className="flex justify-between"><span><Settings2 className="inline mr-2 h-4 w-4 text-red-600" />Other Fixed Expenses:</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(otherFixedExpensesMonthly)}</span><span className="hidden md:inline">{formatCurrencyEGP(otherFixedExpensesMonthly)}</span></span></div>}
                {realEstateInstallments.installments.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium text-sm mt-2 mb-1 text-red-700 dark:text-red-300">Real Estate Installments ({realEstateInstallments.installments.length}):</div>
                    <div className="space-y-1 pl-4">
                      {realEstateInstallments.installments.map((installment) => (
                        <div key={`${installment.propertyId}-${installment.number}`} className="flex justify-between">
                          <span className="flex items-center">
                            <Landmark className="inline mr-2 h-3.5 w-3.5 text-red-500" />
                            {installment.propertyName} (Installment #{installment.number})
                          </span>
                          <span className="font-medium">
                            <span className="md:hidden">{formatCurrencyEGPForMobile(installment.amount || 0)}</span>
                            <span className="hidden md:inline">{formatCurrencyEGP(installment.amount || 0)}</span>
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-1 border-t border-red-100 dark:border-red-900 mt-2">
                        <span className="font-medium">Total Real Estate Installments:</span>
                        <span className="font-semibold">
                          <span className="md:hidden">{formatCurrencyEGPForMobile(realEstateInstallments.total)}</span>
                          <span className="hidden md:inline">{formatCurrencyEGP(realEstateInstallments.total)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <hr className="my-2"/>
                <div className="flex justify-between font-semibold"><span>Total Projected Expenses:</span> <span><span className="md:hidden">{formatCurrencyEGPForMobile(totalExpenses)}</span><span className="hidden md:inline">{formatCurrencyEGP(totalExpenses)}</span></span></div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
