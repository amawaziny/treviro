"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { notFound } from "next/navigation";
import { useForm } from '@/contexts/form-context';
import { AddExpenseFormValues } from "@/lib/schemas";

export default function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { expenseRecords, updateExpenseRecord } = useInvestments();
  const router = useRouter();
  const { id: expenseId } = React.use(params);
  const { setHeaderProps, openForm, closeForm } = useForm();

  // Find the expense record by id
  const expense = React.useMemo(
    () => expenseRecords.find((rec) => rec.id === expenseId),
    [expenseRecords, expenseId]
  );

  if (!expense) {
    return notFound();
  }

  const { language } = useLanguage();
  const BackArrowIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: 'Edit Expense Record',
      description: 'Update your expense details, such as installments, credit card payments, subscriptions, or other spending.',
      backLabel: 'Back to Expenses',
      backHref: '/expenses'
    });

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [setHeaderProps, closeForm, openForm]);

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Expense Record</CardTitle>
          <CardDescription>Update your expense details, such as installments, credit card payments, subscriptions, or other spending.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddExpenseForm
            initialValues={{
              category: expense.category,
              description: expense.description ?? '',
              //@ts-expect-error
              amount: expense.amount?.toString() ?? '',
              date: expense.date,
              isInstallment: expense.isInstallment ?? false,
              //@ts-expect-error
              numberOfInstallments: expense.numberOfInstallments ? expense.numberOfInstallments.toString() : '',
            }}
            onSubmit={async (values: AddExpenseFormValues) => {
              await updateExpenseRecord(expenseId, {
                ...values,
                amount: Number(values.amount),
                numberOfInstallments: values.numberOfInstallments ? Number(values.numberOfInstallments) : undefined,
              });
              router.push("/expenses");
            }}
            isEditMode
          />
        </CardContent>
      </Card>
    </div>
  );
}

