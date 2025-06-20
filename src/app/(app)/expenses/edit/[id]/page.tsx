"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { ExpenseForm } from "@/components/expenses/expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { notFound } from "next/navigation";
import { useForm } from "@/contexts/form-context";
import { ExpenseFormValues } from "@/lib/schemas";

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useLanguage();
  const { expenseRecords, updateExpenseRecord } = useInvestments();
  const router = useRouter();
  const { id: expenseId } = React.use(params);
  const { setHeaderProps, openForm, closeForm } = useForm();

  // Find the expense record by id
  const expense = React.useMemo(
    () => expenseRecords.find((rec) => rec.id === expenseId),
    [expenseRecords, expenseId],
  );

  if (!expense) {
    return notFound();
  }

  React.useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: t("edit_expense_record"),
      description: t(
        "update_your_expense_details_such_as_installments_credit_card_payments_subscriptions_or_other_spending",
      ),

      backLabel: t("back_to_expenses"),
      backHref: "/expenses",
    });

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [setHeaderProps, closeForm, openForm]);

  return (
    <div
      className="container mx-auto py-4 space-y-6"
      data-testid="edit-expense-page"
    >
      <Card data-testid="expense-form-card">
        <CardHeader>
          <CardTitle data-testid="page-title">
            {t("edit_expense_record")}
          </CardTitle>
          <CardDescription data-testid="page-description">
            {t(
              "update_your_expense_details_such_as_installments_credit_card_payments_subscriptions_or_other_spending",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            initialValues={{
              category: expense.category,
              description: expense.description ?? "",
              //@ts-expect-error
              amount: expense.amount?.toString() ?? "",
              date: expense.date,
              isInstallment: expense.isInstallment ?? false,
              //@ts-expect-error
              numberOfInstallments: expense.numberOfInstallments
                ? expense.numberOfInstallments.toString()
                : "",
            }}
            onSubmit={async (values: ExpenseFormValues) => {
              await updateExpenseRecord(expenseId, {
                ...values,
                amount: Number(values.amount),
                numberOfInstallments: values.numberOfInstallments
                  ? Number(values.numberOfInstallments)
                  : undefined,
              });
              router.push("/expenses");
            }}
            isEditMode={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
