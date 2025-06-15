"use client";

// This component is no longer used for Salary, Zakat, Charity.
// This functionality is moved to the new Fixed Estimates feature.
// This file can be deleted or repurposed for other settings.
import { useLanguage } from "@/contexts/language-context";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FinancialSettingsForm() {
  const { t: t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("financial_settings_placeholder")}</CardTitle>
        <CardDescription>
          {t(
            "management_of_salary_zakat_and_charity_is_now_handled_on_the_fixed_estimates_page_this_component_is_currently_a_placeholder",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{t("no_settings_here")}</p>
      </CardContent>
    </Card>
  );
}
