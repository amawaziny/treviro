
"use client";

import type { AggregatedCurrencyHolding } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Info } from 'lucide-react'; // Using DollarSign as a generic currency icon
import { cn } from '@/lib/utils';
import { formatNumberWithSuffix } from '@/lib/utils'; // Import the utility function
interface MyCurrencyListItemProps {
  holding: AggregatedCurrencyHolding;
}

export function MyCurrencyListItem({ holding }: MyCurrencyListItemProps) {
  const {
    currencyCode,
    totalForeignAmount,
    averagePurchaseRateToEGP,
    currentMarketRateToEGP,
    profitOrLossInEGP,
    profitOrLossPercentage,
  } = holding;

  const isProfitable = profitOrLossInEGP !== undefined && profitOrLossInEGP >= 0;
  const hasMarketRate = currentMarketRateToEGP !== undefined && currentMarketRateToEGP !== null;

  const formatCurrency = (value: number | undefined, currency = "EGP") => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatCurrencyForCurrencyMobile = (value: number | undefined, currency = "EGP") => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    return `${currency} ${formatNumberWithSuffix(value)}`;
  };

  const formatAmount = (value: number | undefined) => {
      if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
      return value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

  const formatRate = (value: number | undefined) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    return value.toFixed(4);
  };

  const formattedProfitLoss = formatCurrency(profitOrLossInEGP);
  const displayProfitLossPercent = profitOrLossPercentage === Infinity ? "∞" : (profitOrLossPercentage !== undefined ? profitOrLossPercentage.toFixed(2) + '%' : 'N/A');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="truncate">
              <p className="text-lg font-semibold truncate">{currencyCode}</p>
              <p className="text-xs text-muted-foreground truncate md:hidden">
                Held: {formatNumberWithSuffix(totalForeignAmount || 0)} {currencyCode}
              </p>
              <p className="text-xs text-muted-foreground truncate hidden md:block">
                Held: {formatAmount(totalForeignAmount)} {currencyCode}
              </p>
            </div>
          </div>
          
          <div className="text-right pl-2">
            {hasMarketRate && profitOrLossInEGP !== undefined ? (
              <>
                <p className={cn("text-lg font-bold", isProfitable ? 'text-accent' : 'text-destructive')}>
 <span className="md:hidden">
 {formatCurrencyForCurrencyMobile(profitOrLossInEGP)} 
 </span>
 <span className="hidden md:inline" data-ai-hint="Display profit/loss for larger screens">{formattedProfitLoss}</span>
                </p>
                <Badge variant={isProfitable ? 'default' : 'destructive'} 
                       className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                  {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                  {displayProfitLossPercent}
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Info className="h-3 w-3" /> Market N/A
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <p>Avg. Buy Rate: <span className="font-medium text-foreground">{formatRate(averagePurchaseRateToEGP)} EGP</span></p>
          <p>Market Rate: <span className="font-medium text-foreground">{hasMarketRate ? formatRate(currentMarketRateToEGP) + ' EGP' : 'N/A'}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

MyCurrencyListItem.displayName = 'MyCurrencyListItem';
