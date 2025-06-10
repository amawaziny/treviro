"use client";

import type { CurrencyFluctuationAnalysisOutput } from "@/ai/flows/currency-fluctuation-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface CurrencyAnalysisDisplayProps {
  result: CurrencyFluctuationAnalysisOutput;
}

export function CurrencyAnalysisDisplay({
  result,
}: CurrencyAnalysisDisplayProps) {
  const isSignificant = result.significantDeviation;
  const deviationPercent = result.deviationPercentage.toFixed(2);

  let icon;
  let title;
  let variant: "default" | "destructive" = "default";

  if (isSignificant) {
    icon = <AlertCircle className="h-4 w-4" />;
    title = "Significant Currency Fluctuation Alert";
    variant = "destructive";
  } else {
    icon =
      result.deviationPercentage >= 0 ? (
        <TrendingUp className="h-4 w-4 text-accent" />
      ) : (
        <TrendingDown className="h-4 w-4 text-destructive" />
      );
    title = "Currency Fluctuation Analysis";
  }

  // Ensure proper text color on destructive variant
  const descriptionClass =
    variant === "destructive" ? "text-destructive-foreground" : "";

  return (
    <Alert variant={variant} className="mt-6">
      <div className="flex items-center gap-2">
        {icon}
        <AlertTitle>{title}</AlertTitle>
      </div>
      <AlertDescription className={descriptionClass}>
        <p className="mt-2">
          <strong>Deviation:</strong> {deviationPercent}%
        </p>
        <p className="mt-1">
          <strong>Summary:</strong> {result.analysisSummary}
        </p>
      </AlertDescription>
    </Alert>
  );
}
