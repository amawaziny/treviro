"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useFinancialRecords } from "@/hooks/use-financial-records";
import { IncomeForm } from "@/components/income/income-form";
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
import { IncomeFormValues } from "@/lib/schemas";

export default function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useLanguage();
  const { updateIncome, fetchIncomeById } = useFinancialRecords();
  const router = useRouter();
  const { id: incomeId } = React.use(params);
  const { setHeaderProps, openForm, closeForm } = useForm();

  const income = React.use(fetchIncomeById(incomeId));

  if (!income) {
    return notFound();
  }

  React.useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: t("edit_income_record"),
      description: t(
        "update_your_income_details_such_as_salary_freelance_or_other_sources",
      ),
      backLabel: t("back_to_income"),
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
          <CardTitle>{t("edit_income_record")}</CardTitle>
          <CardDescription>
            {t(
              "update_your_income_details_such_as_salary_freelance_or_other_sources",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeForm
            initialValues={{
              type: income.type,
              source: income.source,
              description: income.description ?? "",
              amount: income.amount,
              date: income.date,
            }}
            onSubmit={async (values: IncomeFormValues) => {
              await updateIncome(incomeId, {
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
