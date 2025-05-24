
"use client";

import Image from 'next/image';
import type { AggregatedDebtHolding } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText, TrendingUp, TrendingDown, Trash2, CalendarDays, Percent, Banknote, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
// import Link from 'next/link'; // Detail page link not yet implemented for direct debt
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
import Link from 'next/link';


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
  const { removeDirectDebtInvestment, removeStockInvestmentsBySymbol } = useInvestments();
  const { toast } = useToast();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const {
    id,
    itemType,
    displayName,
    debtSubType,
    issuer,
    interestRate,
    maturityDate,
    amountInvested, 
    purchaseDate,
    fundDetails,
    totalUnits,
    averagePurchasePrice,
    totalCost, 
    currentMarketPrice,
    currentValue,
    profitLoss,
    profitLossPercent,
    currency,
    logoUrl
  } = holding;

  const isFund = itemType === 'fund';
  const isProfitable = isFund && profitLoss !== undefined && profitLoss >= 0;

  const formatDisplayCurrency = (value: number | undefined, curr = "USD", digits = 2) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    // Ensure EGP uses 2 decimal places, others can use more if needed (like for funds)
    const effectiveDigits = curr === "EGP" ? 2 : digits;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: effectiveDigits, maximumFractionDigits: effectiveDigits }).format(value);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString + "T00:00:00").toLocaleDateString();
  };

  const handleRemove = async () => {
    try {
      if (itemType === 'direct') {
        await removeDirectDebtInvestment(id);
        toast({ title: "Debt Instrument Removed", description: `${displayName} has been removed.` });
      } else if (itemType === 'fund' && fundDetails?.symbol) {
        await removeStockInvestmentsBySymbol(fundDetails.symbol);
        toast({ title: "Debt Fund Removed", description: `All investments in ${displayName} (${fundDetails.symbol}) have been removed.`});
      }
    } catch (error: any) {
      toast({ title: "Error Removing Item", description: error.message || `Could not remove ${displayName}.`, variant: "destructive" });
    }
    setIsAlertDialogOpen(false);
  };
  
  // Link to fund detail page if it's a fund and details are available
  const detailPageLink = isFund && fundDetails ? `/stocks/${fundDetails.id}?previousTab=debt-instruments` : undefined;


  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            {isFund && logoUrl ? (
              <Link href={detailPageLink || "#"} passHref className={detailPageLink ? '' : 'pointer-events-none'}>
                <Image src={logoUrl} alt={`${displayName} logo`} width={40} height={40} className="rounded-full object-cover cursor-pointer" data-ai-hint="fund logo" />
              </Link>
            ) : (
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-primary">
                <ScrollText className="h-6 w-6" />
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
              {isFund && fundDetails && (
                <p className="text-xs text-muted-foreground truncate">
                  {fundDetails.symbol} - Units: {totalUnits?.toLocaleString() ?? 'N/A'}
                </p>
              )}
              {!isFund && debtSubType && (
                 <p className="text-xs text-muted-foreground truncate">
                  {debtSubType} {issuer ? `- ${issuer}` : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            {isFund && currentMarketPrice !== undefined && profitLoss !== undefined ? (
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
            ) : !isFund && amountInvested !== undefined ? (
                <p className="text-lg font-bold">{formatDisplayCurrency(amountInvested, 'EGP')}</p> 
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
                        This action will permanently remove your investment record for {displayName}. This cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} className={buttonVariants({variant: "destructive"})}>
                        Remove
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

        {isFund && (
          <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
            <p>Avg. Cost: {formatDisplayCurrency(averagePurchasePrice, currency, fundDetails?.currency === 'EGP' ? 2 : 3)}</p>
            <p>Market Price: {formatDisplayCurrency(currentMarketPrice, currency, fundDetails?.currency === 'EGP' ? 2 : 3)}</p>
          </div>
        )}
        {!isFund && (
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5 text-primary/70" /> Interest Rate: <span className="font-medium text-foreground">{interestRate?.toFixed(2) ?? 'N/A'}%</span></div>
            <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary/70" /> Purchase: <span className="font-medium text-foreground">{formatDate(purchaseDate)}</span></div>
            <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary/70" /> Maturity: <span className="font-medium text-foreground">{formatDate(maturityDate)}</span></div>
            {issuer && <div className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-primary/70" /> Issuer: <span className="font-medium text-foreground">{issuer}</span></div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

MyDebtListItem.displayName = 'MyDebtListItem';
