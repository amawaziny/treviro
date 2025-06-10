"use client";

import Image from 'next/image';
import type { AggregatedGoldHolding } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gem, Coins, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
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
import { formatNumberWithSuffix } from '@/lib/utils';
interface MyGoldListItemProps {
  holding: AggregatedGoldHolding;
}

// Helper for buttonVariants in AlertDialogAction
const buttonVariants = ({ variant }: { variant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return ""; // Default or other variants can be handled by AlertDialog's default styling
};

// Helper for mobile: 6 digits for avg cost and market price, but not for invested amount or P/L
const formatCurrencyForGoldMobile = (value: number, currencyCode: string, digits = 2, isMobile = true) => {
  if (value === undefined || value === null || isNaN(value)) return `${currencyCode} 0.00`;
  
  // For mobile view, format with K/M suffixes
  if (isMobile && typeof window !== 'undefined' && window.innerWidth < 768) {
    if (Math.abs(value) >= 1000000) {
      return `${currencyCode} ${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${currencyCode} ${(value / 1000).toFixed(1)}K`;
    }
  }
  
  // Default formatting for desktop or small numbers
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
};


export function MyGoldListItem({ holding }: MyGoldListItemProps) {
  const { removeGoldInvestments } = useInvestments();
  const { toast } = useToast();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const {
    id,
    displayName,
    itemType,
    logoUrl,
    totalQuantity,
    averagePurchasePrice,
    totalCost,
    currentMarketPrice,
    currency,
    fundDetails, // present if itemType is 'fund'
    physicalGoldType // present if itemType is 'physical'
  } = holding;

  let profitLoss = 0;
  let profitLossPercent = 0;
  let isProfitable = false;
  let totalCurrentValue = 0;

  if (currentMarketPrice && totalQuantity > 0) {
    totalCurrentValue = currentMarketPrice * totalQuantity;
    profitLoss = totalCurrentValue - totalCost;
    if (totalCost > 0) {
      profitLossPercent = (profitLoss / totalCost) * 100;
    } else if (totalCurrentValue > 0) {
      profitLossPercent = Infinity; // All profit if cost was 0
    }
    isProfitable = profitLoss >= 0;
  }

  const formattedAvgPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    useGrouping: false,
  }).format(averagePurchasePrice);


  const formattedMarketPrice = currentMarketPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(currentMarketPrice)
    : 'N/A';

  const formattedProfitLoss = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(profitLoss);
  
  const quantityLabel = itemType === 'fund' ? 'Units' : 
                        (physicalGoldType === 'Pound' || physicalGoldType === 'Ounce' ? 'Units' : 'Grams');


  const handleRemove = async () => {
    try {
      if (itemType === 'physical' && physicalGoldType) {
        await removeGoldInvestments(physicalGoldType, 'physical');
      } else if (itemType === 'fund' && fundDetails?.symbol) {
        await removeGoldInvestments(fundDetails.symbol, 'fund');
      }
      toast({
        title: "Gold Holding Removed",
        description: `All investments in ${displayName} have been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Removing Gold Holding",
        description: error.message || `Could not remove ${displayName}.`,
        variant: "destructive",
      });
      console.error("Error removing gold holding:", error);
    }
    setIsAlertDialogOpen(false);
  };

  const detailPageLink = `/investments/gold/${id}`; // This page needs to be created

  const cardContent = (
    <CardContent className="pt-4">
      <div className="flex items-start justify-between gap-2 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-3 flex-grow min-w-0 w-0">
          <Link href={detailPageLink} passHref className="flex items-center gap-3 flex-grow min-w-0 hover:bg-muted/20 p-2 rounded-md -ml-2">
            {itemType === 'fund' && logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${displayName} logo`}
                width={40}
                height={40}
                className="rounded-full object-cover"
                data-ai-hint="fund logo"
              />
            ) : (
              <Gem className="h-10 w-10 text-amber-400" /> // Generic icon for physical gold
            )}
            <div className="truncate">
              <p className="text-base font-medium truncate">
                {itemType === 'fund' ? 
                  (fundDetails?.symbol || displayName) : 
                  (physicalGoldType || displayName)
                }
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {quantityLabel}: {totalQuantity.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits: 2})}
              </p>
            </div>
          </Link>
        </div>
        
        <div className="text-end pl-2">
          {currentMarketPrice !== undefined ? (
            <div className="flex flex-col items-end">
              <p className={cn("font-bold text-base", 
                              isProfitable ? 'text-accent' : 'text-destructive')}>
                  {formatCurrencyForGoldMobile(profitLoss, currency)}
              </p>

              <Badge variant={isProfitable ? 'default' : 'destructive'} 
                     className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {totalCost > 0 ? profitLossPercent.toFixed(2) + '%' : (totalCurrentValue > 0 ? '∞%' : '0.00%')}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Market N/A</p>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
        <p>Avg. Cost: 
          <span> {formatCurrencyForGoldMobile(averagePurchasePrice, currency, 6)}</span>
        </p>
        <p className="text-end">Market Price: 
          <span> {formatCurrencyForGoldMobile(currentMarketPrice || 0, currency, 6)}</span>
        </p>
      </div>
    </CardContent>
  );

  return (
    <Card className="hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      {cardContent}
    </Card>
  );
}

MyGoldListItem.displayName = 'MyGoldListItem';
