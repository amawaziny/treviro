"use client";

import React, { useEffect, useState } from "react";
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
import useFinancialRecords from "@/hooks/use-financial-records";
import type { ExpenseRecord } from "@/lib/types";

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useLanguage();
  const { findExpenseById, updateExpense } = useFinancialRecords();
  const router = useRouter();
  const { id: expenseId } = React.use(params);
  const { setHeaderProps, openForm, closeForm } = useForm();

  const [expense, setExpense] = useState<ExpenseRecord | null>(null);

  useEffect(() => {
    const loadExpense = async () => {
      try {
        const expenseData = await findExpenseById(expenseId);
        setExpense(expenseData);
      } catch (error) {
        console.error('Error loading expense:', error);
        setExpense(null);
      }
    };

    loadExpense();
  }, [expenseId]);

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
              category: expense.type,
              description: expense.description ?? "",
              amount: expense.amount,
              date: expense.date,
              isInstallment: expense.isInstallment ?? false,
              numberOfInstallments: expense.numberOfInstallments,
            }}
            onSubmit={async (values: ExpenseFormValues) => {
              await updateExpense(expenseId, {
                ...values,
                amount: values.amount,
                numberOfInstallments: values.numberOfInstallments,
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
