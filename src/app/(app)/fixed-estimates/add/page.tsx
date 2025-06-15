"use client";

import { useEffect } from "react";
import { AddEditFixedEstimateForm } from "@/components/fixed-estimates/add-edit-fixed-estimate-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";

export default function AddFixedEstimatePage() {
  const { t } = useLanguage();
  const { setHeaderProps, openForm, closeForm } = useForm();

  useEffect(() => {
    openForm();

    setHeaderProps({
      title: t("add_new_fixed_estimate"),
      description: t("log_your_recurring_income_or_expenses_like_salary_zakat_etc"),
      showBackButton: true,
      showNavControls: false,
      backHref: "/fixed-estimates",
      backLabel: t("back_to_fixed_estimates"),
    });

    return () => {
      closeForm();
    };
  }, [t, setHeaderProps, openForm, closeForm]);

  return (
    <div className="container mx-auto py-4">
      <Card>
        <CardContent className="pt-6">
          <AddEditFixedEstimateForm mode="add" />
        </CardContent>
      </Card>
    </div>
  );
}
