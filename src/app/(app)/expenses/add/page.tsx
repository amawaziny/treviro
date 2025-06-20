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
import { useInvestments } from "@/hooks/use-investments";
import { ExpenseFormValues } from "@/lib/schemas";
import { ExpenseRecord } from "@/lib/types";

export default function AddExpensePage() {
  const { t } = useLanguage();
  const { addExpenseRecord } = useInvestments();

  async function onSubmit(values: ExpenseFormValues) {
    // Zod schema already coerces amount and numberOfInstallments to numbers or undefined if empty.
    // It also ensures numberOfInstallments is a positive int if isInstallment is true.
    const expenseDataToSave: Omit<
      ExpenseRecord,
      "id" | "createdAt" | "userId"
    > = {
      category: values.category!,
      amount: values.amount, // Zod has coerced this to number
      date: values.date,
    };

    if (values.description && values.description.trim() !== "") {
      expenseDataToSave.description = values.description;
    }

    if (values.category === "Credit Card") {
      expenseDataToSave.isInstallment = values.isInstallment;
      if (values.isInstallment && values.numberOfInstallments) {
        // Zod ensures values.numberOfInstallments is a number here if isInstallment is true
        expenseDataToSave.numberOfInstallments = values.numberOfInstallments;
      }
    }

    await addExpenseRecord(expenseDataToSave);
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
