"use client";
import { useLanguage } from "@/contexts/language-context";

import Image from "next/image";
import type { AggregatedDebtHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import {
  cn,
  formatCurrencyWithCommas,
  formatNumberWithSuffix,
} from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MyDebtListItemProps {
  holding: AggregatedDebtHolding;
}

const buttonVariants = ({
  variant,
}: {
  variant:
    | "destructive"
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null
    | undefined;
}) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return "";
};

export function MyDebtListItem({ holding }: MyDebtListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { removeStockInvestmentsBySymbol } = useInvestments();
  const { toast } = useToast();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const {
    id,
    displayName,
    fundDetails,
    totalUnits,
    averagePurchasePrice,
    currentMarketPrice,
    profitLoss,
    profitLossPercent,
    currency,
    logoUrl,
    itemType,
    amountInvested,
    debtSubType,
    issuer,
    interestRate,
    maturityDate,
    projectedMonthlyInterest,
    projectedAnnualInterest,
  } = holding;

  const handleRemoveFund = async () => {
    if (fundDetails?.symbol) {
      try {
        await removeStockInvestmentsBySymbol(fundDetails.symbol);
        toast({
          title: t("debt_fund_removed"),
          description: `${t("all_investments_in")} ${displayName} (${fundDetails.symbol}) ${t("have_been_removed")}.`,
        });
      } catch (error: any) {
        toast({
          title: t("error_removing_fund"),
          description:
            error.message || `${t("could_not_remove")} ${displayName}.`,
          variant: "destructive",
        });
      }
    }
    setIsAlertDialogOpen(false);
  };

  if (itemType !== "fund" || !fundDetails) {
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
                  {`${isMobile ? formatNumberWithSuffix(amountInvested, currency) : formatCurrencyWithCommas(amountInvested, currency)}`}
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
              {`${t("monthly_interest")}: ${isMobile ? formatNumberWithSuffix(projectedMonthlyInterest, currency) : formatCurrencyWithCommas(projectedMonthlyInterest, currency)}`}
            </p>
            <p className="text-end">
              {`${t("annual_interest")}: ${isMobile ? formatNumberWithSuffix(projectedAnnualInterest, currency) : formatCurrencyWithCommas(projectedAnnualInterest, currency)}`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Unify navigation: for funds use fundDetails.id, for direct use id
  const detailPageLink = fundDetails
    ? `/securities/details/${fundDetails.id}?previousPage=funds`
    : `/securities/details/${id}?previousPage=funds`;
  const isProfitable = profitLoss !== undefined && profitLoss >= 0;

  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 flex-grow min-w-0 w-0">
            <Link
              href={detailPageLink}
              passHref
              className="pointer-events-none"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${displayName} logo`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover cursor-pointer"
                  data-ai-hint="fund logo"
                />
              ) : (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-primary">
                  <Building className="h-4 w-4" />
                </div>
              )}
            </Link>

            <div className="truncate min-w-0 w-0">
              <Link href={detailPageLink} passHref>
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
              </Link>
              <p className="text-xs text-muted-foreground truncate">
                {`${fundDetails?.symbol} ${t("units")} ${isMobile ? formatNumberWithSuffix(totalUnits) : totalUnits?.toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="text-end flex-shrink-0">
            {currentMarketPrice !== undefined && profitLoss !== undefined ? (
              <>
                <p
                  className={cn(
                    "text-md font-bold",
                    isProfitable ? "text-accent" : "text-destructive",
                  )}
                >
                  {isMobile
                    ? formatNumberWithSuffix(profitLoss, currency)
                    : formatCurrencyWithCommas(profitLoss, currency)}
                </p>
                <Badge
                  variant={isProfitable ? "default" : "destructive"}
                  className={cn(
                    isProfitable
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive text-destructive-foreground",
                    "text-xs",
                  )}
                >
                  {isProfitable ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {profitLossPercent === Infinity
                    ? "∞%"
                    : (profitLossPercent?.toFixed(2) ?? t("na")) + "%"}
                </Badge>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("market_na")}</p>
            )}
          </div>
          <AlertDialog
            open={isAlertDialogOpen}
            onOpenChange={setIsAlertDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">
                  {t("remove")} {displayName}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    "this_action_will_permanently_remove_all_your_investment_records_for",
                  )}

                  {displayName}
                  {t("this_cannot_be_undone")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveFund}
                  className={buttonVariants({ variant: "destructive" })}
                >
                  {t("remove")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <p>
            {t("avg_cost")}

            <span className="md:hidden">
              {formatNumberWithSuffix(averagePurchasePrice || 0, currency)}
            </span>
            <span className="hidden md:inline">
              {formatCurrencyWithCommas(averagePurchasePrice, currency)}
            </span>
          </p>
          <p>
            {t("current_value")}

            <span className="md:hidden">
              {formatNumberWithSuffix(currentMarketPrice || 0, currency)}
            </span>
            <span className="hidden md:inline">
              {formatCurrencyWithCommas(currentMarketPrice, currency)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

MyDebtListItem.displayName = "MyDebtListItem";
