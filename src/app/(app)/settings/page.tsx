"use client";
import { useLanguage } from "@/contexts/language-context";

import React, { useEffect, useState } from "react";
import { useInvestments } from "@/hooks/use-investments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const {
    appSettings,
    updateAppSettings,
    isLoading: isLoadingContext,
  } = useInvestments();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);

  const months = [
    { value: 1, label: t("January") },
    { value: 2, label: t("February") },
    { value: 3, label: t("March") },
    { value: 4, label: t("April") },
    { value: 5, label: t("May") },
    { value: 6, label: t("June") },
    { value: 7, label: t("July") },
    { value: 8, label: t("August") },
    { value: 9, label: t("September") },
    { value: 10, label: t("October") },
    { value: 11, label: t("November") },
    { value: 12, label: t("December") },
  ];

  useEffect(() => {
    if (appSettings?.financialYearStartMonth) {
      setSelectedMonth(String(appSettings.financialYearStartMonth));
    } else if (!isLoadingContext && !appSettings?.financialYearStartMonth) {
      setSelectedMonth("1"); // Default to January if no setting exists and not loading
    }
  }, [appSettings, isLoadingContext]);

  const handleSaveSettings = async () => {
    if (!selectedMonth) {
      toast({
        title: t("error"),
        description: t("please_select_a_financial_year_start_month"),
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const newSettings: Partial<AppSettings> = {
        financialYearStartMonth: parseInt(selectedMonth, 10),
      };
      await updateAppSettings(newSettings);
      toast({
        title: t("settings_saved"),
        description: t("your_financial_settings_have_been_updated"),
      });
    } catch (error: any) {
      toast({
        title: t("error_saving_settings"),
        description: error.message || t("could_not_save_your_settings"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingContext && selectedMonth === undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("settings")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "adjust_your_financial_settings_such_as_your_financial_year_start_month_and_other_preferences",
          )}
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{t("financial_settings")}</CardTitle>
          <CardDescription>
            {t("configure_your_financial_year_preferences")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("loading_settings")}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="financial-year-start-month"
                className="text-sm font-medium"
              >
                {t("financial_year_start_month")}
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger
                  id="financial-year-start-month"
                  className="w-full md:w-[280px]"
                >
                  <SelectValue placeholder="Select a month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("choose_the_month_your_financial_year_begins")}
              </p>
            </div>
          )}

          <Button onClick={handleSaveSettings} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save_settings")}
          </Button>
        </CardContent>
      </Card>
      {/* Future settings sections can be added here */}
    </div>
  );
}
