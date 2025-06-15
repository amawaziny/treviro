"use client";
import { useLanguage } from "@/contexts/language-context";

import { AddIncomeForm } from "@/components/income/add-income-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";
import { useForm } from "@/contexts/form-context";

export default function AddIncomePage() {
  const { t } = useLanguage();
  const { setHeaderProps, openForm, closeForm } = useForm();

  useEffect(() => {
    openForm();
    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: t("add_income"),
      backHref: "/income",
      backLabel: t("back_to_income_records"),
    });
    return () => {
      closeForm();
    };
  }, [setHeaderProps, openForm, closeForm]);

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("add_new_income_record")}</CardTitle>
          <CardDescription>
            {t("log_your_salary_profit_shares_or_other_cash_inflows")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddIncomeForm />
        </CardContent>
      </Card>
    </div>
  );
}
