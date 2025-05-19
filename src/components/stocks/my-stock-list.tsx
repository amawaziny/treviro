
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import type { StockInvestment } from '@/lib/types';
import { MyStockListItem } from './my-stock-list-item';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";


export function MyStockList() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();

  const stockInvestments = React.useMemo(() => {
    return investments.filter(inv => inv.type === 'Stocks') as StockInvestment[];
  }, [investments]);

  if (isLoadingInvestments) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (stockInvestments.length === 0) {
    return (
      <Alert>
        <LineChart className="h-4 w-4" />
        <AlertTitle>No Stock Investments Yet!</AlertTitle>
        <AlertDescription>
          You haven't added any stock investments to your portfolio.
          <Button asChild variant="link" className="px-1">
            <Link href="/investments/add?type=Stocks">Add your first stock</Link>
          </Button>
           or browse available stocks via the "+" button.
        </AlertDescription>
      </Alert>
    );
  }

  // Group investments by ticker symbol to aggregate
  const aggregatedStocks: { [key: string]: { investments: StockInvestment[], totalShares: number, totalCost: number, logoUrl?: string, actualStockName?: string } } = {};

  stockInvestments.forEach(inv => {
    if (inv.tickerSymbol) {
      if (!aggregatedStocks[inv.tickerSymbol]) {
        aggregatedStocks[inv.tickerSymbol] = { 
            investments: [], 
            totalShares: 0, 
            totalCost: 0, 
            logoUrl: inv.stockLogoUrl,
            actualStockName: inv.actualStockName
        };
      }
      aggregatedStocks[inv.tickerSymbol].investments.push(inv);
      aggregatedStocks[inv.tickerSymbol].totalShares += inv.numberOfShares || 0;
      aggregatedStocks[inv.tickerSymbol].totalCost += (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0);
    }
  });


  return (
    <div className="space-y-4">
      {Object.entries(aggregatedStocks).map(([tickerSymbol, data]) => {
        const avgPurchasePrice = data.totalShares > 0 ? data.totalCost / data.totalShares : 0;
        // Find a representative stock item for details like logo, name, ID for linking
        // Prefer a listed stock that matches this symbol for linking to its detail page
        // This part needs to connect to listedStocks to get the ID for the link.
        // For now, MyStockListItem might not link to detail or link differently.
        // Let's assume MyStockListItem takes aggregated data.
         const representativeInvestment = data.investments[0];


        return (
          <MyStockListItem
            key={tickerSymbol}
            symbol={tickerSymbol}
            name={data.actualStockName || tickerSymbol}
            logoUrl={data.logoUrl || 'https://placehold.co/40x40.png'}
            totalShares={data.totalShares}
            averagePurchasePrice={avgPurchasePrice}
            // Pass a stock ID if available to link to detail page
            // This requires finding the corresponding ListedStock ID.
            // For now, we'll omit direct linking from MyStockListItem to StockDetail.
            // listedStockId={findListedStockIdBySymbol(tickerSymbol)} // Placeholder for logic
          />
        );
      })}
    </div>
  );
}
