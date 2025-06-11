"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { AddIncomeForm } from "@/components/income/add-income-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { notFound } from "next/navigation";
import { useForm } from "@/contexts/form-context";
import { AddIncomeFormValues } from "@/lib/schemas";

export default function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { incomeRecords, updateIncomeRecord } = useInvestments();
  const router = useRouter();
  const { id: incomeId } = React.use(params);
  const { setHeaderProps, openForm, closeForm } = useForm();

  // Find the income record by id
  const income = React.useMemo(
    () => incomeRecords.find((rec) => rec.id === incomeId),
    [incomeRecords, incomeId],
  );

  if (!income) {
    return notFound();
  }

  const { language } = useLanguage();
  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: "Edit Income Record",
      description: "Update your income details, such as salary, freelance, or other sources.",
      backLabel: "Back to Income",
      backHref: "/income",
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
          <CardTitle>Edit Income Record</CardTitle>
          <CardDescription>
            Update your income details, such as salary, freelance, or other sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddIncomeForm
            initialValues={{
              type: income.type,
              source: income.source,
              description: income.description ?? "",
              //@ts-expect-error
              amount: income.amount?.toString() ?? "",
              date: income.date,
              isRecurring: income.isRecurring ?? false,
              recurrencePeriod: income.recurrencePeriod ?? "",
            }}
            onSubmit={async (values: AddIncomeFormValues) => {
              await updateIncomeRecord(incomeId, {
                ...values,
                amount: Number(values.amount),
              });
              router.push("/income");
            }}
            isEditMode
          />
        </CardContent>
      </Card>
    </div>
  );
}
