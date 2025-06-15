"use client";

import { AddEditFixedEstimateForm } from "@/components/fixed-estimates/add-edit-fixed-estimate-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export default function AddFixedEstimatePage() {
  const { t } = useLanguage();
  const { language } = useLanguage();
  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/fixed-estimates">
          <BackArrowIcon
            className={language === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"}
          />
          {t("back_to_fixed_estimates")}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t("add_new_fixed_estimate")}</CardTitle>
          <CardDescription>
            {t("log_your_recurring_income_or_expenses_like_salary_zakat_etc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddEditFixedEstimateForm mode="add" />
        </CardContent>
      </Card>
    </div>
  );
}
