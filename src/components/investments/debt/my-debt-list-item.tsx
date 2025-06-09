"use client";

import Image from 'next/image';
import type { AggregatedDebtHolding } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'; 
import { cn, formatNumberWithSuffix } from '@/lib/utils';
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
  holding: AggregatedDebtHolding; 
}

const buttonVariants = ({ variant }: { variant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return "";
};

export function MyDebtListItem({ holding }: MyDebtListItemProps) {
  const { removeStockInvestmentsBySymbol } = useInvestments(); 
  const { toast } = useToast();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);


  const formatDisplayCurrency = (value: number | undefined, curr = "USD", digitsOverride?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    const digits = digitsOverride ?? (curr === 'EGP' ? 3 : 2);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  };

  const formatCurrencyForDebtMobile = (value: number | undefined, curr: string) => {
    if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
    return `${curr} ${formatNumberWithSuffix(value)}`;
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
    logoUrl
  } = holding;

  if (holding.itemType !== 'fund' || !holding.fundDetails) {
    // Render direct debt instrument (bonds, certificates, etc.)
    return (
      <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-primary flex-shrink-0">
                <Building className="h-4 w-4" />
              </div>
              <div className="truncate min-w-0 w-0">
                <p className="text-lg font-semibold truncate max-w-[120px] md:max-w-[200px]" title={holding.displayName}>
                  {holding.displayName ?
                    (holding.displayName.length > 16 ? holding.displayName.slice(0, 14) + '…' : holding.displayName)
                    : (typeof holding.amountInvested === 'number' ? `${holding.currency || 'EGP'} ${formatNumberWithSuffix(holding.amountInvested)}` : 'Debt Item')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {holding.debtSubType} {holding.issuer ? `- ${holding.issuer}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {typeof holding.amountInvested === 'number' ? (
                <p className="text-lg font-bold">
                  {(holding.currency || 'EGP')} {formatNumberWithSuffix(holding.amountInvested)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
            <p>Interest Rate: <span>{holding.interestRate ? `${holding.interestRate}%` : 'N/A'}</span></p>
            <p className="text-end">Maturity: <span>{holding.maturityDate || 'N/A'}</span></p>
            <p>Monthly Interest: <span>{typeof holding.projectedMonthlyInterest === 'number' ? `${holding.currency || 'EGP'} ${formatCurrencyForDebtMobile(holding.projectedMonthlyInterest, holding.currency || 'EGP')}` : 'N/A'}</span></p>
            <p className="text-end">Annual Interest: <span>{typeof holding.projectedAnnualInterest === 'number' ? `${holding.currency || 'EGP'} ${formatNumberWithSuffix(holding.projectedAnnualInterest)}` : 'N/A'}</span></p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const detailPageLink = fundDetails ? `/securities/details/${fundDetails.id}?previousTab=funds` : undefined;
  const isProfitable = profitLoss !== undefined && profitLoss >= 0;

  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
            {logoUrl ? (
              <Link href={detailPageLink || "#"} passHref className={detailPageLink ? '' : 'pointer-events-none'}>
                <Image src={logoUrl} alt={`${displayName} logo`} width={40} height={40} className="rounded-full object-cover cursor-pointer" data-ai-hint="fund logo"/>
              </Link>
            ) : (
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-primary">
                <Building className="h-4 w-4" />
              </div>
            )}
            <div className="truncate min-w-0 w-0">
               {detailPageLink ? (
                 <Link href={detailPageLink} passHref>
                    <p className="text-lg font-semibold truncate max-w-[120px] md:max-w-[200px]" title={displayName}>
  {displayName ? (displayName.length > 16 ? displayName.slice(0, 14) + '…' : displayName) : (typeof holding.amountInvested === 'number' ? `${currency || 'EGP'} ${formatNumberWithSuffix(holding.amountInvested)}` : 'Debt Item')}
</p>
                 </Link>
               ) : (
                <p className="text-lg font-semibold truncate max-w-[120px] md:max-w-[200px]" title={holding.displayName || ''}>
                  {typeof holding.amountInvested === 'number' ? `${holding.currency || 'EGP'} ${formatNumberWithSuffix(holding.amountInvested)}` : 'Debt Item'}
                </p>
               )}
              <p className="text-xs text-muted-foreground truncate">
                {fundDetails?.symbol} - Units: {totalUnits?.toLocaleString() ?? 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            {currentMarketPrice !== undefined && profitLoss !== undefined ? (
              <>
                <p className={cn("text-lg font-bold", isProfitable ? 'text-accent' : 'text-destructive')}>
 <span className="md:hidden">{formatCurrencyForDebtMobile(profitLoss, currency || "EGP")}</span>
 <span className="hidden md:inline">{formatDisplayCurrency(profitLoss, currency)}</span>
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
          <p>Avg. Cost: 
            <span className="md:hidden">{formatCurrencyForDebtMobile(averagePurchasePrice || 0, currency || "EGP")}</span>
 <span className="hidden md:inline">{formatDisplayCurrency(averagePurchasePrice || 0, currency, 6)}</span>
 </p>
          <p>Market Price: 
            <span className="md:hidden">{formatCurrencyForDebtMobile(currentMarketPrice, currency || "EGP")}</span>
 <span className="hidden md:inline">{formatDisplayCurrency(currentMarketPrice, currency)}</span>
 </p>
        </div>
      </CardContent>
    </Card>
  );
}

MyDebtListItem.displayName = 'MyDebtListItem';
