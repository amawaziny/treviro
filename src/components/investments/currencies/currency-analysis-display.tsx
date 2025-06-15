"use client";
import { useLanguage } from "@/contexts/language-context";

import type { CurrencyFluctuationAnalysisOutput } from "@/ai/flows/currency-fluctuation-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface CurrencyAnalysisDisplayProps {
  result: CurrencyFluctuationAnalysisOutput;
}

export function CurrencyAnalysisDisplay({
  result,
}: CurrencyAnalysisDisplayProps) {
  const { t: t } = useLanguage();
  const isSignificant = result.significantDeviation;
  const deviationPercent = result.deviationPercentage.toFixed(2);

  let icon;
  let title;
  let variant: "default" | "destructive" = "default";

  if (isSignificant) {
    icon = <AlertCircle className="h-4 w-4" />;
    title = t("significant_currency_fluctuation_alert");
    variant = "destructive";
  } else {
    icon =
      result.deviationPercentage >= 0 ? (
        <TrendingUp className="h-4 w-4 text-accent" />
      ) : (
        <TrendingDown className="h-4 w-4 text-destructive" />
      );

    title = t("currency_fluctuation_analysis");
  }

  // Ensure proper text color on destructive variant
  const descriptionClass =
    variant === "destructive" ? t("textdestructiveforeground") : "";

  return (
    <Alert variant={variant} className="mt-6">
      <div className="flex items-center gap-2">
        {icon}
        <AlertTitle>{title}</AlertTitle>
      </div>
      <AlertDescription className={descriptionClass}>
        <p className="mt-2">
          <strong>{t("deviation")}</strong> {deviationPercent}%
        </p>
        <p className="mt-1">
          <strong>{t("summary")}</strong> {result.analysisSummary}
        </p>
      </AlertDescription>
    </Alert>
  );
}
