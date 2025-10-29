import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, TrendingDown, Briefcase, Wallet } from "lucide-react";
import { formatNumberForMobile } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { CashFlowMonthlySummary } from "@/lib/financial-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CashFlowSummaryCardsProps {
  cashFlowSummary: CashFlowMonthlySummary;
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
              {formatNumberForMobile(isMobile, cashFlowSummary.incomeTillNow)}
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
              {cashFlowSummary.salary > 0 && (
                <div className="flex justify-between">
                  <span>{t("monthly_salary_fixed")}</span>
                  <span>
                    {formatNumberForMobile(isMobile, cashFlowSummary.salary)}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalFixedIncome > 0 && (
                <div className="flex justify-between">
                  <span>{t("other_fixed_income")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalFixedIncome,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalManualIncome > 0 && (
                <div className="flex justify-between">
                  <span>{t("other_logged_income_incl_sales_profit")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalManualIncome,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalProjectedDebtInterest > 0 && (
                <div className="flex justify-between">
                  <span>{t("projected_debt_interest")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalProjectedDebtInterest,
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
              {formatNumberForMobile(isMobile, cashFlowSummary.totalExpenses)}
            </p>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
              {cashFlowSummary.totalItemizedExpenses > 0 && (
                <div className="flex justify-between">
                  <span>{t("itemized_logged_expenses")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalItemizedExpenses,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.zakat > 0 && (
                <div className="flex justify-between">
                  <span>{t("zakat_fixed")}</span>
                  <span>
                    {formatNumberForMobile(isMobile, cashFlowSummary.zakat)}
                  </span>
                </div>
              )}
              {cashFlowSummary.charity > 0 && (
                <div className="flex justify-between">
                  <span>{t("charity_fixed")}</span>
                  <span>
                    {formatNumberForMobile(isMobile, cashFlowSummary.charity)}
                  </span>
                </div>
              )}
              {cashFlowSummary.livingExpenses > 0 && (
                <div className="flex justify-between">
                  <span>{t("living_expenses")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.livingExpenses,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalFixedExpenses > 0 && (
                <div className="flex justify-between">
                  <span>{t("other_fixed_expenses")}</span>
                  <span>
                    {formatNumberForMobile(
                      isMobile,
                      cashFlowSummary.totalFixedExpenses,
                    )}
                  </span>
                </div>
              )}
              {cashFlowSummary.totalRealEstateInstallments > 0 && (
                <p>
                  {`${t("real_estate_installments")}: ${formatNumberForMobile(
                    isMobile,
                    cashFlowSummary.totalRealEstateInstallments,
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
                  cashFlowSummary.totalSecuritiesInvestments,
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
                  cashFlowSummary.totalRealEstateInstallments,
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
                  cashFlowSummary.totalDebtInvestments,
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
                  cashFlowSummary.totalGoldInvestments,
                )}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-blue-100 dark:border-blue-800">
              <div className="flex justify-between items-center font-semibold text-sm">
                <span>{t("total")}</span>
                <span>
                  {formatNumberForMobile(
                    isMobile,
                    cashFlowSummary.totalInvestments,
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
                  cashFlowSummary.totalExpenses -
                  cashFlowSummary.totalInvestments,
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
