"use client";
import { useLanguage } from "@/contexts/language-context";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvestments } from "@/contexts/investment-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateDisplay, formatNumberForMobile } from "@/lib/utils";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { RealEstateInvestment } from "@/lib/types";

interface MyRealEstateListItemProps {
  investment: RealEstateInvestment;
  removeRealEstateInvestment: (id: string) => Promise<void>;
}

export function MyRealEstateListItem({
  investment,
  removeRealEstateInvestment,
}: MyRealEstateListItemProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const handleRemove = async () => {
    try {
      await removeRealEstateInvestment(investment.id);
      toast({
        title: t("real_estate_removed"),
        description: `${investment.name || investment.propertyAddress} ${t("has_been_removed")}.`,
      });
    } catch (error: any) {
      toast({
        title: t("error_removing_real_estate"),
        description:
          error.message ||
          `${t("Could not remove")} ${investment.name || investment.propertyAddress}.`,
        variant: "destructive",
      });
    }
    setIsAlertDialogOpen(false);
  };

  const handleNavigateToDetails = () => {
    router.push(`/investments/real-estate/details/${investment.id}`);
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden cursor-pointer"
      onClick={handleNavigateToDetails}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex gap-3 flex-grow min-w-0 w-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary bg-muted/30"
              disabled
            >
              <Home className="h-8 w-8" />
            </Button>
            <div className="truncate">
              <p className="text-lg font-semibold truncate">
                {investment.name || investment.propertyAddress}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t(investment.propertyType || "na")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {investment.propertyAddress}
              </p>
            </div>
          </div>
          <div
            className="text-end items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-lg flex flex-row items-center">
              {formatNumberForMobile(
                isMobile,
                investment.totalInvested,
                investment.currency,
              )}
            </div>
            <div className="flex flex-row justify-end items-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit"
                onClick={() =>
                  router.push(`/investments/real-estate/edit/${investment.id}`)
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="ms-2 text-muted-foreground hover:text-destructive"
                onClick={() => setIsAlertDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">
                  {t("remove")} {investment.name || investment.propertyAddress}
                </span>
              </Button>
              <AlertDialog
                open={isAlertDialogOpen}
                onOpenChange={setIsAlertDialogOpen}
              >
                <AlertDialogTrigger asChild></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="sm:text-center">
                      {t("are_you_sure")}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="sm:text-center">
                      {`${t("this_action_will_permanently_remove_your_record_for")} ${investment.name || investment.propertyAddress} ${t("this_cannot_be_undone")}`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("remove")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
          <p>
            {`${t("installment")}: ${
              investment.installmentAmount
                ? `${formatNumberForMobile(isMobile, investment.installmentAmount, investment.currency)}`
                : t("na")
            }`}
          </p>
          <p className="text-end">
            {`${t("frequency")}: ${t(investment.installmentFrequency || "na")}`}
          </p>
          <p>
            {`${t("total_price")}: ${
              investment.totalPrice
                ? `${formatNumberForMobile(isMobile, investment.totalPrice, investment.currency)}`
                : t("na")
            }`}
          </p>
          <p className="text-end">
            {`${t("end_date")}: ${investment.lastInstallmentDate ? formatDateDisplay(investment.lastInstallmentDate) : t("na")}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
