"use client";

import React from "react";
import Link from "next/link";
import { useInvestments } from "@/hooks/use-investments";
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
import { Plus, Settings, PiggyBank } from "lucide-react";
import { cn, formatCurrencyWithCommas, formatNumberWithSuffix } from "@/lib/utils";
import type { FixedEstimateRecord } from "@/lib/types";

export default function FixedEstimatesPage() {
  const { t } = useLanguage();
  const { fixedEstimates, isLoading } = useInvestments();
  const { language } = useLanguage();

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

  // Calculate total income and expenses
  const totalIncome = fixedEstimates
    .filter(record => !record.isExpense)
    .reduce((sum, record) => sum + record.amount, 0);
  
  const totalExpenses = fixedEstimates
    .filter(record => record.isExpense)
    .reduce((sum, record) => sum + record.amount, 0);

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("fixed_estimates")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "manage_your_recurring_income_and_expenses_like_salary_zakat_and_charity"
          )}
        </p>
      </div>
      <Separator />

      {fixedEstimates.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t("total_fixed_income")}
                </CardTitle>
                <PiggyBank className="h-4 w-4 text-green-600 dark:text-green-400" />
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
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  {t("total_fixed_expenses")}
                </CardTitle>
                <Settings className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  <span className="md:hidden">
                    {formatNumberWithSuffix(totalExpenses)}
                  </span>
                  <span className="hidden md:inline">
                    {formatCurrencyWithCommas(totalExpenses)}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 mt-8">
            {fixedEstimates.map((record: FixedEstimateRecord) => (
              <Card
                key={record.id}
                className={cn(
                  record.isExpense ? "border-red-200 dark:border-red-700" : "border-green-200 dark:border-green-700"
                )}
              >
                <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4">
                  {/* Main Info Column */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Type and Name */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold truncate text-base">
                        {record.type}
                      </span>
                      {record.name && (
                        <span className="text-sm text-muted-foreground">
                          ({record.name})
                        </span>
                      )}
                    </div>
                    {/* Period and Nature */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{record.period}</span>
                      <span>•</span>
                      <span className={cn(
                        record.isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                      )}>
                        {record.isExpense ? t("expense") : t("income")}
                      </span>
                    </div>
                  </div>
                  {/* Amount */}
                  <div className="text-2xl font-bold">
                    <span className="md:hidden">
                      {formatNumberWithSuffix(record.amount)}
                    </span>
                    <span className="hidden md:inline">
                      {formatCurrencyWithCommas(record.amount)}
                    </span>
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
              <Settings className="mr-2 h-4 w-4 text-primary" />
              {t("no_fixed_estimates_set")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_fixed_estimates_yet")}
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/fixed-estimates/add" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new fixed estimate"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
