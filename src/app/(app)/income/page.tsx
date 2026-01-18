"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import {
  formatDateDisplay,
  formatMonthYear,
  formatNumberForMobile,
} from "@/lib/utils";
import { useFinancialRecords } from "@/hooks/use-financial-records";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, PiggyBank } from "lucide-react";
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
import { Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

export default function IncomePage() {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  // UI state for filters
  const [showAll, setShowAll] = useState(false); // false = this month, true = all

  const month = useMemo(() => new Date(), []);
  const startDate = useMemo(() => startOfMonth(month), []);
  const endDate = useMemo(() => endOfMonth(month), []);

  const { incomesManual, isLoading, deleteIncome } = useFinancialRecords(
    startDate,
    endDate,
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
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
          {t("income_management")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "log_and_manage_all_your_income_sources_including_salaries_gifts_and_other_earnings",
          )}
        </p>
      </div>
      <Separator />

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            dir="auto"
            checked={showAll}
            onCheckedChange={setShowAll}
            id="show-all-switch"
          />

          <span>{t("show_all_income")}</span>
        </label>
      </div>

      {incomesManual.length > 0 ? (
        <>
          {/* Summary Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PiggyBank className="me-2 h-4 w-4 text-primary" />
                {showAll ? t("total_income_all") : t("total_income_this_month")}
              </CardTitle>
              <CardDescription>
                {showAll
                  ? t("view_and_manage_all_your_recorded_income_sources")
                  : `${t("see_and_manage_all_income_received_in")} ${formatMonthYear(new Date(), language)}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-bold text-foreground">
                {formatNumberForMobile(
                  isMobile,
                  incomesManual.reduce((sum, r) => sum + r.amount, 0),
                )}
              </span>
            </CardContent>
          </Card>

          <div className="grid gap-4 mt-8">
            {incomesManual.map((record) => (
              <Card key={record.id} className="last:mb-24">
                <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4">
                  {/* Main Info Column */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Title, Date */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold truncate text-base">
                        {record.description || t(record.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateDisplay(record.date)}
                      </span>
                    </div>
                    {/* Amount and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-xl font-bold">
                        {formatNumberForMobile(isMobile, record.amount)}
                      </span>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/income/edit/${record.id}`}
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
                                {t("Remove")}{" "}
                                {record.description || t(record.type)}
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
                                  "this_action_will_permanently_delete_this_income_record_this_cannot_be_undone",
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
                                    await deleteIncome(record.id);
                                    toast({
                                      title: t("success"),
                                      description: t("Income record deleted successfully"),
                                    });
                                  } catch (e) {
                                    console.error(
                                      t("error_deleting_income_record"),
                                      e,
                                    );
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
              <PiggyBank className="me-2 h-4 w-4 text-primary" />
              {t("no_income_recorded_this_month")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              {`${t("you_havent_added_any_income_records_for")} ${formatMonthYear(new Date(), language)} ${t("yet")}`}
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/income/add" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new income record"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
