"use client";

import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

export default function AddExpensePage() {
  const { t: t } = useLanguage();

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
          <AddExpenseForm />
        </CardContent>
      </Card>
    </div>
  );
}
