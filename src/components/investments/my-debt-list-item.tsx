
"use client";

import Image from 'next/image';
import type { AggregatedDebtHolding } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'; // Removed ScrollText, CalendarDays, Percent, Banknote
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
import { useInvestments } from '@/hooks/use-investments';
import { useToast } from '@/hooks/use-toast';
import React from 'react';


interface MyDebtListItemProps {
  holding: AggregatedDebtHolding; // This component now only expects fund-type holdings
}

const buttonVariants = ({ variant }: { variant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return "";
};

export function MyDebtListItem({ holding }: MyDebtListItemProps) {
  const { removeStockInvestmentsBySymbol } = useInvestments(); // Only need this for funds
  const { toast } = useToast();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const {
    id,
    displayName,
    fundDetails, // Expect fundDetails to be present
    totalUnits,
    averagePurchasePrice,
    currentMarketPrice,
    profitLoss,
    profitLossPercent,
    currency,
    logoUrl
  } = holding;

  if (holding.itemType !== 'fund' || !fundDetails) {
    // This component is now only for funds, render nothing or an error if misused
    console.warn("MyDebtListItem received non-fund data:", holding);
    return null;
  }

  const isProfitable = profitLoss !== undefined && profitLoss >= 0;

  const formatDisplayCurrency = (value: number | undefined, curr = "USD", digits = 2) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    const effectiveDigits = curr === "EGP" ? 2 : digits;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: effectiveDigits, maximumFractionDigits: effectiveDigits }).format(value);
  };

  const handleRemoveFund = async () => {
    if (fundDetails?.symbol) {
      try {
        await removeStockInvestmentsBySymbol(fundDetails.symbol);
        toast({ title: "Debt Fund Removed", description: `All investments in ${displayName} (${fundDetails.symbol}) have been removed.` });
      } catch (error: any) {
        toast({ title: "Error Removing Fund", description: error.message || `Could not remove ${displayName}.`, variant: "destructive" });
      }
    }
    setIsAlertDialogOpen(false);
  };
  
  const detailPageLink = `/stocks/${fundDetails.id}?previousTab=funds`; // Link to standard security detail page


  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            {logoUrl ? (
              <Link href={detailPageLink || "#"} passHref className={detailPageLink ? '' : 'pointer-events-none'}>
                <Image src={logoUrl} alt={`${displayName} logo`} width={40} height={40} className="rounded-full object-cover cursor-pointer" data-ai-hint="fund logo"/>
              </Link>
            ) : (
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-primary">
                <Building className="h-6 w-6" />
              </div>
            )}
            <div className="truncate">
               {detailPageLink ? (
                 <Link href={detailPageLink} passHref>
                    <p className="text-lg font-semibold truncate hover:underline cursor-pointer">{displayName}</p>
                 </Link>
               ) : (
                <p className="text-lg font-semibold truncate">{displayName}</p>
               )}
              <p className="text-xs text-muted-foreground truncate">
                {fundDetails.symbol} - Units: {totalUnits?.toLocaleString() ?? 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            {currentMarketPrice !== undefined && profitLoss !== undefined ? (
              <>
                <p className={cn("text-lg font-bold", isProfitable ? 'text-accent' : 'text-destructive')}>
                  {formatDisplayCurrency(profitLoss, currency, fundDetails?.currency === 'EGP' ? 2 : 3)}
                </p>
                <Badge variant={isProfitable ? 'default' : 'destructive'}
                       className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                  {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                  {profitLossPercent === Infinity ? '∞%' : (profitLossPercent?.toFixed(2) ?? 'N/A') + '%'}
                </Badge>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Market N/A</p>
            )}
          </div>
            <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-1 text-muted-foreground hover:text-destructive flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove {displayName}</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently remove all your investment records for {displayName}. This cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemoveFund} className={buttonVariants({variant: "destructive"})}>
                        Remove
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <p>Avg. Cost: {formatDisplayCurrency(averagePurchasePrice, currency, fundDetails?.currency === 'EGP' ? 2 : 3)}</p>
          <p>Market Price: {formatDisplayCurrency(currentMarketPrice, currency, fundDetails?.currency === 'EGP' ? 2 : 3)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

MyDebtListItem.displayName = 'MyDebtListItem';
