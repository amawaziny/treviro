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
import { Button } from "@/components/ui/button";
import { CashFlowSummaryCards } from "@/components/cash-flow/CashFlowSummaryCards";
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
  formatMonthYear,
  formatDateDisplay,
  parseDateString,
  formatNumberForMobile,
} from "@/lib/utils";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  IncomeRecord,
  Transaction,
  RealEstateInvestment,
  SecurityInvestment,
  Installment,
} from "@/lib/types";
import { calculateMonthlyCashFlowSummary } from "@/lib/financial-utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CashFlowPage() {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
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
          inv.type === "Real Estate" &&
          "installments" in inv &&
          inv.installments !== undefined,
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

  const cashFlowSummary = useMemo(() => {
    return calculateMonthlyCashFlowSummary({
      incomeRecords: incomeRecords || [],
      expenseRecords: expenseRecords || [],
      investments: investments || [],
      fixedEstimates: fixedEstimates || [],
      transactions: transactions || [],
    });
  }, [incomeRecords, expenseRecords, investments, fixedEstimates]);

  const {
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    zakatFixedMonthly,
    charityFixedMonthly,
    livingExpensesMonthly,
    otherFixedExpensesMonthly,
    totalItemizedExpensesThisMonth,
    totalStockInvestmentThisMonth,
    totalInvestmentsThisMonth,
    totalIncome,
  } = cashFlowSummary;

  const totalExpensesOnly =
    zakatFixedMonthly +
    charityFixedMonthly +
    livingExpensesMonthly +
    otherFixedExpensesMonthly +
    totalItemizedExpensesThisMonth;

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
      <CashFlowSummaryCards cashFlowSummary={cashFlowSummary} />

      {/* Details Section: 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6">
        {/* Income Details */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>{t("income_details")}</CardTitle>
            <CardDescription>
              {`${t("breakdown_of_income_for")} ${formatMonthYear(currentMonthStart, language)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Salary Income */}
            {cashFlowSummary.monthlySalary > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    {t("monthly_salary_fixed")}
                  </span>
                </div>
                <span className="text-sm">
                  {formatNumberForMobile(
                    isMobile,
                    cashFlowSummary.monthlySalary,
                  )}
                </span>
              </div>
            )}

            {/* Other Fixed Incomes */}
            {fixedEstimates
              .filter(
                (fe) =>
                  !fe.isExpense &&
                  fe.period === "Monthly" &&
                  fe.type !== "Salary"
              )
              .map((income, idx) => (
                <div key={`fixed-income-${idx}`} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">
                        {income.name || t(income.type)}
                      </span>
                    </div>
                    <span className="text-sm">
                      {formatNumberForMobile(isMobile, income.amount)}
                    </span>
                  </div>
                  {income.type && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {t(income.type)}
                    </p>
                  )}
                </div>
              ))}
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
                    {`${formatDateDisplay(income.date)}
                    ${income.description ? `- ${income.description}` : ""}`}
                  </span>
                  <span>{formatNumberForMobile(isMobile, income.amount)}</span>
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
                      {`${formatDateDisplay(tx.date)} ${t("dividend")} ${tx.tickerSymbol ? `(${tx.tickerSymbol})` : ""}`}
                    </span>
                    <span>
                      {formatNumberForMobile(
                        isMobile,
                        (tx as any).amount ?? (tx as any).totalAmount ?? 0,
                      )}
                    </span>
                  </div>
                ))}
            {totalProjectedCertificateInterestThisMonth > 0 && (
              <div className="flex justify-between text-xs">
                <span>
                  <FileText className="inline me-2 h-4 w-4 text-green-600" />
                  {t("projected_debt_interest")}
                </span>
                <span>
                  {formatNumberForMobile(
                    isMobile,
                    totalProjectedCertificateInterestThisMonth,
                  )}
                </span>
              </div>
            )}
            <hr className="my-2" />
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
              {`${t("breakdown_of_expenses_for")} ${formatMonthYear(currentMonthStart, language)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {zakatFixedMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 text-xs">
                <span className="flex items-center gap-1">
                  <Gift className="h-4 w-4" />
                  {t("zakat_fixed")}
                </span>
                <span>
                  {formatNumberForMobile(isMobile, zakatFixedMonthly)}
                </span>
              </div>
            )}
            {charityFixedMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 text-xs">
                <span className="flex items-center gap-1">
                  <HandHeart className="h-4 w-4" />
                  {t("charity_fixed")}
                </span>
                <span>
                  {formatNumberForMobile(isMobile, charityFixedMonthly)}
                </span>
              </div>
            )}
            {livingExpensesMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 text-xs">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {t("living_expenses")}
                </span>
                <span>
                  {formatNumberForMobile(isMobile, livingExpensesMonthly)}
                </span>
              </div>
            )}
            {otherFixedExpensesMonthly > 0 && (
              <div className="flex justify-between items-center text-red-500 text-xs">
                <span className="flex items-center gap-1">
                  {t("other_fixed_expenses")}
                </span>
                <span>
                  {formatNumberForMobile(isMobile, otherFixedExpensesMonthly)}
                </span>
              </div>
            )}
            {totalItemizedExpensesThisMonth > 0 && (
              <div className="flex justify-between items-center text-red-500 text-xs">
                {t("itemized_logged_expenses")}{" "}
                <span>
                  {formatNumberForMobile(
                    isMobile,
                    totalItemizedExpensesThisMonth,
                  )}
                </span>
              </div>
            )}

            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-sm">
              <span>{t("total_projected_expenses")}</span>
              <span>{formatNumberForMobile(isMobile, totalExpensesOnly)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Investments Details */}
        <Card className="flex flex-col h-full min-h-[220px]">
          <CardHeader>
            <CardTitle>{t("investments_details")}</CardTitle>
            <CardDescription>
              {`${t("new_investments_made_in")} ${formatMonthYear(currentMonthStart, language)}`}
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
                  {formatNumberForMobile(
                    isMobile,
                    totalStockInvestmentThisMonth,
                  )}
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
                    <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2"></div>
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
                          const stock = investment as SecurityInvestment;
                          return (
                            <li
                              key={stock.id}
                              className="flex justify-between items-center text-xs"
                            >
                              <span>
                                {stock.tickerSymbol ||
                                  stock.id ||
                                  t("unnamed_stock")}
                              </span>
                              <span>
                                {formatNumberForMobile(
                                  isMobile,
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
                  if (inv.type !== "Debt Instruments" || !inv.purchaseDate)
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
                    <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {t("debt_instruments_purchased")}
                    </div>
                    <ul className="space-y-1 pl-4 border-l-2 border-blue-100 dark:border-blue-700">
                      {investments
                        .filter((inv) => {
                          if (
                            inv.type !== "Debt Instruments" ||
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
                            className="flex justify-between items-center text-xs"
                          >
                            <span>{debt.name || t("unnamed_debt")}</span>
                            <span>
                              {formatNumberForMobile(
                                isMobile,
                                debt.amountInvested || 0,
                              )}
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
                    <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
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
                            className="flex justify-between items-center text-xs"
                          >
                            <span>{gold.name || t("unnamed_gold")}</span>
                            <span>
                              {formatNumberForMobile(
                                isMobile,
                                gold.amountInvested || 0,
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>

            {realEstateInstallments.installments.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-blue-700 pt-2 border-t border-blue-100 dark:border-blue-900 mt-2 font-semibold text-sm">
                  <span>{t("total_real_estate")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      realEstateInstallments.total,
                    )}
                  </span>
                </div>
                <ul className="space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                  {realEstateInstallments.installments.map((installment) => (
                    <li
                      key={`invest-${installment.propertyId}-${installment.number}`}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="flex items-center gap-2 text-xs">
                        <Landmark className="h-4 w-4 text-blue-500" />
                        <span className="whitespace-pre-line">
                          {installment.propertyName} (#{installment.number})
                        </span>
                      </span>
                      <span className="text-end text-xs">
                        {formatNumberForMobile(
                          isMobile,
                          installment.amount || 0,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-sm">
              <span>{t("total_investments")}</span>
              <span>
                {formatNumberForMobile(isMobile, totalInvestmentsThisMonth)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* End Details Section */}
    </div>
  );
}
