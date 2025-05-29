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
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatNumberWithSuffix } from '@/lib/utils';

export default function MyRealEstatePage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();
  const { language } = useLanguage(); 
  const isMobile = useIsMobile();

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
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatAmountEGPWithSuffix = (value: number) => {
    const formattedNumber = formatNumberWithSuffix(value);
    return `EGP ${formattedNumber}`;
  };

  const formatSecurityCurrency = (value: number, currencyCode: string) => {
    const digits = currencyCode === 'EGP' ? 2 : 2; 
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A'; // Invalid date
      return format(date, 'dd-MM-yyyy');
    } catch (e) {
      return 'N/A';
    }
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
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Address/Name</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Type</TableHead>
                  <TableHead className="text-right">Amount Invested</TableHead>
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directRealEstateHoldings.map(prop => (
                  <TableRow key={prop.id}>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{prop.propertyAddress || prop.name}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{prop.propertyType || 'N/A'}</TableCell>
                    <TableCell className="text-right">{isMobile ? formatAmountEGPWithSuffix(prop.amountInvested) : formatAmountEGP(prop.amountInvested)}</TableCell>
                    <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formatDateDisplay(prop.purchaseDate)}</TableCell>
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
                  <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Fund Name (Symbol)</TableHead>
                  <TableHead className="text-right">Units Held</TableHead>
                  <TableHead className="text-right">Avg. Purchase Price</TableHead>
                  <TableHead className="text-right">Total Invested</TableHead>
                  <TableHead className="text-right">Current Market Price</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
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
                      <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{fundInv.fundDetails.name} ({fundInv.fundDetails.symbol})</TableCell>
                      <TableCell className="text-right">{fundInv.numberOfShares?.toLocaleString() || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatSecurityCurrency(avgPurchasePrice, displayCurrency)}</TableCell>
                      <TableCell className="text-right">{formatSecurityCurrency(totalCost, displayCurrency)}</TableCell>
                      <TableCell className="text-right">{formatSecurityCurrency((fundInv.fundDetails.price || 0), displayCurrency)}</TableCell>
                      <TableCell className="text-right">{formatSecurityCurrency(currentValue, displayCurrency)}</TableCell>
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
          className={`fixed bottom-8 h-14 w-14 rounded-full shadow-lg z-50 ${
            language === 'ar' ? 'left-8' : 'right-8'
          }`}
          aria-label="Add new real estate investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
