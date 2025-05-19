
"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useListedStocks } from '@/hooks/use-listed-stocks'; // To get current market price
import Link from 'next/link';

interface MyStockListItemProps {
  symbol: string;
  name: string;
  logoUrl: string;
  totalShares: number;
  averagePurchasePrice: number;
  // listedStockId?: string; // Optional: to link to the stock detail page
}

export function MyStockListItem({
  symbol,
  name,
  logoUrl,
  totalShares,
  averagePurchasePrice,
  // listedStockId,
}: MyStockListItemProps) {
  const { listedStocks, isLoading: isLoadingListedStocks } = useListedStocks();
  
  const correspondingListedStock = listedStocks.find(ls => ls.symbol === symbol);
  const currentMarketPrice = correspondingListedStock?.price;
  const currency = correspondingListedStock?.currency || 'USD';

  let profitLoss = 0;
  let profitLossPercent = 0;
  let isProfitable = false;

  if (currentMarketPrice && totalShares > 0 && averagePurchasePrice > 0) {
    const totalCurrentValue = currentMarketPrice * totalShares;
    const totalCost = averagePurchasePrice * totalShares;
    profitLoss = totalCurrentValue - totalCost;
    profitLossPercent = (profitLoss / totalCost) * 100;
    isProfitable = profitLoss >= 0;
  }

  const formattedAvgPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(averagePurchasePrice);
  const formattedMarketPrice = currentMarketPrice ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(currentMarketPrice) : 'N/A';
  const formattedProfitLoss = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, signDisplay: 'always' }).format(profitLoss);
  
  const cardContent = (
    <CardContent className="pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={logoUrl}
            alt={`${name} logo`}
            width={40}
            height={40}
            className="rounded-full object-cover"
            data-ai-hint="logo company"
          />
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription>{symbol} - Shares: {totalShares.toLocaleString()}</CardDescription>
          </div>
        </div>
        <div className="text-right">
          {isLoadingListedStocks ? (
            <p className="text-sm text-muted-foreground">Loading market data...</p>
          ) : currentMarketPrice !== undefined ? (
            <>
              <p className={`text-xl font-bold ${isProfitable ? 'text-accent' : 'text-destructive'}`}>
                {formattedProfitLoss}
              </p>
              <Badge variant={isProfitable ? 'default' : 'destructive'} 
                     className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {profitLossPercent.toFixed(2)}%
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Market price N/A</p>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
        <p>Avg. Purchase Price: {formattedAvgPrice}</p>
        <p>Current Market Price: {formattedMarketPrice}</p>
      </div>
    </CardContent>
  );

  // Link to stock detail page if listedStockId is available (and corresponds to a listed stock)
  const stockDetailLink = correspondingListedStock ? `/stocks/${correspondingListedStock.id}` : undefined;

  if (stockDetailLink) {
    return (
      <Link href={stockDetailLink} passHref>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          {cardContent}
        </Card>
      </Link>
    );
  }

  return <Card>{cardContent}</Card>;
}
