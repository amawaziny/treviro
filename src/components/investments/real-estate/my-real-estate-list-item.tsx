"use client";
import { useLanguage } from "@/contexts/language-context";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { formatNumberWithSuffix } from "@/lib/utils";
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

interface MyRealEstateListItemProps {
  investment: any;
}

export function MyRealEstateListItem({
  investment,
}: MyRealEstateListItemProps) {
  const { t: t } = useLanguage();
  const { removeRealEstateInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const handleRemove = async () => {
    try {
      await removeRealEstateInvestment(investment.id);
      toast({
        title: t("real_estate_removed"),
        description: `${investment.name || investment.propertyAddress} ${t(has_been_removed)}.`,
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
          <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
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
                {investment.propertyType || t("na")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {investment.propertyAddress}
              </p>
            </div>
          </div>
          <div
            className="text-end pl-2 flex flex-col items-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-bold text-lg">
              {formatNumberWithSuffix(investment.amountInvested)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="mb-1"
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
              className="ml-2 text-muted-foreground hover:text-destructive"
              onClick={() => setIsAlertDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">
                Remove {investment.name || investment.propertyAddress}
              </span>
            </Button>
            <AlertDialog
              open={isAlertDialogOpen}
              onOpenChange={setIsAlertDialogOpen}
            >
              <AlertDialogTrigger asChild></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("this_action_will_permanently_remove_your_record_for")}{" "}
                    {investment.name || investment.propertyAddress}
                    {t("this_cannot_be_undone")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
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
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
          <p>
            {t("installment")}{" "}
            {investment.installmentAmount
              ? `${formatNumberWithSuffix(investment.installmentAmount)}`
              : t("na")}
          </p>
          <p>
            {t("frequency")}
            {investment.installmentFrequency || t("na")}
          </p>
          <p>
            {t("total_price")}{" "}
            {investment.totalInstallmentPrice
              ? `${formatNumberWithSuffix(investment.totalInstallmentPrice)}`
              : t("na")}
          </p>
          <p>
            {t("end_date")}
            {investment.installmentEndDate || t("na")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
