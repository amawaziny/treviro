"use client";
import { useLanguage } from "@/contexts/language-context";

import type { AggregatedDebtHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Building } from "lucide-react";
import { formatNumberForMobile } from "@/lib/utils";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DirectDebtListItemProps {
  holding: AggregatedDebtHolding;
}

export function DirectDebtListItem({ holding }: DirectDebtListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const {
    displayName,
    currency,
    amountInvested,
    debtSubType,
    issuer,
    interestRate,
    maturityDate,
    projectedMonthlyInterest,
    projectedAnnualInterest,
  } = holding;

  // Render direct debt instrument (bonds, certificates, etc.)
  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 flex-grow min-w-0 w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-primary flex-shrink-0">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p
                className="text-sm font-semibold sm:truncate"
                title={displayName}
              >
                {displayName
                  ? isMobile && displayName.length > 15
                    ? displayName.slice(0, 15) + "…"
                    : displayName
                  : t("debt_item")}
              </p>
              <p className="text-xs text-muted-foreground sm:truncate">
                {`${t(debtSubType!)} ${issuer ? `- ${issuer}` : ""}`}
              </p>
            </div>
          </div>
          <div className="text-end flex-shrink-0">
            {typeof amountInvested === "number" ? (
              <p className="text-md font-bold">
                {formatNumberForMobile(isMobile, amountInvested, currency)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("na")}</p>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <p>
            {`${t("interest_rate")}: ${interestRate ? `${interestRate}%` : t("na")}`}
          </p>
          <p className="text-end">
            {`${t("maturity")}: ${maturityDate || t("na")}`}
          </p>
          <p>
            {`${t("monthly_interest")}: ${formatNumberForMobile(isMobile, projectedMonthlyInterest, currency)}`}
          </p>
          <p className="text-end">
            {`${t("annual_interest")}: ${formatNumberForMobile(isMobile, projectedAnnualInterest, currency)}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
DirectDebtListItem.displayName = "MyDebtListItem";
