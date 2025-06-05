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

export default function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { expenseRecords, updateExpenseRecord } = useInvestments();
  const router = useRouter();
  const { id: expenseId } = React.use(params);

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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/expenses">
          <BackArrowIcon className={language === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
          Back to Expenses
        </Link>
      </Button>
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
            onSubmit={async (values: import('@/lib/schemas').AddExpenseFormValues) => {
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
