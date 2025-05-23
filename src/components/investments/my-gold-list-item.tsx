"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils'; // Assuming formatCurrency is in utils
import Link from 'next/link';
import type { GoldInvestment } from '@/lib/types'; // Assuming a GoldInvestment type exists

interface MyGoldListItemProps {
  holding: GoldInvestment; // Use the specific type for gold
}

export function MyGoldListItem({ holding }: MyGoldListItemProps) {
  // This component will display summary information about a gold holding.
  // It will also be a link to the detail page.

  // Determine the display name and details based on whether it's direct gold or a gold fund
  const name = holding.securityType === 'Fund' ? holding.actualStockName || holding.symbol : 'Physical Gold';
  const details = holding.securityType === 'Fund' ? `Shares: ${holding.numberOfShares || 0}` : `Weight: ${holding.weight} ${holding.weightUnit}`; // Assuming weight and weightUnit exist for physical gold

  // TODO: Calculate current value and profit/loss if market data is available
  const currentValue = 'N/A'; // Placeholder
  const profitLoss = 'N/A'; // Placeholder
  const profitLossColor = 'text-muted-foreground'; // Placeholder for color based on profit/loss

  return (
    <Link href={`/investments/gold/${holding.id}`} passHref>
      <Card className="cursor-pointer hover:bg-accent/50">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{details}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Value:</span>
            <span>{currentValue}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit/Loss:</span>
            <span className={profitLossColor}>{profitLoss}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
