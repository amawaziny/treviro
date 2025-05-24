
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import type { DebtInstrumentInvestment, StockInvestment, ListedSecurity, AggregatedDebtHolding } from '@/lib/types';
import { isDebtRelatedFund } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MyDebtListItem } from '@/components/investments/my-debt-list-item'; 


export default function MyDebtInstrumentsPage() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();

  const aggregatedDebtHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const holdings: AggregatedDebtHolding[] = [];

    // Process Direct Debt Instruments
    const directDebtInvestments = investments.filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];
    directDebtInvestments.forEach(debt => {
      holdings.push({
        id: debt.id,
        itemType: 'direct',
        displayName: debt.name || `${debt.debtSubType} - ${debt.issuer || 'N/A'}`,
        debtSubType: debt.debtSubType,
        issuer: debt.issuer,
        interestRate: debt.interestRate,
        maturityDate: debt.maturityDate,
        amountInvested: debt.amountInvested,
        purchaseDate: debt.purchaseDate,
      });
    });

    // Process Debt-Related Funds
    const stockInvestments = investments.filter(inv => inv.type === 'Stocks') as StockInvestment[];
    const debtFundAggregationMap = new Map<string, AggregatedDebtHolding>();

    stockInvestments.forEach(stockInv => {
      const security = listedSecurities.find(ls => ls.symbol === stockInv.tickerSymbol);
      if (security && security.securityType === 'Fund' && isDebtRelatedFund(security.fundType)) {
        const symbol = security.symbol;
        if (debtFundAggregationMap.has(symbol)) {
          const existing = debtFundAggregationMap.get(symbol)!;
          existing.totalUnits = (existing.totalUnits || 0) + (stockInv.numberOfShares || 0);
          existing.totalCost = (existing.totalCost || 0) + (stockInv.amountInvested || 0);
          if (existing.totalUnits && existing.totalUnits > 0 && existing.totalCost) {
            existing.averagePurchasePrice = existing.totalCost / existing.totalUnits;
          }
          // Recalculate P/L for aggregated fund
          if (existing.currentMarketPrice && existing.totalUnits && existing.totalCost) {
            existing.currentValue = existing.currentMarketPrice * existing.totalUnits;
            existing.profitLoss = existing.currentValue - existing.totalCost;
            existing.profitLossPercent = existing.totalCost > 0 ? (existing.profitLoss / existing.totalCost) * 100 : (existing.currentValue > 0 ? Infinity : 0);
          }

        } else {
          const totalCostVal = stockInv.amountInvested || 0;
          const totalUnitsVal = stockInv.numberOfShares || 0;
          const avgPrice = totalUnitsVal > 0 ? totalCostVal / totalUnitsVal : 0;
          let currentValueVal, profitLossVal, profitLossPercentVal;

          if(security.price && totalUnitsVal > 0){
            currentValueVal = security.price * totalUnitsVal;
            profitLossVal = currentValueVal - totalCostVal;
            profitLossPercentVal = totalCostVal > 0 ? (profitLossVal/totalCostVal) * 100 : (currentValueVal > 0 ? Infinity : 0);
          }

          debtFundAggregationMap.set(symbol, {
            id: security.id, 
            itemType: 'fund',
            displayName: security.name,
            fundDetails: security,
            totalUnits: totalUnitsVal,
            averagePurchasePrice: avgPrice,
            totalCost: totalCostVal,
            currentMarketPrice: security.price,
            currency: security.currency,
            logoUrl: security.logoUrl,
            currentValue: currentValueVal,
            profitLoss: profitLossVal,
            profitLossPercent: profitLossPercentVal
          });
        }
      }
    });
    
    holdings.push(...Array.from(debtFundAggregationMap.values()));
    
    return holdings.sort((a,b) => {
        // Sort by item type (direct first, then funds), then by display name
        if (a.itemType === 'direct' && b.itemType === 'fund') return -1;
        if (a.itemType === 'fund' && b.itemType === 'direct') return 1;
        return a.displayName.localeCompare(b.displayName);
    });

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
        {[...Array(2)].map((_, i) => (
           <Card key={i} className="mt-6">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Debt Holdings</h1>
        <p className="text-muted-foreground">Track your direct debt instruments and debt-related fund investments.</p>
      </div>
      <Separator />

      {aggregatedDebtHoldings.length > 0 ? (
        <div className="space-y-4 mt-6">
          {aggregatedDebtHoldings.map(holding => (
            <MyDebtListItem key={holding.id} holding={holding} />
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScrollText className="mr-2 h-6 w-6 text-primary" />
              No Debt Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any debt investments or related funds yet.
            </p>
          </CardContent>
        </Card>
      )}

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
