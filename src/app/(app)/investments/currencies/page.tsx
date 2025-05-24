
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import type { CurrencyInvestment, AggregatedCurrencyHolding } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, AlertCircle, Plus, Coins } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MyCurrencyListItem } from '@/components/investments/my-currency-list-item';
import { useLanguage } from '@/contexts/language-context'; // Import useLanguage

export default function MyCurrenciesPage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { exchangeRates, isLoading: isLoadingRates, error: ratesError } = useExchangeRates();
  const { language } = useLanguage(); // Get current language

  const aggregatedCurrencyHoldings = React.useMemo(() => {
    if (isLoadingInvestments || !investments.length) return [];

    const currencyInvestments = investments.filter(inv => inv.type === 'Currencies') as CurrencyInvestment[];
    const holdings: { [key: string]: { totalForeign: number; totalCostEGP: number; count: number } } = {};

    currencyInvestments.forEach(inv => {
      if (!holdings[inv.currencyCode]) {
        holdings[inv.currencyCode] = { totalForeign: 0, totalCostEGP: 0, count: 0 };
      }
      holdings[inv.currencyCode].totalForeign += inv.foreignCurrencyAmount;
      holdings[inv.currencyCode].totalCostEGP += inv.amountInvested; // Assumes amountInvested is cost in EGP
      holdings[inv.currencyCode].count++;
    });

    return Object.entries(holdings).map(([code, data]): AggregatedCurrencyHolding => {
      const avgPurchaseRate = data.totalForeign > 0 ? data.totalCostEGP / data.totalForeign : 0;
      const currentMarketRateKey = `${code.toUpperCase()}_EGP`;
      const currentMarketRate = exchangeRates?.[currentMarketRateKey];
      
      let currentValueEGP, profitLossEGP, profitLossPercent;
      if (currentMarketRate !== undefined && currentMarketRate !== null) {
        currentValueEGP = data.totalForeign * currentMarketRate;
        profitLossEGP = currentValueEGP - data.totalCostEGP;
        profitLossPercent = data.totalCostEGP > 0 ? (profitLossEGP / data.totalCostEGP) * 100 : (currentValueEGP > 0 ? Infinity : 0);
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        {[...Array(2)].map((_, i) => (
           <Card key={i} className="mt-6">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Currencies</h1>
        <p className="text-muted-foreground">View your currency holdings and their performance against EGP.</p>
      </div>
      <Separator />

      {ratesError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Exchange Rates</AlertTitle>
          <AlertDescription>
            Could not load current exchange rates. P/L calculations might be unavailable or inaccurate.
            Please ensure the 'exchangeRates/current' document is correctly set up in Firestore.
          </AlertDescription>
        </Alert>
      )}

      {aggregatedCurrencyHoldings.length > 0 ? (
        <div className="space-y-4 mt-6">
          {aggregatedCurrencyHoldings.map(holding => (
            <MyCurrencyListItem key={holding.currencyCode} holding={holding} />
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Coins className="mr-2 h-6 w-6 text-primary" />
              No Currency Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any currency investments yet, or current exchange rates are unavailable.
            </p>
          </CardContent>
        </Card>
      )}

      <Link href="/investments/add?type=Currencies" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed bottom-8 h-14 w-14 rounded-full shadow-lg z-50 ${
            language === 'ar' ? 'left-8' : 'right-8'
          }`}
          aria-label="Add new currency investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
