
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import type { DebtInstrumentInvestment, StockInvestment, ListedSecurity, InvestmentType } from '@/lib/types';
import { isDebtRelatedFund } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Database, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MyDebtInstrumentsPage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();

  const directDebtHoldings = React.useMemo(() => {
    return investments.filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];
  }, [investments]);

  const debtFundHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const stockInvestments = investments.filter(inv => inv.type === 'Stocks') as StockInvestment[];
    
    return stockInvestments.map(stockInv => {
      const security = listedSecurities.find(ls => ls.symbol === stockInv.tickerSymbol);
      if (security && security.securityType === 'Fund' && isDebtRelatedFund(security.fundType)) {
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Debt Instruments</h1>
        <p className="text-muted-foreground">Track your direct debt holdings and debt-related fund investments.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ScrollText className="mr-2 h-6 w-6 text-primary" />
            Direct Debt Holdings
          </CardTitle>
          <CardDescription>Certificates, Treasury Bills, Bonds, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          {directDebtHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name/Description</TableHead>
                  <TableHead>Sub-Type</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Amount Invested</TableHead>
                  <TableHead>Interest Rate (%)</TableHead>
                  <TableHead>Maturity Date</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directDebtHoldings.map(debt => (
                  <TableRow key={debt.id}>
                    <TableCell>{debt.name}</TableCell>
                    <TableCell>{debt.debtSubType || 'N/A'}</TableCell>
                    <TableCell>{debt.issuer || 'N/A'}</TableCell>
                    <TableCell>${debt.amountInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{debt.interestRate?.toLocaleString() || 'N/A'}%</TableCell>
                    <TableCell>{debt.maturityDate ? new Date(debt.maturityDate  + "T00:00:00").toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{new Date(debt.purchaseDate + "T00:00:00").toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No direct debt investments recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-6 w-6 text-primary" /> {/* Using Database icon for funds */}
            Debt-Related Fund Investments
          </CardTitle>
          <CardDescription>Cash management funds, fixed income funds, bond ETFs, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          {debtFundHoldings.length > 0 ? (
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
                {debtFundHoldings.map(fundInv => {
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
            <p className="text-muted-foreground">No debt-related fund investments found.</p>
          )}
        </CardContent>
      </Card>
       <Link href="/investments/add?type=Debt Instruments" passHref>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Add new debt investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}

