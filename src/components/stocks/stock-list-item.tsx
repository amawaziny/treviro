"use client";

import Image from 'next/image';
import type { ListedStock } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react'; // Import React

interface StockListItemProps {
  stock: ListedStock;
}

// Memoize StockListItem
export const StockListItem = React.memo(function StockListItem({ stock }: StockListItemProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(stock.price);

  const isPositiveChange = stock.changePercent >= 0;

  return (
    <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer rounded-lg shadow-sm">
      <div className="flex flex-col items-start">
        <Badge
          variant={isPositiveChange ? 'default' : 'destructive'}
          className={cn(
            isPositiveChange ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground',
            "mb-1 text-xs"
          )}
        >
          {isPositiveChange ? '+' : ''}
          {stock.changePercent.toFixed(2)}%
        </Badge>
        <p className="text-lg font-semibold text-foreground">
          {formattedPrice}
          <span className="ml-1 text-xs text-muted-foreground">{stock.currency}</span>
        </p>
      </div>
      <div className="flex items-center text-right">
        <div className="mr-3">
          <p className="font-semibold text-sm text-foreground">{stock.name}</p>
          <p className="text-xs text-muted-foreground">{stock.symbol} - {stock.market.toUpperCase()}</p>
        </div>
        <Image
          src={stock.logoUrl || 'https://placehold.co/40x40.png'}
          alt={`${stock.name} logo`}
          width={40}
          height={40}
          className="rounded-full object-cover"
          data-ai-hint="logo company"
        />
      </div>
    </Card>
  );
});
StockListItem.displayName = 'StockListItem'; // Optional: for better debugging