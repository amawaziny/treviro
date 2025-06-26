import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, TrendingDown, Briefcase, Wallet } from "lucide-react";
import { formatNumberForMobile } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { CashFlowSummaryResult } from "@/lib/financial-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CashFlowSummaryCardsProps {
  cashFlowSummary: CashFlowSummaryResult;
}

export function CashFlowSummaryCards({
  cashFlowSummary,
}: CashFlowSummaryCardsProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <div className="grid gap-4">
      {/* Income Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex flex-col flex-1"
          data-testid="current-income-card"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("total_current_income_this_month")}
            </CardTitle>
            <Coins
              className="h-4 w-4 text-green-600 dark:text-green-400"
              data-testid="current-income-icon"
            />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-green-700 dark:text-green-300">
              {formatNumberForMobile(
                isMobile,
                cashFlowSummary.currentMonthIncome,
              )}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {t("income_paid_out_by_today")}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex flex-col flex-1"
          data-testid="total-income-card"
        >
          <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("total_income_this_month")}
            </CardTitle>
            <Coins
              className="h-4 w-4 text-green-600 dark:text-green-400"
              data-testid="total-income-icon"
            />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-green-700 dark:text-green-300">
              {formatNumberForMobile(isMobile, cashFlowSummary.totalIncome)}
            </p>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-0.5">
              {cashFlowSummary.monthlySalary > 0 && (
                <div className="flex justify-between">
                  <span>{t("monthly_salary_fixed")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.monthlySalary,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.otherFixedIncomeMonthly > 0 && (
                <div className="flex justify-between">
                  <span>{t("other_fixed_income")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.otherFixedIncomeMonthly,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalManualIncomeThisMonth > 0 && (
                <div className="flex justify-between">
                  <span>{t("other_logged_income_incl_sales_profit")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalManualIncomeThisMonth,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalProjectedCertificateInterestThisMonth >
                0 && (
                <div className="flex justify-between">
                  <span>{t("projected_debt_interest")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalProjectedCertificateInterestThisMonth,
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Expenses */}
      <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
        <Card
          className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 flex-col h-[220px] flex-1"
          data-testid="total-expenses-card"
        >
          <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              {t("total_expenses_this_month")}
            </CardTitle>
            <TrendingDown
              className="h-4 w-4 text-red-600 dark:text-red-400"
              data-testid="expenses-icon"
            />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-red-700 dark:text-red-300">
              {formatNumberForMobile(
                isMobile,
                cashFlowSummary.totalExpensesOnly,
              )}
            </p>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
              {cashFlowSummary.totalItemizedExpensesThisMonth > 0 && (
                <div className="flex justify-between">
                  <span>{t("itemized_logged_expenses")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalItemizedExpensesThisMonth,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.zakatFixedMonthly > 0 && (
                <div className="flex justify-between">
                  <span>{t("zakat_fixed")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.zakatFixedMonthly,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.charityFixedMonthly > 0 && (
                <div className="flex justify-between">
                  <span>{t("charity_fixed")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.charityFixedMonthly,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.livingExpensesMonthly > 0 && (
                <div className="flex justify-between">
                  <span>{t("living_expenses")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.livingExpensesMonthly,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.otherFixedExpensesMonthly > 0 && (
                <div className="flex justify-between">
                  <span>{t("other_fixed_expenses")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.otherFixedExpensesMonthly,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.realEstateInstallmentsMonthly > 0 && (
                <p>
                  {`${t("real_estate_installments")}: ${formatNumberForMobile(
                    isMobile,
                    cashFlowSummary.realEstateInstallmentsMonthly,
                  )}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 flex-col h-[220px] flex-1"
          data-testid="total-investments-card"
        >
          <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t("total_investments_this_month")}
            </CardTitle>
            <Briefcase
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              data-testid="investments-icon"
            />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {t("stocks")}
              </span>
              <span className="text-sm">
                {formatNumberForMobile(
                  isMobile,
                  cashFlowSummary.totalStockInvestmentThisMonth,
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {t("real_estate")}
              </span>
              <span className="text-sm">
                {formatNumberForMobile(
                  isMobile,
                  cashFlowSummary.realEstateInstallmentsMonthly,
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {t("debts")}
              </span>
              <span className="text-sm">
                {formatNumberForMobile(
                  isMobile,
                  cashFlowSummary.totalDebtInvestmentThisMonth,
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {t("gold")}
              </span>
              <span className="text-sm">
                {formatNumberForMobile(
                  isMobile,
                  cashFlowSummary.totalGoldInvestmentThisMonth,
                )}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-blue-100 dark:border-blue-800">
              <div className="flex justify-between items-center font-semibold text-sm">
                <span>{t("total")}</span>
                <span>
                  {formatNumberForMobile(
                    isMobile,
                    cashFlowSummary.totalInvestmentsThisMonth,
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 flex-col h-[220px] flex-1"
          data-testid="remaining-cash-card"
        >
          <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("remaining_cash_after_expenses_investments")}
            </CardTitle>
            <Wallet
              className="h-4 w-4 text-gray-600 dark:text-gray-400"
              data-testid="wallet-icon"
            />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
              {formatNumberForMobile(
                isMobile,
                cashFlowSummary.totalIncome -
                  cashFlowSummary.totalExpensesOnly -
                  cashFlowSummary.totalInvestmentsThisMonth,
              )}
            </p>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t("remaining_total_income_total_expenses_total_investments")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
