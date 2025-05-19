
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import type { GoldInvestment, StockInvestment, ListedSecurity } from '@/lib/types';
import { isGoldRelatedFund } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Gem, Coins, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MyGoldPage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();

  const directGoldHoldings = React.useMemo(() => {
    return investments.filter(inv => inv.type === 'Gold') as GoldInvestment[];
  }, [investments]);

  const goldFundHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const stockInvestments = investments.filter(inv => inv.type === 'Stocks') as StockInvestment[];
    
    return stockInvestments.map(stockInv => {
      const security = listedSecurities.find(ls => ls.symbol === stockInv.tickerSymbol);
      if (security && security.securityType === 'Fund' && isGoldRelatedFund(security.fundType)) {
        return {
          ...stockInv,
          fundDetails: security, 
        };
      }
      return null;
    }).filter(Boolean) as (StockInvestment & { fundDetails: ListedSecurity })[];
  }, [investments, listedSecurities, isLoadingInvestments, isLoadingListedSecurities]);

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Gold Holdings</h1>
        <p className="text-muted-foreground">Track your direct gold and gold-related fund investments.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gem className="mr-2 h-6 w-6 text-primary" />
            Direct Gold Investments
          </CardTitle>
          <CardDescription>Physical gold or other direct gold holdings.</CardDescription>
        </CardHeader>
        <CardContent>
          {directGoldHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name/Description</TableHead>
                  <TableHead>Quantity (grams)</TableHead>
                  <TableHead>Amount Invested</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directGoldHoldings.map(gold => (
                  <TableRow key={gold.id}>
                    <TableCell>{gold.name}</TableCell>
                    <TableCell>{gold.quantityInGrams?.toLocaleString() || 'N/A'}</TableCell>
                    <TableCell>${gold.amountInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{new Date(gold.purchaseDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No direct gold investments recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="mr-2 h-6 w-6 text-primary" />
            Gold-Related Fund Investments
          </CardTitle>
          <CardDescription>ETFs and other funds primarily investing in gold.</CardDescription>
        </CardHeader>
        <CardContent>
          {goldFundHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund Name (Symbol)</TableHead>
                  <TableHead>Units Held</TableHead>
                  <TableHead>Avg. Purchase Price</TableHead>
                  <TableHead>Total Invested</TableHead>
                  <TableHead>Current Market Price</TableHead>
                  <TableHead>Current Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goldFundHoldings.map(fundInv => {
                  const totalCost = (fundInv.numberOfShares || 0) * (fundInv.purchasePricePerShare || 0);
                  const avgPurchasePrice = (fundInv.numberOfShares && fundInv.numberOfShares > 0) ? totalCost / fundInv.numberOfShares : 0;
                  const currentValue = (fundInv.numberOfShares || 0) * (fundInv.fundDetails.price || 0);
                  return (
                    <TableRow key={fundInv.id}>
                      <TableCell>{fundInv.fundDetails.name} ({fundInv.fundDetails.symbol})</TableCell>
                      <TableCell>{fundInv.numberOfShares?.toLocaleString() || 'N/A'}</TableCell>
                      <TableCell>${avgPurchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>${fundInv.fundDetails.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                       <TableCell>${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No gold-related fund investments found.</p>
          )}
        </CardContent>
      </Card>
      <Link href="/investments/add" passHref>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Add new gold investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
