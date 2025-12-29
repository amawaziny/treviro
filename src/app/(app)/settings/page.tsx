"use client";
import { useLanguage } from "@/contexts/language-context";
import React, { useEffect, useState } from "react";
import type {
  InvestmentType,
  AppSettings,
  InvestmentTypePercentage,
} from "@/lib/types";

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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus } from "lucide-react";
import { useAppSettings } from "@/hooks/use-app-settings";

export default function SettingsPage() {
  const { t, dir } = useLanguage();
  const {
    appSettings,
    updateAppSettings,
    isLoading: isLoadingContext,
  } = useAppSettings();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [investmentPercentages, setInvestmentPercentages] =
    useState<InvestmentTypePercentage>({
      "Real Estate": 30,
      Securities: 25,
      "Debt Instruments": 20,
      Currencies: 10,
      Gold: 15,
    });
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Calculate total percentage whenever investmentPercentages changes
  useEffect(() => {
    const total = Object.values(investmentPercentages).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    );
    const roundedTotal = Math.round(total * 100) / 100;
    setTotalPercentage(roundedTotal);
    setShowWarning(roundedTotal < 100);
  }, [investmentPercentages]);

  // Load saved investment percentages
  useEffect(() => {
    if (appSettings?.investmentTypePercentages) {
      setInvestmentPercentages((prev) => ({
        ...prev,
        ...appSettings.investmentTypePercentages,
      }));
    }
  }, [appSettings?.investmentTypePercentages]);

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

    if (totalPercentage > 100) {
      toast({
        title: t("error"),
        description: t("total_investment_percentages_cannot_exceed_100"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newSettings: Partial<AppSettings> = {
        financialYearStartMonth: parseInt(selectedMonth, 10),
        investmentTypePercentages: {
          "Real Estate": investmentPercentages["Real Estate"] || 0,
          Gold: investmentPercentages["Gold"] || 0,
          Securities: investmentPercentages["Securities"] || 0,
          "Debt Instruments": investmentPercentages["Debt Instruments"] || 0,
          Currencies: investmentPercentages["Currencies"] || 0,
        },
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

  const handlePercentageChange = (type: InvestmentType, value: number) => {
    // Allow any value between 0 and 100 for the specific field
    const newValue = Math.max(0, Math.min(100, value));

    setInvestmentPercentages((prev) => ({
      ...prev,
      [type]: newValue,
    }));
  };

  const getRemainingPercentage = () => {
    const used = Object.values(investmentPercentages).reduce(
      (sum, v) => sum + v,
      0,
    );
    return Math.max(0, 100 - used);
  };

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
              <Select
                dir={dir}
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger
                  id="financial-year-start-month"
                  className="w-full md:w-[280px]"
                >
                  <SelectValue placeholder={t("select_a_month")} />
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

          <div className="space-y-6 pt-6">
            <div>
              <h3 className="text-lg font-medium">
                {t("investment_allocation")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("set_your_monthly_investment_allocation_percentages")}
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(investmentPercentages).map(([type, value]) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{t(type)}</label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = Math.max(0, value - 1);
                          handlePercentageChange(
                            type as InvestmentType,
                            newValue,
                          );
                        }}
                        disabled={value <= 0}
                        className="p-1 rounded-full hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Decrease ${type} percentage`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value, 10) || 0;
                          handlePercentageChange(
                            type as InvestmentType,
                            newValue,
                          );
                        }}
                        className="w-16 px-2 py-1 text-sm border bg-transparent rounded text-center"
                        aria-label={`${type} percentage`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = value + 1;
                          handlePercentageChange(
                            type as InvestmentType,
                            newValue,
                          );
                        }}
                        disabled={getRemainingPercentage() <= 0}
                        className="p-1 rounded-full hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Increase ${type} percentage`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([val]) =>
                      handlePercentageChange(type as InvestmentType, val)
                    }
                    min={0}
                    max={100}
                    step={1}
                    className="py-4"
                  />
                </div>
              ))}

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t("total")}</span>
                  <span
                    className={`text-sm font-medium ${
                      totalPercentage === 100
                        ? "text-green-600"
                        : totalPercentage < 100
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {totalPercentage}%
                  </span>
                </div>

                {totalPercentage > 100 ? (
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-red-600">
                      {t("total_must_equal_100_percent")}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {getRemainingPercentage()}% {t("remaining")}
                    </span>
                  </div>
                ) : (
                  totalPercentage < 100 && (
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-amber-600">
                        {t("warning_total_percentage_less_than_100")}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {getRemainingPercentage()}% {t("remaining")}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {totalPercentage > 100 && (
              <div className="text-red-600 text-sm">
                {t("error_total_percentage_exceeds_100")} ({totalPercentage}%)
              </div>
            )}
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || isLoading || totalPercentage > 100}
              className="w-full sm:w-auto"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save_settings")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
