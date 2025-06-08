"use client";

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import type { ListedSecurity, StockInvestment } from '@/lib/types';
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
import { formatNumberWithSuffix } from '@/lib/utils';
import { useInvestments } from '@/hooks/use-investments';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

interface MyStockListItemProps {
  symbol: string;
  name: string;
  logoUrl: string;
  totalShares: number;
  averagePurchasePrice: number;
}

export function MyStockListItem({
  symbol,
  name,
  logoUrl,
  totalShares,
  averagePurchasePrice,
}: MyStockListItemProps) {
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();
  
  const correspondingListedSecurity = listedSecurities.find(ls => ls.symbol === symbol);
  const currentMarketPrice = correspondingListedSecurity?.price;
  const currency = correspondingListedSecurity?.currency || 'USD';
  const isFund = correspondingListedSecurity?.securityType === 'Fund';
  const fundType = correspondingListedSecurity?.fundType;

  let profitLoss = 0;
  let profitLossPercent = 0;
  let isProfitable = false;

  if (currentMarketPrice && totalShares > 0 && averagePurchasePrice > 0) {
    const totalCurrentValue = currentMarketPrice * totalShares;
    const totalCost = averagePurchasePrice * totalShares;
    profitLoss = totalCurrentValue - totalCost;
    profitLossPercent = (totalCost > 0) ? (profitLoss / totalCost) * 100 : (totalCurrentValue > 0 ? Infinity : 0);
    isProfitable = profitLoss >= 0;
  }

  const formatCurrencyWithThreeDecimals = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };
  
  const formatCurrencyWithSixDecimals = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(value);
  };
  
   const formatCurrencyWithSuffixForMobile = (value: number, currencyCode: string) => {
    if (value === undefined || value === null || isNaN(value)) return `${currencyCode} 0`;
    const formattedNumber = formatNumberWithSuffix(value);
    // Prepend currency code and handle potential negative sign from suffix formatting
    const sign = formattedNumber.startsWith('-') ? '-' : '';
    const numberPart = sign === '-' ? formattedNumber.substring(1) : formattedNumber;
    return `${sign}${currencyCode} ${numberPart}`;
  };

  const formattedAvgPrice = formatCurrencyWithSixDecimals(averagePurchasePrice, currency);
  const formattedMarketPrice = currentMarketPrice ? formatCurrencyWithThreeDecimals(currentMarketPrice, currency) : 'N/A';
  const formattedProfitLoss = formatCurrencyWithThreeDecimals(profitLoss, currency);
  
  const sharesLabel = isFund ? 'Units' : 'Shares';


  const cardContent = (
    <CardContent className="pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-grow min-w-0">
          {correspondingListedSecurity ? (
             <Link href={`/securities/details/${correspondingListedSecurity.id}`} passHref className="flex items-center gap-3 flex-grow min-w-0 hover:bg-muted/20 p-2 rounded-md -ml-2">
                <Image
                  src={logoUrl}
                  alt={`${name} logo`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  data-ai-hint={isFund ? "logo fund" : "logo company"}
                />
                <div className="truncate">
                  <p className="text-lg font-semibold truncate">{name} {isFund && fundType ? <span className="text-sm text-primary">({fundType})</span> : ''}</p>
                  <p className="text-xs text-muted-foreground truncate">{symbol} - {sharesLabel}: {totalShares.toLocaleString()}</p>
                </div>
             </Link>
          ) : (
             <div className="flex items-center gap-3 flex-grow min-w-0 p-2 rounded-md -ml-2">
                <Image
                  src={logoUrl}
                  alt={`${name} logo`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                  data-ai-hint={isFund ? "logo fund" : "logo company"}
                />
                <div className="truncate">
                  <p className="text-lg font-semibold truncate">{name} {isFund && fundType ? <span className="text-sm text-primary">({fundType})</span> : ''}</p>
                  <p className="text-xs text-muted-foreground truncate">{symbol} - {sharesLabel}: {totalShares.toLocaleString()}</p>
                </div>
            </div>
          )}
        </div>
        
        <div className="text-right pl-2">
          {isLoadingListedSecurities && !currentMarketPrice ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : currentMarketPrice !== undefined ? (
            <>
              <p className={`text-lg font-bold ${isProfitable ? 'text-accent' : 'text-destructive'} md:hidden`}>
                {formatCurrencyWithSuffixForMobile(profitLoss, currency)}
              </p>
               <p className={`text-lg font-bold ${isProfitable ? 'text-accent' : 'text-destructive'} hidden md:block`}>
                {formattedProfitLoss}
              </p>
              <Badge variant={isProfitable ? 'default' : 'destructive'} 
                     className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {profitLossPercent === Infinity ? '∞%' : profitLossPercent.toFixed(2) + '%'}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Market N/A</p>
          )}
        </div>
 
      </div>
      <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
        <p>Avg. Purchase Price: 
            <span className="md:hidden ml-1">{formatCurrencyWithSuffixForMobile(averagePurchasePrice, currency)}</span>
            <span className="hidden md:inline ml-1">{formattedAvgPrice}</span>
        </p>
        <p>Current Market Price: 
           {currentMarketPrice !== undefined ? (
             <>
               <span className="md:hidden ml-1">{formatCurrencyWithSuffixForMobile(currentMarketPrice, currency)}</span>
               <span className="hidden md:inline ml-1">{formattedMarketPrice}</span>
             </>
           ) : <span className="ml-1">N/A</span>}
        </p>
      </div>
    </CardContent>
  );


  // The Card itself is no longer a Link, the link is now within the content if security is found.
  return (
    <Card className="hover:shadow-md transition-shadow">
      {cardContent}
    </Card>
  );
}

MyStockListItem.displayName = 'MyStockListItem';
