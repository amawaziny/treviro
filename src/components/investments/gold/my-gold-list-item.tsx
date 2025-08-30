"use client";
import { useLanguage } from "@/contexts/language-context";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import type { AggregatedGoldHolding } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { cn, formatNumberForMobile } from "@/lib/utils";
import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { calcProfit } from "@/lib/financial-utils";
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
import { Button } from "@/components/ui/button";

interface PhysicalGoldListItemProps {
  holding: AggregatedGoldHolding;
}

export function PhysicalGoldListItem({ holding }: PhysicalGoldListItemProps) {
  const { t } = useLanguage();
  const { removeGoldInvestments } = useInvestments();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!holding.id) return;
    
    try {
      setIsDeleting(true);
      console.log('Deleting gold investment:', holding.id);
      await removeGoldInvestments(holding.id, 'physical');
      toast({
        title: t('gold_investment_deleted'),
        description: t('gold_investment_has_been_deleted')
      });
    } catch (error) {
      console.error('Error deleting gold investment:', error);
      toast({
        title: t('error'),
        description: t('error_deleting_gold_investment'),
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const {
    displayName,
    totalQuantity,
    averagePurchasePrice,
    currentMarketPrice,
    currency,
    physicalGoldType,
  } = holding;

  // Calculate profit/loss
  const {
    isProfitable,
    profitLoss,
    totalCost,
    profitLossPercent,
    totalCurrentValue,
  } = calcProfit(totalQuantity, averagePurchasePrice, currentMarketPrice!);

  const quantityLabel =
    physicalGoldType === "Pound" || physicalGoldType === "Ounce"
      ? "Units"
      : "Grams";

  return (
    <>
      <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
        <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
            <div className="flex items-center gap-3 flex-grow min-w-0 hover:bg-muted/20rounded-md">
              <Gem className="h-8 w-8 text-amber-400" />
              <div className="truncate">
                <p className="font-semibold text-sm text-foreground truncate">
                  {t(physicalGoldType || "") || displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {`${t(quantityLabel)}: ${totalQuantity.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    },
                  )}`}
                </p>
              </div>
            </div>
          </div>

          <div className="text-end pl-2">
            {currentMarketPrice !== undefined ? (
              <div className="flex flex-col items-end">
                <p
                  className={cn(
                    "font-bold text-base",
                    isProfitable ? "text-accent" : "text-destructive",
                  )}
                >
                  {formatNumberForMobile(isMobile, profitLoss, currency)}
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
                  {totalCost > 0
                    ? profitLossPercent.toFixed(2) + "%"
                    : totalCurrentValue > 0
                      ? "∞%"
                      : "0.00%"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("market_na")}</p>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
          <p>
            {`${t("avg_cost")}: ${formatNumberForMobile(isMobile, averagePurchasePrice, currency)}`}
          </p>
          <p className="text-end">
            {`${t("market_price")}: ${formatNumberForMobile(isMobile, currentMarketPrice || 0, currency)}`}
          </p>
          <p className="flex gap-2 col-span-2 justify-end items-end">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">{t("delete")}</span>
            </Button>
          </p>
        </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_gold_investment')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('are_you_sure_delete_gold_investment')} {displayName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

PhysicalGoldListItem.displayName = "MyGoldListItem";
