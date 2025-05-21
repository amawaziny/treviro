
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import type { CurrencyInvestment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AggregatedCurrencyHolding {
  currencyCode: string;
  totalForeignAmount: number;
  totalCostInEGP: number;
  averagePurchaseRateToEGP: number;
  currentMarketRateToEGP?: number;
  currentValueInEGP?: number;
  profitOrLossInEGP?: number;
  profitOrLossPercentage?: number;
}

export default function MyCurrenciesPage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { exchangeRates, isLoading: isLoadingRates, error: ratesError } = useExchangeRates();

  const aggregatedCurrencyHoldings = React.useMemo(() => {
    if (isLoadingInvestments || !investments.length) return [];

    const currencyInvestments = investments.filter(inv => inv.type === 'Currencies') as CurrencyInvestment[];
    const holdings: { [key: string]: { totalForeign: number; totalCostEGP: number; count: number } } = {};

    currencyInvestments.forEach(inv => {
      // We ensure that the P/L is calculated only for investments recorded against EGP.
      if (inv.baseCurrencyAtPurchase?.toUpperCase() === 'EGP') {
        if (!holdings[inv.currencyCode]) {
          holdings[inv.currencyCode] = { totalForeign: 0, totalCostEGP: 0, count: 0 };
        }
        holdings[inv.currencyCode].totalForeign += inv.foreignCurrencyAmount;
        // inv.amountInvested is already the cost in EGP
        holdings[inv.currencyCode].totalCostEGP += inv.amountInvested;
        holdings[inv.currencyCode].count++;
      }
    });

    return Object.entries(holdings).map(([code, data]) => {
      const avgPurchaseRate = data.totalForeign > 0 ? data.totalCostEGP / data.totalForeign : 0;
      const currentMarketRateKey = `${code.toUpperCase()}_EGP`;
      const currentMarketRate = exchangeRates?.[currentMarketRateKey];
      
      let currentValueEGP, profitLossEGP, profitLossPercent;
      if (currentMarketRate !== undefined && currentMarketRate !== null) {
        currentValueEGP = data.totalForeign * currentMarketRate;
        profitLossEGP = currentValueEGP - data.totalCostEGP;
        profitLossPercent = data.totalCostEGP > 0 ? (profitLossEGP / data.totalCostEGP) * 100 : 0;
      }

      return {
        currencyCode: code,
        totalForeignAmount: data.totalForeign,
        totalCostInEGP: data.totalCostEGP,
        averagePurchaseRateToEGP: avgPurchaseRate,
        currentMarketRateToEGP: currentMarketRate,
        currentValueInEGP: currentValueEGP,
        profitOrLossInEGP: profitLossEGP,
        profitOrLossPercentage: profitLossPercent,
      };
    }).filter(h => h.totalForeignAmount > 0); // Only show currencies with active holdings
  }, [investments, isLoadingInvestments, exchangeRates]);

  const isLoading = isLoadingInvestments || isLoadingRates;

  const formatCurrency = (value: number | undefined, currency = "EGP") => {
    if (value === undefined || value === null) return "N/A";
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency }).format(value); // Use en-EG for EGP
  };

  const formatRate = (value: number | undefined) => {
    if (value === undefined || value === null) return "N/A";
    return value.toFixed(4);
  };
  
  const formatAmount = (value: number | undefined) => {
      if (value === undefined || value === null) return "N/A";
      return value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Currencies</h1>
        <p className="text-muted-foreground">View your currency holdings and their performance against EGP.</p>
      </div>
      <Separator />

      {ratesError && (
        <Card className="mt-6 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-6 w-6" />
              Error Loading Exchange Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive"> {/* Ensure text color matches destructive variant */}
              Could not load current exchange rates. P/L calculations might be unavailable or inaccurate.
              Please ensure the 'exchangeRates/current' document is correctly set up in Firestore.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-6 w-6 text-primary" />
            Currency Holdings (vs. EGP)
          </CardTitle>
          <CardDescription>
            Performance is calculated for holdings purchased against EGP.
            Current exchange rates are fetched from 'exchangeRates/current' in Firestore (e.g., 'USD_EGP').
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregatedCurrencyHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Amount Held</TableHead>
                  <TableHead className="text-right">Avg. Purchase Rate</TableHead>
                  <TableHead className="text-right">Cost (EGP)</TableHead>
                  <TableHead className="text-right">Current Rate</TableHead>
                  <TableHead className="text-right">Current Value (EGP)</TableHead>
                  <TableHead className="text-right">P/L (EGP)</TableHead>
                  <TableHead className="text-right">P/L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedCurrencyHoldings.map(holding => (
                  <TableRow key={holding.currencyCode}>
                    <TableCell className="font-medium">{holding.currencyCode}</TableCell>
                    <TableCell className="text-right">{formatAmount(holding.totalForeignAmount)}</TableCell>
                    <TableCell className="text-right">{formatRate(holding.averagePurchaseRateToEGP)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(holding.totalCostInEGP)}</TableCell>
                    <TableCell className="text-right">{isLoadingRates ? <Skeleton className="h-4 w-16 inline-block"/> : formatRate(holding.currentMarketRateToEGP)}</TableCell>
                    <TableCell className="text-right">{isLoadingRates && !holding.currentValueInEGP ? <Skeleton className="h-4 w-20 inline-block"/> : formatCurrency(holding.currentValueInEGP)}</TableCell>
                    <TableCell className={cn(
                        "text-right font-semibold",
                        holding.profitOrLossInEGP === undefined ? "" :
                        holding.profitOrLossInEGP >= 0 ? "text-accent" : "text-destructive"
                      )}>
                      {isLoadingRates && holding.profitOrLossInEGP === undefined ? <Skeleton className="h-4 w-20 inline-block"/> : formatCurrency(holding.profitOrLossInEGP)}
                    </TableCell>
                     <TableCell className={cn(
                        "text-right font-semibold",
                        holding.profitOrLossPercentage === undefined ? "" :
                        holding.profitOrLossPercentage >= 0 ? "text-accent" : "text-destructive"
                      )}>
                      {isLoadingRates && holding.profitOrLossPercentage === undefined ? <Skeleton className="h-4 w-12 inline-block"/> : 
                        (holding.profitOrLossPercentage !== undefined ? `${holding.profitOrLossPercentage.toFixed(2)}%` : "N/A")
                      }
                      {holding.profitOrLossPercentage !== undefined && (holding.profitOrLossPercentage >= 0 ? <TrendingUp className="inline-block h-4 w-4 ml-1" /> : <TrendingDown className="inline-block h-4 w-4 ml-1" />)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              No currency investments found that were purchased against EGP, or current exchange rates are unavailable.
            </p>
          )}
        </CardContent>
      </Card>
      <Link href="/investments/add?type=Currencies" passHref>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Add new currency investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
