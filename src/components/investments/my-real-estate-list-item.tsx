"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { formatNumberWithSuffix } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface MyRealEstateListItemProps {
  investment: any;
}

export function MyRealEstateListItem({ investment }: MyRealEstateListItemProps) {
  const { removeRealEstateInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const handleRemove = async () => {
    try {
      await removeRealEstateInvestment(investment.id);
      toast({
        title: "Real Estate Removed",
        description: `${investment.name || investment.propertyAddress} has been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Removing Real Estate",
        description: error.message || `Could not remove ${investment.name || investment.propertyAddress}.`,
        variant: "destructive",
      });
    }
    setIsAlertDialogOpen(false);
  };

  const handleNavigateToDetails = () => {
    router.push(`/investments/real-estate/details/${investment.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden cursor-pointer" onClick={handleNavigateToDetails}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
            <Button variant="ghost" size="icon" className="text-primary bg-muted/30" disabled>
              <Home className="h-8 w-8" />
            </Button>
            <div className="truncate">
              <p className="text-lg font-semibold truncate">{investment.name || investment.propertyAddress}</p>
              <p className="text-xs text-muted-foreground truncate">{investment.propertyType || "N/A"}</p>
              <p className="text-xs text-muted-foreground truncate">{investment.propertyAddress}</p>
            </div>
          </div>
          <div className="text-right pl-2 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <span className="font-bold text-lg">EGP {formatNumberWithSuffix(investment.amountInvested)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="mb-1"
              aria-label="Edit"
              onClick={() => router.push(`/investments/real-estate/edit/${investment.id}`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:text-destructive" onClick={() => setIsAlertDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove {investment.name || investment.propertyAddress}</span>
            </Button>
            <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
              <AlertDialogTrigger asChild></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently remove your record for {investment.name || investment.propertyAddress}. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
          <p>Installment: {investment.installmentAmount ? `EGP ${formatNumberWithSuffix(investment.installmentAmount)}` : 'N/A'}</p>
          <p>Frequency: {investment.installmentFrequency || 'N/A'}</p>
          <p>Total Price: {investment.totalInstallmentPrice ? `EGP ${formatNumberWithSuffix(investment.totalInstallmentPrice)}` : 'N/A'}</p>
          <p>End Date: {investment.installmentEndDate || 'N/A'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
