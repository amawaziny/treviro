
"use client";

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useListedSecurities } from '@/hooks/use-listed-securities'; 
import type { ListedSecurity, StockInvestment } from '@/lib/types'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LineChart, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Loader2, Briefcase, Edit3 } from 'lucide-react';
import { StockDetailChart } from '@/components/stocks/stock-detail-chart'; 
import { useInvestments } from '@/hooks/use-investments';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function SecurityDetailPage() { 
  const params = useParams();
  const router = useRouter();
  const securityId = params.stockId as string; 

  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities(); 
  const { investments, isLoading: isLoadingInvestments, transactions } = useInvestments();
  
  const [security, setSecurity] = useState<ListedSecurity | null | undefined>(null); 

  useEffect(() => {
    if (securityId) {
      getListedSecurityById(securityId).then(data => {
        setSecurity(data || null);
      });
    }
  }, [securityId, getListedSecurityById]);

  
  const userOwnedSecurities = React.useMemo(() => 
    investments.filter(inv => inv.type === 'Stocks' && inv.tickerSymbol === security?.symbol) as StockInvestment[],
    [investments, security]
  );

  const totalSharesOwned = React.useMemo(() =>
    userOwnedSecurities.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0),
    [userOwnedSecurities]
  );

  const averagePurchasePrice = React.useMemo(() => {
    if (totalSharesOwned === 0) return 0;
    const totalCost = userOwnedSecurities.reduce((sum, inv) => sum + (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0), 0);
    return totalCost / totalSharesOwned;
  }, [userOwnedSecurities, totalSharesOwned]);

  const hasPosition = totalSharesOwned > 0;

  const securityTransactions = React.useMemo(() => {
    if (!security) return [];
    
    const buyTransactions = investments
      .filter(inv => inv.type === 'Stocks' && inv.tickerSymbol === security.symbol)
      .map(inv => ({
        id: inv.id,
        date: inv.purchaseDate,
        type: 'Buy' as 'Buy' | 'Sell', // Type assertion
        shares: (inv as StockInvestment).numberOfShares || 0,
        price: (inv as StockInvestment).purchasePricePerShare || 0,
        fees: (inv as StockInvestment).purchaseFees || 0,
        total: inv.amountInvested,
        isInvestmentRecord: true, 
      }));

    const sellTransactions = transactions
      .filter(tx => tx.tickerSymbol === security.symbol && tx.type === 'sell')
      .map(tx => ({
        id: tx.id,
        date: tx.date,
        type: 'Sell' as 'Buy' | 'Sell', // Type assertion
        shares: tx.numberOfShares,
        price: tx.pricePerShare,
        fees: tx.fees,
        total: tx.totalAmount,
        profitOrLoss: tx.profitOrLoss,
        isInvestmentRecord: false,
      }));

    return [...buyTransactions, ...sellTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [investments, transactions, security]);


  if (isLoadingListedSecurities || isLoadingInvestments || security === undefined) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading security details...</p>
      </div>
    );
  }

  if (!security) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Security Not Found</h1>
        <p className="text-muted-foreground mb-6">The security you are looking for could not be found.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const currentMarketPrice = security.price;
  const totalInvestmentValue = totalSharesOwned * currentMarketPrice;
  const totalCostBasis = totalSharesOwned * averagePurchasePrice;
  const PnL = totalInvestmentValue - totalCostBasis;
  const PnLPercentage = totalCostBasis > 0 ? (PnL / totalCostBasis) * 100 : 0;
  const isProfitable = PnL >= 0;

  const pageTitle = security.securityType === 'Fund' 
    ? `${security.name} (${security.symbol}) - ${security.fundType}`
    : `${security.name} (${security.symbol})`;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Securities
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={security.logoUrl} alt={security.name} data-ai-hint={security.securityType === 'Fund' ? "logo fund" : "logo company"}/>
              <AvatarFallback>{security.symbol.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold">{pageTitle}</CardTitle>
              <CardDescription>{security.market} - {security.currency}</CardDescription>
            </div>
          </div>
          <div className="text-right">
             <p className="text-2xl font-bold">{currentMarketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             <p className={cn("text-sm", security.changePercent >= 0 ? "text-accent" : "text-destructive")}>
                {security.changePercent >= 0 ? '+' : ''}{security.changePercent.toFixed(2)}%
             </p>
          </div>
        </CardHeader>
        <CardContent className="flex justify-end space-x-2 pb-4">
           <Link href={`/investments/add?stockId=${security.id}`} passHref> 
             <Button variant="default">
               <ShoppingCart className="mr-2 h-4 w-4" /> Buy
             </Button>
           </Link>
          {hasPosition && (
            <Link href={`/investments/sell-stock/${security.id}`} passHref> 
              <Button variant="outline"> 
                <DollarSign className="mr-2 h-4 w-4" /> Sell
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 md:w-[500px]">
          <TabsTrigger value="performance">
            <LineChart className="mr-2 h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="position" disabled={!hasPosition}>
            <Briefcase className="mr-2 h-4 w-4" /> My Position
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Briefcase className="mr-2 h-4 w-4" /> Transactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>Daily closing prices from admin-entered data.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <StockDetailChart securityId={security.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="position">
          <Card>
            <CardHeader>
              <CardTitle>My Position in {security.name}</CardTitle>
              <CardDescription>Overview of your investment in this security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasPosition ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-muted-foreground">Total {security.securityType === 'Fund' ? 'Units' : 'Shares'}:</span> {totalSharesOwned.toLocaleString()}</div>
                    <div><span className="font-medium text-muted-foreground">Avg. Purchase Price:</span> {averagePurchasePrice.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</div>
                    <div><span className="font-medium text-muted-foreground">Total Cost Basis:</span> {totalCostBasis.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</div>
                    <div><span className="font-medium text-muted-foreground">Current Market Price:</span> {currentMarketPrice.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</div>
                    <div><span className="font-medium text-muted-foreground">Total Current Value:</span> {totalInvestmentValue.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-lg font-semibold">Profit / Loss:</p>
                    <div className="text-right">
                        <p className={cn("text-2xl font-bold", isProfitable ? "text-accent" : "text-destructive")}>
                            {PnL.toLocaleString(undefined, { style: 'currency', currency: security.currency, signDisplay: 'always' })}
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
                <p className="text-muted-foreground">You do not have a position in this security.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History for {security.name}</CardTitle>
              <CardDescription>All buy and sell records for this security.</CardDescription>
            </CardHeader>
            <CardContent>
              {securityTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Shares/Units</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      {securityTransactions.some(tx => tx.profitOrLoss !== undefined) && <TableHead className="text-right">P/L</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.date + "T00:00:00").toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'Buy' ? 'secondary' : 'outline'} className={tx.type === 'Sell' ? 'border-destructive text-destructive' : ''}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{tx.shares.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tx.price.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</TableCell>
                        <TableCell className="text-right">{tx.fees.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</TableCell>
                        <TableCell className="text-right">{tx.total.toLocaleString(undefined, { style: 'currency', currency: security.currency })}</TableCell>
                        {securityTransactions.some(t => t.profitOrLoss !== undefined) && (
                            <TableCell className={cn("text-right", tx.profitOrLoss && tx.profitOrLoss < 0 ? 'text-destructive' : tx.profitOrLoss && tx.profitOrLoss > 0 ? 'text-accent' : '')}>
                            {tx.profitOrLoss !== undefined ? tx.profitOrLoss.toLocaleString(undefined, { style: 'currency', currency: security.currency, signDisplay: 'always' }) : 'N/A'}
                            </TableCell>
                        )}
                        <TableCell className="text-right">
                          {tx.isInvestmentRecord && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/investments/edit/${tx.id}`}>
                                <Edit3 className="h-4 w-4" />
                                <span className="sr-only">Edit Purchase</span>
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No transactions recorded for this security yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
