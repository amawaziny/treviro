
"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useListedSecurities } from '@/hooks/use-listed-securities'; // Updated hook
import type { ListedSecurity } from '@/lib/types'; // For current market price
import Link from 'next/link';

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
  
  // Find the corresponding listed security to get its current market price and type
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
    profitLossPercent = (profitLoss / totalCost) * 100;
    isProfitable = profitLoss >= 0;
  }

  const formattedAvgPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(averagePurchasePrice);
  const formattedMarketPrice = currentMarketPrice ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(currentMarketPrice) : 'N/A';
  const formattedProfitLoss = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, signDisplay: 'always' }).format(profitLoss);
  
  const sharesLabel = isFund ? 'Units' : 'Shares';

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
            data-ai-hint={isFund ? "logo fund" : "logo company"}
          />
          <div>
            <CardTitle className="text-lg">{name} {isFund && fundType ? <span className="text-sm text-primary">({fundType})</span> : ''}</CardTitle>
            <CardDescription>{symbol} - {sharesLabel}: {totalShares.toLocaleString()}</CardDescription>
          </div>
        </div>
        <div className="text-right">
          {isLoadingListedSecurities && !currentMarketPrice ? (
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

  const securityDetailLink = correspondingListedSecurity ? `/stocks/${correspondingListedSecurity.id}` : undefined;

  if (securityDetailLink) {
    return (
      <Link href={securityDetailLink} passHref>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          {cardContent}
        </Card>
      </Link>
    );
  }

  return <Card>{cardContent}</Card>;
}
