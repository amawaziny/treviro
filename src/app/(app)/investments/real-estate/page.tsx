
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import type { RealEstateInvestment, StockInvestment, ListedSecurity } from '@/lib/types';
import { isRealEstateRelatedFund } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Home, Building, Plus } from 'lucide-react'; 
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function MyRealEstatePage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();

  const directRealEstateHoldings = React.useMemo(() => {
    return investments.filter(inv => inv.type === 'Real Estate') as RealEstateInvestment[];
  }, [investments]);

  const realEstateFundHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const stockInvestments = investments.filter(inv => inv.type === 'Stocks') as StockInvestment[];
    
    return stockInvestments.map(stockInv => {
      const security = listedSecurities.find(ls => ls.symbol === stockInv.tickerSymbol);
      if (security && security.securityType === 'Fund' && isRealEstateRelatedFund(security.fundType)) {
        return {
          ...stockInv,
          fundDetails: security,
        };
      }
      return null;
    }).filter(Boolean) as (StockInvestment & { fundDetails: ListedSecurity })[];
  }, [investments, listedSecurities, isLoadingInvestments, isLoadingListedSecurities]);

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  const formatAmountEGP = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatSecurityCurrency = (value: number, currencyCode: string) => {
    const digits = currencyCode === 'EGP' ? 3 : 2;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  };


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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Real Estate Holdings</h1>
        <p className="text-muted-foreground">Track your direct real estate and REIT/fund investments.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Home className="mr-2 h-6 w-6 text-primary" />
            Direct Real Estate Investments
          </CardTitle>
          <CardDescription>Properties you own directly.</CardDescription>
        </CardHeader>
        <CardContent>
          {directRealEstateHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address/Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount Invested</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directRealEstateHoldings.map(prop => (
                  <TableRow key={prop.id}>
                    <TableCell>{prop.propertyAddress || prop.name}</TableCell>
                    <TableCell>{prop.propertyType || 'N/A'}</TableCell>
                    <TableCell>{formatAmountEGP(prop.amountInvested)}</TableCell>
                    <TableCell>{prop.purchaseDate ? format(new Date(prop.purchaseDate), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No direct real estate investments recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-6 w-6 text-primary" />
            Real Estate Fund Investments (REITs, etc.)
          </CardTitle>
          <CardDescription>Funds primarily investing in real estate.</CardDescription>
        </CardHeader>
        <CardContent>
          {realEstateFundHoldings.length > 0 ? (
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
                {realEstateFundHoldings.map(fundInv => {
                  const displayCurrency = fundInv.fundDetails.currency || 'EGP';
                  const totalCost = (fundInv.numberOfShares || 0) * (fundInv.purchasePricePerShare || 0);
                  const avgPurchasePrice = (fundInv.numberOfShares && fundInv.numberOfShares > 0) ? totalCost / fundInv.numberOfShares : 0;
                  const currentValue = (fundInv.numberOfShares || 0) * (fundInv.fundDetails.price || 0);
                  return (
                    <TableRow key={fundInv.id}>
                      <TableCell>{fundInv.fundDetails.name} ({fundInv.fundDetails.symbol})</TableCell>
                      <TableCell>{fundInv.numberOfShares?.toLocaleString() || 'N/A'}</TableCell>
                      <TableCell>{formatSecurityCurrency(avgPurchasePrice, displayCurrency)}</TableCell>
                      <TableCell>{formatSecurityCurrency(totalCost, displayCurrency)}</TableCell>
                      <TableCell>{formatSecurityCurrency((fundInv.fundDetails.price || 0), displayCurrency)}</TableCell>
                      <TableCell>{formatSecurityCurrency(currentValue, displayCurrency)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No real estate-related fund investments found.</p>
          )}
        </CardContent>
      </Card>
       <Link href="/investments/add?type=Real Estate" passHref>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Add new real estate investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
