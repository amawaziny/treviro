"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  CreditCard,
  Pencil,
  Trash2,
  DollarSign,
  Loader2,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, TrendingDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cn,
  formatDateDisplay,
  formatDateISO,
  formatMonthYear,
  formatNumberForMobile,
} from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import useFinancialRecords from "@/hooks/use-financial-records";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ExpenseRecord } from "@/lib/types";

export default function ExpensesPage() {
  const { t, language, dir } = useLanguage();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [showPaySheet, setShowPaySheet] = useState(false);
  const [payDate, setPayDate] = useState(new Date());
  const [isPaying, setIsPaying] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(
    null,
  );

  const month = useMemo(() => startOfDay(new Date()), []);
  const startMonth = useMemo(() => startOfMonth(month), [month]);
  const endMonth = useMemo(() => endOfMonth(month), [month]);
  const monthYear = useMemo(
    () => formatMonthYear(month, language),
    [month, language],
  );

  const { expensesManual, isLoading, deleteExpense, payCreditCardExpense } =
    useFinancialRecords(startMonth, endMonth);

  const payInstallmentSubmit = async () => {
    if (!selectedExpense) return;
    try {
      setIsPaying(true);
      await payCreditCardExpense(selectedExpense, payDate);
      setShowPaySheet(false);
      toast({
        title: t("installment_paid"),
        description: t("the_installment_has_been_successfully_paid"),
        variant: "default",
      });
    } catch (e: any) {
      toast({
        title: t("failed_to_pay_installment"),
        description: e.message || t("failed_to_pay_installment"),
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

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
    <div
      className="space-y-8 relative min-h-[calc(100vh-10rem)]"
      data-testid="expenses-page"
    >
      <div>
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
          data-testid="page-title"
        >
          {t("expenses_management")}
        </h1>
        <p
          className="text-muted-foreground text-sm"
          data-testid="page-subtitle"
        >
          {t(
            "log_and_manage_all_your_itemized_expenses_including_credit_card_payments_and_utility_bills",
          )}
        </p>
      </div>
      <Separator />

      {expensesManual.length > 0 ? (
        <>
          {/* Summary Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingDown className="me-2 h-4 w-4 text-primary" />
                {t("total_spent_this_month")}
              </CardTitle>
              <CardDescription>
                {`${t("see_and_manage_all_expenses_required_for")} ${monthYear}, ${t("including_current_installments_and_one_time_payments")}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-bold text-foreground">
                {formatNumberForMobile(
                  isMobile,
                  expensesManual.reduce(
                    (sum, r) => sum + (r._requiredAmount || r.amount),
                    0,
                  ),
                )}
              </span>
            </CardContent>
          </Card>

          <div className="grid gap-4 mt-8" data-testid="expenses-list">
            {expensesManual.map((record) => (
              <Card
                key={record.id + (record.installmentMonthIndex || "")}
                className={cn(
                  record.isClosed ? "opacity-50" : "",
                  "last:mb-24",
                )}
                data-testid={`expense-card-${record.id}`}
              >
                <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4">
                  {/* Main Info Column */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Title, Date, Installment Badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {record.type === "Credit Card" ? (
                        <CreditCard className="h-4 w-4 me-1" />
                      ) : (
                        <Banknote className="h-4 w-4 me-1" />
                      )}
                      <span className="font-semibold truncate text-base">
                        {record.description || t(record.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateDisplay(record.date)}
                      </span>
                      {record.isInstallment && (
                        <div className="flex items-center gap-2">
                          <span className="bg-muted px-2 py-0.5 rounded-full text-xs">
                            {`${t("installment")}: ${record.lastPaidInstallmentIndex! + 1} ${t("of")} ${record.numberOfInstallments}`}
                          </span>
                          {record.lastPaidInstallmentIndex! <
                            record.installmentMonthIndex! && (
                            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-900 text-xs font-semibold">
                              {t("required_this_month")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Amount and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-xl font-bold">
                        {formatNumberForMobile(
                          isMobile,
                          record.isInstallment
                            ? record._requiredAmount
                            : record.amount,
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {record.isInstallment && (
                          <Button
                            title={t("pay_installment")}
                            variant="ghost"
                            size="icon"
                            aria-label="Pay"
                            onClick={() => {
                              setSelectedExpense(record);
                              setShowPaySheet(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
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
                              data-testid={`delete-expense-${record.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">
                                {`${t("Remove")} ${record.description || t(record.type)}`}
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
                                  "this_action_will_permanently_delete_this_expense_record_this_cannot_be_undone",
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("Cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  try {
                                    await deleteExpense(record.id);
                                  } catch (e: any) {
                                    toast({
                                      title: t("failed_to_delete_expense"),
                                      description: t(
                                        "could_not_delete_the_expense_record",
                                      ),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                {t("Delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
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
              <TrendingDown className="me-2 h-4 w-4 text-primary" />
              {t("no_itemized_expenses_recorded_this_month")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              data-testid="no-expenses-message"
              className="text-muted-foreground py-4 text-center"
            >
              {`${t("you_havent_added_any_itemized_expenses_for")} ${monthYear} ${t("yet")}`}
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
          data-testid="add-expense-button"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>

      <Sheet open={showPaySheet} onOpenChange={setShowPaySheet}>
        <SheetContent dir={dir} side="bottom">
          <SheetHeader>
            <SheetTitle>{t("pay_installment")}</SheetTitle>
            <SheetDescription>
              {t("enter_the_payment_date_for_this_installment")}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="payDate">{t("pay_date")}</Label>
            <Input
              id="payDate"
              type="date"
              value={formatDateISO(payDate)}
              onChange={(e) => {
                const date = e.target.value
                  ? new Date(e.target.value)
                  : new Date();
                setPayDate(date);
              }}
            />
          </div>
          <SheetFooter>
            <div className="flex flex-row-reverse gap-2">
              <Button
                variant="outline"
                disabled={isPaying}
                onClick={() => setShowPaySheet(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                disabled={isPaying}
                onClick={() => payInstallmentSubmit()}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                    {t("paying")}
                  </>
                ) : (
                  t("pay")
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
