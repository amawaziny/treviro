"use client";
import { useLanguage } from "@/contexts/language-context";

import React, { useMemo } from "react";
import { useInvestments } from "@/contexts/investment-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CashFlowSummaryCards } from "@/components/cash-flow/CashFlowSummaryCards";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Landmark,
  FileText,
  Wallet,
  Coins,
} from "lucide-react";
import {
  formatMonthYear,
  formatDateDisplay,
  formatNumberForMobile,
} from "@/lib/utils";
import { startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { useTransactions } from "@/hooks/use-transactions";
import useFinancialRecords from "@/hooks/use-financial-records";
import { useCashflow } from "@/hooks/use-cashflow";

export default function CashFlowPage() {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const month = useMemo(() => startOfDay(new Date()), []);
  const startMonth = useMemo(() => startOfMonth(month), [month]);
  const endMonth = useMemo(() => endOfMonth(month), [month]);
  const monthYear = useMemo(() => formatMonthYear(month, language), [month, language]);

  const { investments, isLoading: isLoadingInvestments } = useInvestments();

  const {
    expensesManualCreditCard,
    fixedEstimates,
    isLoading: isLoadingFinancialRecords,
  } = useFinancialRecords(startMonth, endMonth);

  const { transactions, isLoading: isLoadingTransactions } = useTransactions(
    startMonth,
    endMonth,
  );

  const isLoading =
    isLoadingFinancialRecords || isLoadingTransactions || isLoadingInvestments;

  const {
    totalIncome,
    totalProjectedDebtMonthlyInterest,
    totalExpenses,
    incomeManualTrxs,
    expensesManualOtherTrxs,
    dividendTrxs,
    incomesFixed,
    expensesFixed,
    incomeTillNow,
    totalFixedIncome,
    totalFixedExpenses,
    totalRealEstateInstallments,
    totalStockInvestments,
    totalDebtInvestments,
    totalGoldInvestments,
    totalInvestments,
    totalExpensesManualCreditCard,
    stockInvestmentTrxs,
    debtInvestmentTrxs,
    goldInvestmentTrxs,
    realEstateInvestments,
    netCashFlow,
  } = useCashflow({
    expensesManualCreditCard,
    investments,
    fixedEstimates,
    transactions,
    startMonth,
    endMonth,
  });

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

      <Separator />

      <CashFlowSummaryCards
        totalIncome={totalIncome}
        totalFixedIncome={totalFixedIncome}
        totalProjectedDebtMonthlyInterest={totalProjectedDebtMonthlyInterest}
        incomeTillNow={incomeTillNow}
        totalExpenses={totalExpenses}
        totalFixedExpenses={totalFixedExpenses}
        totalRealEstateInstallments={totalRealEstateInstallments}
        totalStockInvestments={totalStockInvestments}
        totalDebtInvestments={totalDebtInvestments}
        totalGoldInvestments={totalGoldInvestments}
        totalInvestments={totalInvestments}
        totalExpensesManualCreditCard={totalExpensesManualCreditCard}
        netCashFlow={netCashFlow}
      />

      {/* Details Section: 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6">
        {/* Income Details */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>{t("income_details")}</CardTitle>
            <CardDescription>
              {`${t("breakdown_of_income_for")} ${formatMonthYear(new Date(), language)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomesFixed.map((income, idx) => (
              <div key={`fixed-income-${idx}`} className="flex flex-col">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{income.type}</span>
                  </div>
                  <span className="text-sm">
                    {formatNumberForMobile(isMobile, income.amount)}
                  </span>
                </div>
              </div>
            ))}
            {incomeManualTrxs.map((income, idx) => (
              <div
                key={`manual-income-${idx}`}
                className="flex justify-between text-xs"
              >
                <span>
                  {income.metadata.sourceSubType
                    ? income.metadata.sourceSubType
                    : formatDateDisplay(income.date)}
                </span>
                <span>{formatNumberForMobile(isMobile, income.amount)}</span>
              </div>
            ))}
            {dividendTrxs.map((tx, idx) => (
              <div
                key={`dividend-income-${idx}`}
                className="flex justify-between text-xs"
              >
                <span>
                  {`${t("dividend")} ${tx.securityId ? `(${tx.securityId})` : ""}`}
                </span>
                <span>{formatNumberForMobile(isMobile, tx.amount)}</span>
              </div>
            ))}
            {totalProjectedDebtMonthlyInterest > 0 && (
              <div className="flex justify-between text-xs">
                <span>
                  <FileText className="inline me-2 h-4 w-4 text-green-600" />
                  {t("projected_debt_interest")}
                </span>
                <span>
                  {formatNumberForMobile(
                    isMobile,
                    totalProjectedDebtMonthlyInterest,
                  )}
                </span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-sm">
              <span>{t("total_projected_income")}</span>
              <span>{formatNumberForMobile(isMobile, totalIncome)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Expense Details */}
        <Card className="flex flex-col h-full min-h-[220px]">
          <CardHeader>
            <CardTitle>{t("expense_details")}</CardTitle>
            <CardDescription>
              {`${t("breakdown_of_expenses_for")} ${monthYear}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {expensesFixed.map((expense, idx) => (
              <div key={`fixed-expense-${idx}`} className="flex flex-col">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{expense.type}</span>
                  </div>
                  <span className="text-sm">
                    {formatNumberForMobile(isMobile, expense.amount)}
                  </span>
                </div>
              </div>
            ))}
            {expensesManualOtherTrxs.map((expense, idx) => (
              <div
                key={`manual-expense-${idx}`}
                className="flex justify-between text-xs"
              >
                <span>
                  {expense.metadata.description
                    ? expense.metadata.description
                    : formatDateDisplay(expense.date)}
                </span>
                <span>{formatNumberForMobile(isMobile, expense.amount)}</span>
              </div>
            ))}
            {expensesManualCreditCard.map((expense, idx) => (
              <div
                key={`credit-card-expense-${idx}`}
                className="flex justify-between text-xs"
              >
                <span>
                  {expense.description
                    ? expense.description
                    : formatDateDisplay(expense.date)}
                </span>
                <span>{formatNumberForMobile(isMobile, expense.amount)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-sm">
              <span>{t("total_projected_expenses")}</span>
              <span>{formatNumberForMobile(isMobile, totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Investments Details */}
        <Card className="flex flex-col h-full min-h-[220px]">
          <CardHeader>
            <CardTitle>{t("investments_details")}</CardTitle>
            <CardDescription>
              {`${t("new_investments_made_in")} ${monthYear}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              {/* Total Stock Investment */}
              <div className="flex justify-between items-center text-blue-600 font-semibold text-xs mb-2">
                <span className="flex items-center gap-2">
                  {t("total_stock")}
                </span>
                <span>
                  {formatNumberForMobile(isMobile, totalStockInvestments)}
                </span>
              </div>
              {/* Securities */}
              {stockInvestmentTrxs.length > 0 && (
                <div className="mb-2">
                  <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2"></div>
                  <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                    {stockInvestmentTrxs.map((inv) => {
                      return (
                        <li
                          key={inv.id}
                          className="flex justify-between items-center text-xs"
                        >
                          <span>
                            {inv.securityId || inv.id || t("unnamed_stock")}
                          </span>
                          <span>
                            {formatNumberForMobile(isMobile, inv.amount || 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {/* Debt Instruments */}
              {debtInvestmentTrxs.length > 0 && (
                <div className="mb-2">
                  <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    {t("debt_instruments_purchased")}
                  </div>
                  <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                    {debtInvestmentTrxs.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex justify-between items-center text-xs"
                      >
                        <span>{inv.description || t("unnamed_debt")}</span>
                        <span>
                          {formatNumberForMobile(isMobile, inv.amount || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Gold */}
              {goldInvestmentTrxs.length > 0 && (
                <div className="mb-2">
                  <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    {t("gold_purchased")}
                  </div>
                  <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                    {goldInvestmentTrxs.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex justify-between items-center text-xs"
                      >
                        <span>{inv.description || t("unnamed_gold")}</span>
                        <span>
                          {formatNumberForMobile(isMobile, inv.amount || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {realEstateInvestments.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-blue-700 pt-2 border-t border-blue-100 dark:border-blue-900 mt-2 font-semibold text-sm">
                  <span>{t("total_real_estate")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      totalRealEstateInstallments,
                    )}
                  </span>
                </div>
                <ul className="space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                  {realEstateInvestments.map((inv) => (
                    <li
                      key={`invest-${inv.id}`}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="flex items-center gap-2 text-xs">
                        <Landmark className="h-4 w-4 text-blue-500" />
                        <span className="whitespace-pre-line">{inv.name}</span>
                      </span>
                      <span className="text-end text-xs">
                        {formatNumberForMobile(
                          isMobile,
                          inv.installmentAmount || 0,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-sm">
              <span>{t("total_investments")}</span>
              <span>{formatNumberForMobile(isMobile, totalInvestments)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* End Details Section */}
    </div>
  );
}
