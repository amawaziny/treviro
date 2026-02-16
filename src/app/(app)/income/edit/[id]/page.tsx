"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFinancialRecords } from "@/contexts/financial-records-context";
import { Skeleton } from "@/components/ui/skeleton";
import { IncomeForm } from "@/components/income/income-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";
import { IncomeFormValues } from "@/lib/schemas";
import { formatDateISO } from "@/lib/utils";

export default function EditIncomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const incomeId = params.id as string;

  const { updateIncome, incomesManual } = useFinancialRecords();

  const income = incomesManual.find((i) => i.id === incomeId) || null;

  const { setHeaderProps, openForm, closeForm } = useForm();
  useEffect(() => {
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
          {!income ? (
            <div className="space-y-6">
              <Skeleton className="h-96 w-full rounded" />
            </div>
          ) : (
            <IncomeForm
              initialValues={{
                type: income?.type,
                source: income?.source,
                description: income?.description ?? "",
                amount: income?.amount,
                date: formatDateISO(income?.date || new Date()),
              }}
              onSubmit={async (values: IncomeFormValues) => {
                await updateIncome(incomeId, {
                  ...values,
                  amount: Number(values.amount),
                  date: new Date(values.date),
                });
                router.push("/income");
              }}
              isEditMode
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
