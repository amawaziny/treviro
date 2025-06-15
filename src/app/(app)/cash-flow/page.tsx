"use client";
import { useLanguage } from "@/contexts/language-context";

import React, { useMemo } from "react";
import { useInvestments } from "@/hooks/use-investments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingDown,
  Landmark,
  FileText,
  Wallet,
  Gift,
  HandHeart,
  Coins,
  Briefcase,
} from "lucide-react";
import {
  formatNumberWithSuffix,
  formatMonthYear,
  formatDateDisplay,
  formatCurrencyWithCommas,
} from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  IncomeRecord,
  Transaction,
  Investment,
  RealEstateInvestment,
  StockInvestment,
  DebtInstrumentInvestment,
  GoldInvestment,
} from "@/lib/types";
import type { Installment } from "@/components/investments/real-estate/installment-table";

// Helper function to parse YYYY-MM-DD string to a local Date object
const parseDateString = (dateStr?: string): Date | null => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  return new Date(year, month - 1, day);
};

export default function CashFlowPage() {
  const { t: t } = useLanguage();
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

  // Calculate total investments for the current month by type
  const totalStockInvestmentThisMonth = (investments || [])
    .filter((investment) => {
      if (investment.type !== "Stocks") return false;
      const stockInv = investment as StockInvestment;
      const purchaseDate = parseDateString(stockInv.purchaseDate);
      return (
        purchaseDate &&
        isWithinInterval(purchaseDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      );
    })
    .reduce((sum, inv) => sum + (inv as StockInvestment).amountInvested, 0);

  const totalDebtInvestmentThisMonth = (investments || [])
    .filter((investment) => {
      if (investment.type !== t("debt_instruments")) return false;
      const debtInv = investment as DebtInstrumentInvestment;
      const purchaseDate = parseDateString(debtInv.purchaseDate);
      return (
        purchaseDate &&
        isWithinInterval(purchaseDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      );
    })
    .reduce(
      (sum, inv) => sum + (inv as DebtInstrumentInvestment).amountInvested,
      0,
    );

  const totalGoldInvestmentThisMonth = (investments || [])
    .filter((investment) => {
      if (investment.type !== "Gold") return false;
      const goldInv = investment as GoldInvestment;
      const purchaseDate = parseDateString(goldInv.purchaseDate);
      return (
        purchaseDate &&
        isWithinInterval(purchaseDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      );
    })
    .reduce((sum, inv) => sum + (inv as GoldInvestment).amountInvested, 0);

  // Define the type for installments with property info
  type InstallmentWithProperty = Installment & {
    propertyName: string;
    propertyId: string;
  };

  // Get real estate installments due this month with property info
  const realEstateInstallments = useMemo<{
    total: number;
    installments: InstallmentWithProperty[];
  }>(() => {
    if (!investments) return { total: 0, installments: [] };
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const installmentsList = investments
      .filter(
        (inv): inv is RealEstateInvestment =>
          inv.type === "Real Estate" && inv.installments !== undefined,
      )
      .flatMap((inv: RealEstateInvestment) => {
        return (inv.installments || []).map((installment: Installment) => ({
          ...installment,
          propertyName:
            inv.name || inv.propertyAddress || t("unnamed_property"),
          propertyId: inv.id,
        }));
      })
      .filter((installment: InstallmentWithProperty) => {
        // Only include PAID installments due this month
        if (installment.status !== "Paid") return false;
        try {
          const dueDate = parseDateString(installment.dueDate);
          return (
            dueDate &&
            dueDate.getMonth() === currentMonth &&
            dueDate.getFullYear() === currentYear
          );
        } catch (e) {
          return false;
        }
      });
    return {
      total: installmentsList.reduce(
        (sum, inst) => sum + (inst.amount || 0),
        0,
      ),
      installments: installmentsList,
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
    fixedEstimatesList.forEach((fe) => {
      let monthlyAmount = fe.amount;
      if (fe.period === "Yearly") {
        monthlyAmount /= 12;
      } else if (fe.period === "Quarterly") {
        monthlyAmount /= 3;
      }

      if (fe.type === "Salary" && !fe.isExpense) {
        salary += monthlyAmount;
      } else if (fe.isExpense) {
        if (fe.type === "Zakat") {
          zakat += monthlyAmount;
        } else if (fe.type === "Charity") {
          charity += monthlyAmount;
        } else if (fe.type === "Living Expenses") {
          livingExpenses += monthlyAmount;
        } else if (fe.type === "Other") {
          otherFixedExp += monthlyAmount;
        }
      } else if (!fe.isExpense) {
        otherFixedInc += monthlyAmount;
      }
    });

    // Process Manual Income Records
    incomeRecordsList.forEach((income) => {
      const incomeDate = parseDateString(income.date);
      if (
        incomeDate &&
        isWithinInterval(incomeDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        manualIncome += income.amount;
      }
    });

    // Process Dividend Transactions as Income
    if (transactions) {
      transactions.forEach((tx) => {
        if (tx.type === "dividend") {
          const txDate = parseDateString(tx.date);
          if (
            txDate &&
            isWithinInterval(txDate, {
              start: currentMonthStart,
              end: currentMonthEnd,
            })
          ) {
            manualIncome += tx.amount ?? tx.totalAmount ?? 0;
          }
        }
      });
    }

    // Process Certificate Interest (Direct Debt Interest)
    const directDebtInvestments = investmentsList.filter(
      (inv) => inv.type === t("debt_instruments"),
    ) as DebtInstrumentInvestment[];
    directDebtInvestments.forEach((debt) => {
      if (debt.interestRate && debt.amountInvested) {
        const annualInterest = (debt.amountInvested * debt.interestRate) / 100;
        certificateInterest += annualInterest / 12;
      }
    });

    // Process Itemized Expenses
    expenseRecordsList.forEach((expense) => {
      const expenseDate = parseDateString(expense.date);
      if (
        expenseDate &&
        isWithinInterval(expenseDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        if (
          expense.category === t("credit_card") &&
          expense.isInstallment &&
          expense.numberOfInstallments &&
          expense.numberOfInstallments > 0
        ) {
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
        if (
          purchaseDateObj &&
          isWithinInterval(purchaseDateObj, {
            start: currentMonthStart,
            end: currentMonthEnd,
          })
        ) {
          currentMonthInvestments += inv.amountInvested || 0;
        }
      }
    });
    // Add real estate installments as investments
    currentMonthInvestments += realEstateInstallmentsThisMonth;

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
  }, [
    fixedEstimates,
    incomeRecords,
    investments,
    expenseRecords,
    currentMonthStart,
    currentMonthEnd,
  ]);

  const totalIncome =
    monthlySalary +
    otherFixedIncomeMonthly +
    totalManualIncomeThisMonth +
    totalProjectedCertificateInterestThisMonth;
  const totalExpensesOnly =
    zakatFixedMonthly +
    charityFixedMonthly +
    livingExpensesMonthly +
    otherFixedExpensesMonthly +
    totalItemizedExpensesThisMonth; // real estate installments are now only investments
  const totalInvestmentsOnly = investmentsMadeThisMonth; // Already includes real estate installments, no need to add again
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
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t("monthly_cash_flow")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t(
              "track_your_income_expenses_and_recurring_estimates_to_understand_your_monthly_cash_flow_and_financial_health",
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6 w-full items-stretch">
        <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("total_income_this_month")}
            </CardTitle>
            <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
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
        <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              {t("total_expenses_this_month")}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
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
                    {formatCurrencyWithCommas(totalItemizedExpensesThisMonth)}
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
              {realEstateInstallments.installments.length > 0 && (
                <p>
                  {t("real_estate_installments")}{" "}
                  <span className="md:hidden">
                    {formatNumberWithSuffix(realEstateInstallments.total)}
                  </span>
                  <span className="hidden md:inline">
                    {formatCurrencyWithCommas(realEstateInstallments.total)}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
                {formatNumberWithSuffix(realEstateInstallmentsThisMonth)}
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
                <span>{formatNumberWithSuffix(totalInvestmentsOnly)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 flex flex-col h-[220px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("remaining_cash_after_expenses_investments")}
            </CardTitle>
            <Wallet className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              <span className="md:hidden">
                {formatNumberWithSuffix(totalIncome - totalExpenses)}
              </span>
              <span className="hidden md:inline">
                {formatCurrencyWithCommas(totalIncome - totalExpenses)}
              </span>
            </p>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t("remaining_total_income_total_expenses_total_investments")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Section: 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6">
        {/* Income Details */}
        <Card className="flex flex-col h-full min-h-[220px]">
          <CardHeader>
            <CardTitle>{t("income_details")}</CardTitle>
            <CardDescription>
              {t("breakdown_of_income_for")}
              {formatMonthYear(currentMonthStart)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomeRecords
              .filter((income: IncomeRecord) => {
                const incomeDate = parseDateString(income.date);
                return (
                  incomeDate &&
                  isWithinInterval(incomeDate, {
                    start: currentMonthStart,
                    end: currentMonthEnd,
                  })
                );
              })
              .map((income: IncomeRecord, idx: number) => (
                <div
                  key={`manual-income-${idx}`}
                  className="flex justify-between text-xs"
                >
                  <span>
                    {formatDateDisplay(income.date)}{" "}
                    {income.description ? `- ${income.description}` : ""}
                  </span>
                  <span>{formatNumberWithSuffix(income.amount)}</span>
                </div>
              ))}
            {transactions &&
              transactions
                .filter((tx: Transaction) => tx.type === "dividend")
                .filter((tx: Transaction) => {
                  const txDate = parseDateString(tx.date);
                  return (
                    txDate &&
                    isWithinInterval(txDate, {
                      start: currentMonthStart,
                      end: currentMonthEnd,
                    })
                  );
                })
                .map((tx: Transaction, idx: number) => (
                  <div
                    key={`dividend-income-${idx}`}
                    className="flex justify-between text-xs"
                  >
                    <span>
                      {formatDateDisplay(tx.date)}
                      {t("dividend")}{" "}
                      {tx.tickerSymbol ? `(${tx.tickerSymbol})` : ""}
                    </span>
                    <span>
                      {formatCurrencyWithCommas(
                        (tx as any).amount ?? (tx as any).totalAmount ?? 0,
                      )}
                    </span>
                  </div>
                ))}
            <div className="flex justify-between text-xs font-semibold mt-1">
              <span>{t("total_other_logged_income")}</span>
              <span>
                <span className="md:hidden">
                  {formatNumberWithSuffix(totalManualIncomeThisMonth)}
                </span>
                <span className="hidden md:inline">
                  {formatCurrencyWithCommas(totalManualIncomeThisMonth)}
                </span>
              </span>
            </div>
            {totalProjectedCertificateInterestThisMonth > 0 && (
              <div className="flex justify-between text-xs">
                <span>
                  <FileText className="inline mr-2 h-4 w-4 text-green-600" />
                  {t("projected_debt_interest")}
                </span>
                <span>
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
                </span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-bold">
              <span>{t("total_projected_income")}</span>
              <span>{formatNumberWithSuffix(totalIncome)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Expense Details */}
        <Card className="flex flex-col h-full min-h-[220px]">
          <CardHeader>
            <CardTitle>{t("expense_details")}</CardTitle>
            <CardDescription>
              {t("breakdown_of_expenses_for")}
              {formatMonthYear(currentMonthStart)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {zakatFixedMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 font-semibold">
                <span className="flex items-center gap-1">
                  <Gift className="h-4 w-4" />
                  {t("zakat_fixed")}
                </span>
                <span>{formatNumberWithSuffix(zakatFixedMonthly)}</span>
              </div>
            )}
            {charityFixedMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 font-semibold">
                <span className="flex items-center gap-1">
                  <HandHeart className="h-4 w-4" />
                  {t("charity_fixed")}
                </span>
                <span>{formatNumberWithSuffix(charityFixedMonthly)}</span>
              </div>
            )}
            {livingExpensesMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 font-semibold">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {t("living_expenses")}
                </span>
                <span>{formatNumberWithSuffix(livingExpensesMonthly)}</span>
              </div>
            )}
            {otherFixedExpensesMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 font-semibold">
                <span className="flex items-center gap-1">
                  {t("other_fixed_expenses")}
                </span>
                <span>{formatNumberWithSuffix(otherFixedExpensesMonthly)}</span>
              </div>
            )}
            {totalItemizedExpensesThisMonth > 0 && (
              <div className="flex justify-between items-center text-red-500 font-semibold">
                {t("itemized_logged_expenses")}{" "}
                <span>
                  {formatNumberWithSuffix(totalItemizedExpensesThisMonth)}
                </span>
              </div>
            )}

            <hr className="my-2" />
            <div className="flex justify-between font-bold">
              <span>{t("total_projected_expenses")}</span>
              <span>{formatNumberWithSuffix(totalExpensesOnly)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Investments Details */}
        <Card className="flex flex-col h-full min-h-[220px]">
          <CardHeader>
            <CardTitle>{t("investments_details")}</CardTitle>
            <CardDescription>
              {t("new_investments_made_in")}
              {formatMonthYear(currentMonthStart)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              {/* Total Stock Investment */}
              <div className="flex justify-between items-center text-blue-600 font-semibold mb-2">
                <span className="flex items-center gap-2">
                  {t("total_stock")}
                </span>
                <span>
                  {formatNumberWithSuffix(totalStockInvestmentThisMonth)}
                </span>
              </div>
              {/* Stocks */}
              {investments &&
                investments.filter((inv) => {
                  if (inv.type !== "Stocks" || !inv.purchaseDate) return false;
                  const parsed = parseDateString(inv.purchaseDate);
                  return (
                    parsed &&
                    isWithinInterval(parsed, {
                      start: currentMonthStart,
                      end: currentMonthEnd,
                    })
                  );
                }).length > 0 && (
                  <div className="mb-2">
                    <div className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2"></div>
                    <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                      {investments
                        .filter((inv) => {
                          if (inv.type !== "Stocks" || !inv.purchaseDate)
                            return false;
                          const parsed = parseDateString(inv.purchaseDate);
                          return (
                            parsed &&
                            isWithinInterval(parsed, {
                              start: currentMonthStart,
                              end: currentMonthEnd,
                            })
                          );
                        })
                        .map((investment) => {
                          const stock = investment as StockInvestment;
                          return (
                            <li
                              key={stock.id}
                              className="flex justify-between items-center text-sm"
                            >
                              <span>
                                {stock.tickerSymbol ||
                                  stock.id ||
                                  t("unnamed_stock")}
                              </span>
                              <span>
                                {formatNumberWithSuffix(
                                  stock.amountInvested || 0,
                                )}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              {/* Debt Instruments */}
              {investments &&
                investments.filter((inv) => {
                  if (inv.type !== t("debt_instruments") || !inv.purchaseDate)
                    return false;
                  const parsed = parseDateString(inv.purchaseDate);
                  return (
                    parsed &&
                    isWithinInterval(parsed, {
                      start: currentMonthStart,
                      end: currentMonthEnd,
                    })
                  );
                }).length > 0 && (
                  <div className="mb-2">
                    <div className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {t("debt_instruments_purchased")}
                    </div>
                    <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                      {investments
                        .filter((inv) => {
                          if (
                            inv.type !== t("debt_instruments") ||
                            !inv.purchaseDate
                          )
                            return false;
                          const parsed = parseDateString(inv.purchaseDate);
                          return (
                            parsed &&
                            isWithinInterval(parsed, {
                              start: currentMonthStart,
                              end: currentMonthEnd,
                            })
                          );
                        })
                        .map((debt) => (
                          <li
                            key={debt.id}
                            className="flex justify-between items-center text-sm"
                          >
                            <span>{debt.name || t("unnamed_debt")}</span>
                            <span>
                              {formatNumberWithSuffix(debt.amountInvested || 0)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              {/* Gold */}
              {investments &&
                investments.filter((inv) => {
                  if (inv.type !== "Gold" || !inv.purchaseDate) return false;
                  const parsed = parseDateString(inv.purchaseDate);
                  return (
                    parsed &&
                    isWithinInterval(parsed, {
                      start: currentMonthStart,
                      end: currentMonthEnd,
                    })
                  );
                }).length > 0 && (
                  <div className="mb-2">
                    <div className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      {t("gold_purchased")}
                    </div>
                    <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                      {investments
                        .filter((inv) => {
                          if (inv.type !== "Gold" || !inv.purchaseDate)
                            return false;
                          const parsed = parseDateString(inv.purchaseDate);
                          return (
                            parsed &&
                            isWithinInterval(parsed, {
                              start: currentMonthStart,
                              end: currentMonthEnd,
                            })
                          );
                        })
                        .map((gold) => (
                          <li
                            key={gold.id}
                            className="flex justify-between items-center text-sm"
                          >
                            <span>{gold.name || t("unnamed_gold")}</span>
                            <span>
                              {formatNumberWithSuffix(gold.amountInvested || 0)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>

            {realEstateInstallments.installments.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-blue-700 pt-2 border-t border-blue-100 dark:border-blue-900 mt-2 font-bold">
                  <span>{t("total_real_estate")}</span>
                  <span>
                    {formatNumberWithSuffix(realEstateInstallments.total)}
                  </span>
                </div>
                <ul className="space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                  {realEstateInstallments.installments.map((installment) => (
                    <li
                      key={`invest-${installment.propertyId}-${installment.number}`}
                      className="flex justify-between items-center"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Landmark className="h-4 w-4 text-blue-500" />
                        <span className="whitespace-pre-line">
                          {installment.propertyName} (#{installment.number})
                        </span>
                      </span>
                      <span className="font-medium text-end">
                        {formatNumberWithSuffix(installment.amount || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <hr className="my-2" />
            <div className="flex justify-between font-bold">
              <span>{t("total_investments")}</span>
              <span>{formatNumberWithSuffix(totalInvestmentsOnly)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* End Details Section */}
    </div>
  );
}
