"use client";

import React from "react";
import Link from "next/link";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useInvestments } from "@/hooks/use-investments";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, TrendingDown } from "lucide-react";
import {
  cn,
  formatCurrencyWithCommas,
  formatDateDisplay,
  formatMonthYear,
  formatNumberWithSuffix,
} from "@/lib/utils";
import type { ExpenseRecord } from "@/lib/types";
// Removed FinancialSettingsForm import as its functionality is moved

export default function ExpensesPage() {
  const { t } = useLanguage();
  // UI state for filters
  const [showAll, setShowAll] = React.useState(false); // false = this month, true = all
  const [showEnded, setShowEnded] = React.useState(false); // false = hide ended, true = show ended

  const { expenseRecords, isLoading, deleteExpenseRecord } = useInvestments(); // Removed monthlySettings
  const { language } = useLanguage();

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  // Filtering logic for expenses
  const filteredExpenses = React.useMemo(() => {
    const recordsToFilter = expenseRecords || [];
    const currentMonth = currentMonthStart.getMonth();
    const currentYear = currentMonthStart.getFullYear();
    const now = new Date();

    // Helper: is record ended?
    function isEnded(record: ExpenseRecord) {
      if (record.isInstallment && record.numberOfInstallments && record.date) {
        const startDate = new Date(record.date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + record.numberOfInstallments - 1);
        return now > endDate;
      }
      return false;
    }

    // Helper: is record required this month?
    function isRequiredThisMonth(record: ExpenseRecord) {
      if (
        record.category === t("credit_card") &&
        record.isInstallment &&
        record.numberOfInstallments &&
        record.date
      ) {
        const startDate = new Date(record.date);
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const installmentMonths = record.numberOfInstallments;
        const monthsSinceStart =
          (currentYear - startYear) * 12 + (currentMonth - startMonth);
        return monthsSinceStart >= 0 && monthsSinceStart < installmentMonths;
      } else if (record.date) {
        return isWithinInterval(new Date(record.date), {
          start: currentMonthStart,
          end: currentMonthEnd,
        });
      }
      return false;
    }

    let filtered = recordsToFilter.filter((record) => {
      // Hide ended if not showing ended
      if (!showEnded && isEnded(record)) return false;
      // If not showAll, only show required this month
      if (!showAll && !isRequiredThisMonth(record)) return false;
      return true;
    });

    // For display, augment records as before
    return filtered
      .flatMap((record) => {
        if (
          record.category === t("credit_card") &&
          record.isInstallment &&
          record.numberOfInstallments &&
          record.date
        ) {
          const startDate = new Date(record.date);
          const startMonth = startDate.getMonth();
          const startYear = startDate.getFullYear();
          const installmentMonths = record.numberOfInstallments;
          const monthsSinceStart =
            (currentYear - startYear) * 12 + (currentMonth - startMonth);
          if (monthsSinceStart >= 0 && monthsSinceStart < installmentMonths) {
            return [
              {
                ...record,
                _originalAmount: record.amount,
                _requiredAmount: record.amount / record.numberOfInstallments,
                installmentMonthIndex: monthsSinceStart + 1,
                numberOfInstallments: installmentMonths,
                installmentStartDate: startDate,
                _isRequiredThisMonth: true,
                _isEnded: isEnded(record),
              },
            ];
          } else {
            return [
              {
                ...record,
                _isRequiredThisMonth: false,
                _isEnded: isEnded(record),
              },
            ];
          }
        } else if (
          record.date &&
          isWithinInterval(new Date(record.date), {
            start: currentMonthStart,
            end: currentMonthEnd,
          })
        ) {
          return [
            {
              ...record,
              _originalAmount: record.amount,
              _requiredAmount: record.amount,
              _isRequiredThisMonth: true,
              _isEnded: isEnded(record),
            },
          ];
        } else {
          return [
            {
              ...record,
              _isRequiredThisMonth: false,
              _isEnded: isEnded(record),
            },
          ];
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenseRecords, currentMonthStart, currentMonthEnd, showAll, showEnded]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        {/* Removed skeleton for Monthly Fixed Estimates card */}
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("expenses_management")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "log_and_manage_all_your_itemized_expenses_including_credit_card_payments_and_utility_bills"
          )}
        </p>
      </div>
      <Separator />

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={showAll}
            onCheckedChange={setShowAll}
            id="show-all-switch"
          />

          <span>{t("show_all_expenses")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={showEnded}
            onCheckedChange={setShowEnded}
            id="show-ended-switch"
          />

          <span>{t("show_endedold_expenses")}</span>
        </label>
      </div>

      {/* Removed the Card for Monthly Fixed Estimates that rendered FinancialSettingsForm */}

      {filteredExpenses.length > 0 ? (
        <>
          {/* Summary Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingDown className="mr-2 h-4 w-4 text-primary" />
                {showAll ? t("total_spent_all") : t("total_spent_this_month")}
              </CardTitle>
              <CardDescription>
                {showAll
                  ? t(
                      "view_and_manage_all_your_recorded_expenses_including_installments_and_onetime_payments"
                    )
                  : `${t("see_and_manage_all_expenses_required_for")} ${formatMonthYear(new Date())}, ${t("including_current_installments_and_one_time_payments")}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-foreground">
                {formatCurrencyWithCommas(
                  filteredExpenses.reduce(
                    (sum, r) => sum + (r._requiredAmount || 0),
                    0
                  )
                )}
              </span>
            </CardContent>
          </Card>

          <div className="grid gap-4 mt-8">
            {filteredExpenses.map((record) => (
              <Card
                key={record.id + (record.installmentMonthIndex || "")}
                className={
                  record._isRequiredThisMonth ? "border-yellow-300" : ""
                }
              >
                <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4">
                  {/* Main Info Column */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Title, Date, Installment Badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold truncate text-base">
                        {record.description || record.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateDisplay(record.date)}
                      </span>
                      {record.isInstallment &&
                        record.numberOfInstallments &&
                        record.category === t("credit_card") && (
                          <div className="flex items-center gap-2">
                            <span className="bg-muted px-2 py-0.5 rounded-full text-xs">
                              Installment {record.installmentMonthIndex}/
                              {record.numberOfInstallments}
                            </span>
                            {record._isRequiredThisMonth && (
                              <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-900 text-xs font-semibold">
                                {t("required_this_month")}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                    {/* Amount and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-2xl font-bold">
                        {formatNumberWithSuffix(record._requiredAmount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/expenses/edit/${record.id}`}
                          passHref
                          legacyBehavior
                        >
                          <Button variant="ghost" size="icon" aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">
                                Remove {record.description || record.category}
                              </span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("are_you_sure")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t(
                                  "this_action_will_permanently_delete_this_expense_record_this_cannot_be_undone"
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  try {
                                    await deleteExpenseRecord(record.id);
                                  } catch (e) {
                                    // Optionally show toast or ignore
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {/* Installment Details */}
                    {record.isInstallment &&
                      record.numberOfInstallments &&
                      record.category === t("credit_card") && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("installment_egp")}{" "}
                          {formatNumberWithSuffix(
                            record.amount / record.numberOfInstallments
                          )}{" "}
                          x {record.numberOfInstallments} months
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="mr-2 h-4 w-4 text-primary" />
              {t("no_itemized_expenses_recorded_this_month")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_itemized_expenses_for")}{" "}
              {formatMonthYear(new Date())}
              {t("yet")}
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/expenses/add" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new expense record"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
