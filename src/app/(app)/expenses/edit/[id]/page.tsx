"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";
import { ExpenseFormValues } from "@/lib/schemas";
import useFinancialRecords from "@/hooks/use-financial-records";
import { ExpenseRecord } from "@/lib/types";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateISO } from "@/lib/utils";

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { id: expenseId } = React.use(params);

  const month = useMemo(() => startOfDay(new Date()), []);
  const startMonth = useMemo(() => startOfMonth(month), [month]);
  const endMonth = useMemo(() => endOfMonth(month), [month]);
  const [expense, setExpense] = useState<ExpenseRecord | null>(null);

  const { setHeaderProps, openForm, closeForm } = useForm();
  useEffect(() => {
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

  const { findExpenseById, updateExpense } = useFinancialRecords(
    startMonth,
    endMonth,
  );
  useEffect(() => {
    findExpenseById(expenseId).then(setExpense);
  }, [expenseId, findExpenseById]);

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
          {!expense ? (
            <div className="space-y-6">
              <Skeleton className="h-96 w-full rounded" />
            </div>
          ) : (
            <ExpenseForm
              initialValues={{
                category: expense.type,
                description: expense.description ?? "",
                amount: expense.amount * -1,
                date: formatDateISO(expense.date || new Date()),
                isInstallment: expense.isInstallment ?? false,
                numberOfInstallments: expense.numberOfInstallments,
              }}
              onSubmit={async (values: ExpenseFormValues) => {
                await updateExpense(expenseId, {
                  ...values,
                  date: new Date(values.date),
                  amount: -values.amount,
                  numberOfInstallments: values.numberOfInstallments || 0,
                });
                router.push("/expenses");
              }}
              isEditMode={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
