"use client";
import { useLanguage } from "@/contexts/language-context";
import { useCallback, useState } from "react";

import type { AggregatedDebtHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Pencil, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { formatNumberForMobile } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvestments } from "@/hooks/use-investments";
import Link from "next/link";

interface DirectDebtListItemProps {
  holding: AggregatedDebtHolding;
}

export function DirectDebtListItem({ holding }: DirectDebtListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { removeDirectDebtInvestment } = useInvestments();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      await removeDirectDebtInvestment(holding.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [holding.id, removeDirectDebtInvestment]);

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
    <>
      <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden relative">
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
            <p className="flex gap-2 col-span-2 justify-end items-end">
              <Link
                href={`/investments/debt-instruments/edit/${holding.id}`}
                passHref
                legacyBehavior
              >
                <Button variant="ghost" size="icon" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete"
                data-testid={`delete-debt-${holding.id}`}
                onClick={handleDeleteClick}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("this_action_will_permanently_delete_this_debt_record_this_cannot_be_undone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? t("deleting") + "..." : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
DirectDebtListItem.displayName = "MyDebtListItem";
