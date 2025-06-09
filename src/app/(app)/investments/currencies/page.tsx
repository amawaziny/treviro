
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import type { CurrencyInvestment, AggregatedCurrencyHolding } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, AlertCircle, Plus, Coins, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MyCurrencyListItem } from '@/components/investments/my-currency-list-item';
import { useLanguage } from '@/contexts/language-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatNumberWithSuffix, cn } from '@/lib/utils';

export default function MyCurrenciesPage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { exchangeRates, isLoading: isLoadingRates, error: ratesError } = useExchangeRates();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const aggregatedCurrencyHoldings = React.useMemo(() => {
    if (isLoadingInvestments || !investments.length) return [];

    const currencyInvestments = investments.filter(inv => inv.type === 'Currencies') as CurrencyInvestment[];
    const holdings: { [key: string]: { totalForeign: number; totalCostEGP: number; count: number } } = {};

    currencyInvestments.forEach(inv => {
      if (!holdings[inv.currencyCode]) {
        holdings[inv.currencyCode] = { totalForeign: 0, totalCostEGP: 0, count: 0 };
      }
      holdings[inv.currencyCode].totalForeign += inv.foreignCurrencyAmount;
      holdings[inv.currencyCode].totalCostEGP += inv.amountInvested;
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
    }).filter(h => h.totalForeignAmount > 0);
  }, [investments, isLoadingInvestments, exchangeRates]);

  const { totalCurrentValueEGP, totalCostInEGP, totalProfitLossEGP } = React.useMemo(() => {
    let currentValueSum = 0;
    let costSum = 0;
    aggregatedCurrencyHoldings.forEach(holding => {
      currentValueSum += holding.currentValueInEGP ?? holding.totalCostInEGP; // Fallback to cost if current value N/A
      costSum += holding.totalCostInEGP;
    });
    return {
      totalCurrentValueEGP: currentValueSum,
      totalCostInEGP: costSum,
      totalProfitLossEGP: currentValueSum - costSum,
    };
  }, [aggregatedCurrencyHoldings]);

  const totalProfitLossPercent = totalCostInEGP > 0 ? (totalProfitLossEGP / totalCostInEGP) * 100 : (totalCurrentValueEGP > 0 ? Infinity : 0);
  const isTotalProfitable = totalProfitLossEGP >= 0;

  const isLoading = isLoadingInvestments || isLoadingRates;

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatCurrencyEGPWithSuffix = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return 'EGP 0.00';
    const formattedNumber = formatNumberWithSuffix(value);
    return `EGP ${formattedNumber}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        <Card className="mt-6">
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-1/2" /></CardContent>
        </Card>
        {[...Array(2)].map((_, i) => (
           <Card key={i} className="mt-4">
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
        <h1 className="text-xl font-bold tracking-tight text-foreground">Currencies</h1>
        <p className="text-muted-foreground text-sm">View your currency holdings and their performance against EGP.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Currencies P/L (vs EGP)</CardTitle>
            {isTotalProfitable ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", isTotalProfitable ? "text-accent" : "text-destructive")}>
                {isMobile ? formatCurrencyEGPWithSuffix(totalProfitLossEGP) : formatCurrencyEGP(totalProfitLossEGP)}
            </div>
            <p className="text-xs text-muted-foreground">
                {totalProfitLossPercent === Infinity ? '∞' : totalProfitLossPercent.toFixed(2)}% overall P/L
            </p>
        </CardContent>
      </Card>

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

    