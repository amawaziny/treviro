import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, ScrollText, Trash2, Landmark } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { MyDebtListItem } from '@/components/investments/my-debt-list-item';
import { useInvestments } from '@/hooks/use-investments';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import { AggregatedDebtHolding } from '@/lib/types';
import { parseISO, isValid, format } from 'date-fns';
import { isDebtRelatedFund } from '@/lib/utils';

export default function MyDebtsListView() {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();

  const { directDebtHoldings, debtFundHoldings } = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) {
      return { directDebtHoldings: [], debtFundHoldings: [] };
    }
    const directHoldings: AggregatedDebtHolding[] = [];
    const fundHoldings: AggregatedDebtHolding[] = [];

    // Aggregate direct debt holdings
    const directDebtInvestments = investments.filter(inv => inv.type === 'Debt Instruments');
    directDebtInvestments.forEach(debt => {
      let maturityDay, maturityMonth, maturityYear;
      let projectedMonthly = 0, projectedAnnual = 0;
      if (debt.maturityDate) {
        try {
          const parsedMaturityDate = parseISO(debt.maturityDate + 'T00:00:00Z');
          if (isValid(parsedMaturityDate)) {
            maturityDay = format(parsedMaturityDate, 'dd');
            maturityMonth = format(parsedMaturityDate, 'MM');
            maturityYear = format(parsedMaturityDate, 'yyyy');
          }
        } catch (e) {
          // ignore
        }
      }
      if (typeof debt.amountInvested === 'number' && typeof debt.interestRate === 'number' && debt.interestRate > 0) {
        const principal = debt.amountInvested;
        const annualRateDecimal = debt.interestRate / 100;
        projectedMonthly = (principal * annualRateDecimal) / 12;
        projectedAnnual = principal * annualRateDecimal;
      }
      directHoldings.push({
        id: debt.id,
        itemType: 'direct',
        displayName: debt.name || `${debt.debtSubType} - ${debt.issuer || 'N/A'}`,
        debtSubType: debt.debtSubType,
        issuer: debt.issuer,
        interestRate: debt.interestRate,
        maturityDate: debt.maturityDate,
        amountInvested: debt.amountInvested,
        purchaseDate: debt.debtSubType === 'Certificate' ? undefined : debt.purchaseDate,
        maturityDay,
        maturityMonth,
        maturityYear,
        projectedMonthlyInterest: projectedMonthly,
        projectedAnnualInterest: projectedAnnual,
      });
    });

    // Aggregate debt fund holdings
    const stockInvestments = investments.filter(inv => inv.type === 'Stocks');
    const debtFundAggregationMap = new Map<string, AggregatedDebtHolding>();
    stockInvestments.forEach(stockInv => {
      const security = listedSecurities.find(ls => ls.symbol === stockInv.tickerSymbol);
      if (security && security.securityType === 'Fund' && isDebtRelatedFund(security.fundType)) {
        const symbol = security.symbol;
        if (debtFundAggregationMap.has(symbol)) {
          const existing = debtFundAggregationMap.get(symbol)!;
          existing.totalUnits = (existing.totalUnits || 0) + (stockInv.numberOfShares || 0);
          existing.totalCost = (existing.totalCost || 0) + (stockInv.amountInvested || 0);
          if (existing.totalUnits > 0) {
            existing.averagePurchasePrice = (existing.totalCost || 0) / existing.totalUnits;
          }
        } else {
          debtFundAggregationMap.set(symbol, {
            id: security.id,
            itemType: 'fund',
            displayName: security.name,
            fundDetails: security,
            totalUnits: stockInv.numberOfShares || 0,
            averagePurchasePrice: stockInv.purchasePricePerShare || 0,
            totalCost: stockInv.amountInvested || 0,
            currentMarketPrice: security.price,
            currency: security.currency,
            logoUrl: security.logoUrl,
          });
        }
      }
    });
    fundHoldings.push(...Array.from(debtFundAggregationMap.values()));
    return {
      directDebtHoldings: directHoldings.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
      debtFundHoldings: fundHoldings.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
    };
  }, [investments, listedSecurities, isLoadingInvestments, isLoadingListedSecurities]);

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Debt Instruments</h1>
        <p className="text-muted-foreground">Track your direct debt instruments and debt-related fund investments.</p>
      </div>
      <Separator />
      <div className="space-y-4 mt-6">
        {directDebtHoldings.length > 0 ? (
          directDebtHoldings.map(holding => (
            <MyDebtListItem key={holding.id} holding={holding} />
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Landmark className="mr-2 h-6 w-6 text-primary" />
                Direct Debt Instruments
              </CardTitle>
              <p className="text-muted-foreground">Bonds, Certificates, Treasury Bills you own directly.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-4 text-center">
                You haven't added any direct debt investments yet.
              </p>
            </CardContent>
          </Card>
        )}
        {debtFundHoldings.length > 0 && debtFundHoldings.map(holding => (
          <MyDebtListItem key={holding.id} holding={holding} />
        ))}
      </div>
      <Link href="/investments/add?type=Debt Instruments" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === 'ar' ? 'left-8' : 'right-8'} bottom-[88px] md:bottom-8`}
          aria-label="Add new debt instrument"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
