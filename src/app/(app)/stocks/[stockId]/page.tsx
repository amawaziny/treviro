
"use client";

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useListedStocks } from '@/hooks/use-listed-stocks';
import type { ListedStock, StockInvestment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LineChart, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Loader2, Briefcase } from 'lucide-react';
import { StockDetailChart } from '@/components/stocks/stock-detail-chart';
import { useInvestments } from '@/hooks/use-investments';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stockId = params.stockId as string;

  const { getListedStockById, isLoading: isLoadingListedStocks } = useListedStocks();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  
  const [stock, setStock] = useState<ListedStock | null | undefined>(null); // undefined for not yet fetched, null for not found

  useEffect(() => {
    if (stockId) {
      getListedStockById(stockId).then(data => {
        setStock(data || null);
      });
    }
  }, [stockId, getListedStockById]);

  const userOwnedStocks = React.useMemo(() => 
    investments.filter(inv => inv.type === 'Stocks' && inv.tickerSymbol === stock?.symbol) as StockInvestment[],
    [investments, stock]
  );

  const totalSharesOwned = React.useMemo(() =>
    userOwnedStocks.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0),
    [userOwnedStocks]
  );

  const averagePurchasePrice = React.useMemo(() => {
    if (totalSharesOwned === 0) return 0;
    const totalCost = userOwnedStocks.reduce((sum, inv) => sum + (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0), 0);
    return totalCost / totalSharesOwned;
  }, [userOwnedStocks, totalSharesOwned]);

  const hasPosition = totalSharesOwned > 0;

  if (isLoadingListedStocks || isLoadingInvestments || stock === undefined) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading stock details...</p>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Stock Not Found</h1>
        <p className="text-muted-foreground mb-6">The stock you are looking for could not be found.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const currentMarketPrice = stock.price;
  const totalInvestmentValue = totalSharesOwned * currentMarketPrice;
  const totalCostBasis = totalSharesOwned * averagePurchasePrice;
  const PnL = totalInvestmentValue - totalCostBasis;
  const PnLPercentage = totalCostBasis > 0 ? (PnL / totalCostBasis) * 100 : 0;
  const isProfitable = PnL >= 0;


  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stocks
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={stock.logoUrl} alt={stock.name} data-ai-hint="logo company"/>
              <AvatarFallback>{stock.symbol.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold">{stock.name} ({stock.symbol})</CardTitle>
              <CardDescription>{stock.market} - {stock.currency}</CardDescription>
            </div>
          </div>
          <div className="text-right">
             <p className="text-2xl font-bold">{currentMarketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             <p className={cn("text-sm", stock.changePercent >= 0 ? "text-accent" : "text-destructive")}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
             </p>
          </div>
        </CardHeader>
        <CardContent className="flex justify-end space-x-2 pb-4">
           <Link href={`/investments/add?stockId=${stock.id}`} passHref>
             <Button variant="default">
               <ShoppingCart className="mr-2 h-4 w-4" /> Buy
             </Button>
           </Link>
          {hasPosition && (
            <Button variant="outline"> {/* Selling functionality coming soon */}
              <DollarSign className="mr-2 h-4 w-4" /> Sell
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="performance">
            <LineChart className="mr-2 h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="position" disabled={!hasPosition}>
            <Briefcase className="mr-2 h-4 w-4" /> My Position
          </TabsTrigger>
        </TabsList>
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>Mock data. Shows stock price over various time ranges.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <StockDetailChart stockSymbol={stock.symbol} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="position">
          <Card>
            <CardHeader>
              <CardTitle>My Position in {stock.name}</CardTitle>
              <CardDescription>Overview of your investment in this stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasPosition ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-muted-foreground">Total Shares:</span> {totalSharesOwned.toLocaleString()}</div>
                    <div><span className="font-medium text-muted-foreground">Avg. Purchase Price:</span> {averagePurchasePrice.toLocaleString(undefined, { style: 'currency', currency: stock.currency })}</div>
                    <div><span className="font-medium text-muted-foreground">Total Cost Basis:</span> {totalCostBasis.toLocaleString(undefined, { style: 'currency', currency: stock.currency })}</div>
                    <div><span className="font-medium text-muted-foreground">Current Market Price:</span> {currentMarketPrice.toLocaleString(undefined, { style: 'currency', currency: stock.currency })}</div>
                    <div><span className="font-medium text-muted-foreground">Total Current Value:</span> {totalInvestmentValue.toLocaleString(undefined, { style: 'currency', currency: stock.currency })}</div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-lg font-semibold">Profit / Loss:</p>
                    <div className="text-right">
                        <p className={cn("text-2xl font-bold", isProfitable ? "text-accent" : "text-destructive")}>
                            {PnL.toLocaleString(undefined, { style: 'currency', currency: stock.currency, signDisplay: 'always' })}
                        </p>
                        <Badge variant={isProfitable ? 'default' : 'destructive'} 
                               className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                            {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                            {PnLPercentage.toFixed(2)}%
                        </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">You do not have a position in this stock.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
