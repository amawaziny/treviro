"use client";

import { ExpenseForm } from "@/components/expenses/expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { ExpenseFormValues } from "@/lib/schemas";
import { ExpenseRecord } from "@/lib/types";
import { useFinancialRecords } from "@/hooks/use-financial-records";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { useMemo } from "react";

export default function AddExpensePage() {
  const { t } = useLanguage();

  const month = useMemo(() => startOfDay(new Date()), []);
  const startMonth = useMemo(() => startOfMonth(month), [month]);
  const endMonth = useMemo(() => endOfMonth(month), [month]);
  const { addExpense } = useFinancialRecords(startMonth, endMonth);

  async function onSubmit(values: ExpenseFormValues) {
    // Zod schema already coerces amount and numberOfInstallments to numbers or undefined if empty.
    // It also ensures numberOfInstallments is a positive int if isInstallment is true.
    const expenseDataToSave: Omit<
      ExpenseRecord,
      "id" | "createdAt" | "recordType"
    > = {
      type: values.category!,
      amount: -values.amount, // Zod has coerced this to number
      date: new Date(values.date),
    };

    expenseDataToSave.description = values.description || "";

    expenseDataToSave.isInstallment = values.isInstallment;
    expenseDataToSave.numberOfInstallments = values.numberOfInstallments || 0;

    await addExpense(expenseDataToSave);
  }

  return (
    <div
      className="container mx-auto py-4 space-y-6"
      data-testid="add-expense-page"
    >
      <Card data-testid="expense-form-card">
        <CardHeader>
          <CardTitle data-testid="page-title">
            {t("add_new_expense_record")}
          </CardTitle>
          <CardDescription data-testid="page-description">
            {t(
              "log_your_expenses_like_installments_credit_card_payments_subscriptions_or_other_spending",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
