
"use client";

import React from 'react';
import { useInvestments } from '@/hooks/use-investments';
import { useListedSecurities } from '@/hooks/use-listed-securities';
import type { DebtInstrumentInvestment, StockInvestment, ListedSecurity, AggregatedDebtHolding } from '@/lib/types';
import { isDebtRelatedFund } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Plus, Building, Trash2, Landmark, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MyDebtListItem } from '@/components/investments/my-debt-list-item';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';

const buttonVariants = ({ variant }: { variant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return "";
};


export default function MyDebtInstrumentsPage() {
  const { investments, isLoading: isLoadingInvestments, removeDirectDebtInvestment } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } = useListedSecurities();
  const { toast } = useToast();

  const [itemToDelete, setItemToDelete] = React.useState<AggregatedDebtHolding | null>(null);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

  const { directDebtHoldings, debtFundHoldings, totalProjectedMonthlyInterest, totalProjectedAnnualInterest } = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) {
      return { 
        directDebtHoldings: [], 
        debtFundHoldings: [],
        totalProjectedMonthlyInterest: 0,
        totalProjectedAnnualInterest: 0,
      };
    }

    const directHoldings: AggregatedDebtHolding[] = [];
    const fundHoldings: AggregatedDebtHolding[] = [];
    let monthlyInterestSum = 0;
    let annualInterestSum = 0;

    const directDebtInvestments = investments.filter(inv => inv.type === 'Debt Instruments') as DebtInstrumentInvestment[];
    directDebtInvestments.forEach(debt => {
      let maturityDay: string | undefined;
      let maturityMonth: string | undefined;
      let maturityYear: string | undefined;
      let projectedMonthly = 0;
      let projectedAnnual = 0;

      if (debt.maturityDate) {
        try {
          const parsedMaturityDate = parseISO(debt.maturityDate + "T00:00:00"); 
          if (isValid(parsedMaturityDate)) {
            maturityDay = format(parsedMaturityDate, 'dd');
            maturityMonth = format(parsedMaturityDate, 'MM');
            maturityYear = format(parsedMaturityDate, 'yyyy');
          }
        } catch (e) {
          console.error("Error parsing maturity date for debt holding:", debt.id, e);
        }
      }

      if (typeof debt.amountInvested === 'number' && typeof debt.interestRate === 'number' && debt.interestRate > 0) {
        const principal = debt.amountInvested;
        const annualRateDecimal = debt.interestRate / 100;
        projectedMonthly = (principal * annualRateDecimal) / 12;
        projectedAnnual = principal * annualRateDecimal;
        monthlyInterestSum += projectedMonthly;
        annualInterestSum += projectedAnnual;
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

          if (security.price && totalUnitsVal > 0) {
            currentValueVal = security.price * totalUnitsVal;
            profitLossVal = currentValueVal - totalCostVal;
            profitLossPercentVal = totalCostVal > 0 ? (profitLossVal / totalCostVal) * 100 : (currentValueVal > 0 ? Infinity : 0);
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

    fundHoldings.push(...Array.from(debtFundAggregationMap.values()));

    return {
      directDebtHoldings: directHoldings.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
      debtFundHoldings: fundHoldings.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
      totalProjectedMonthlyInterest: monthlyInterestSum,
      totalProjectedAnnualInterest: annualInterestSum,
    };

  }, [investments, listedSecurities, isLoadingInvestments, isLoadingListedSecurities]);

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  const handleRemoveDirectDebt = async (holdingId: string, holdingName: string) => {
    try {
      await removeDirectDebtInvestment(holdingId);
      toast({ title: "Debt Instrument Removed", description: `${holdingName} has been removed.` });
    } catch (error: any) {
      toast({ title: "Error Removing Item", description: error.message || `Could not remove ${holdingName}.`, variant: "destructive" });
    }
    setIsAlertDialogOpen(false);
    setItemToDelete(null);
  };

  const confirmRemoveItem = (item: AggregatedDebtHolding) => {
    setItemToDelete(item);
    setIsAlertDialogOpen(true);
  };
  
  const formatDisplayCurrency = (value: number | undefined, curr = "EGP", digits = 2) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
    const effectiveDigits = curr === "EGP" ? 2 : digits;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: effectiveDigits, maximumFractionDigits: effectiveDigits }).format(value);
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return '';
    try {
        const parsedDate = parseISO(dateString + "T00:00:00");
        if (isValid(parsedDate)) {
            return format(parsedDate, 'dd-MM-yyyy');
        }
        return '';
    } catch (e) {
        return '';
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
    <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
      <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Debt Holdings</h1>
          <p className="text-muted-foreground">Track your direct debt instruments and debt-related fund investments.</p>
        </div>
        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Landmark className="mr-2 h-6 w-6 text-primary" />
              Direct Debt Instruments
            </CardTitle>
            <CardDescription>Bonds, Certificates, Treasury Bills you own directly.</CardDescription>
          </CardHeader>
          <CardContent>
            {directDebtHoldings.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap"><span className="flex items-center">Name/Description <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="whitespace-nowrap"><span className="flex items-center">Type <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="whitespace-nowrap"><span className="flex items-center">Issuer <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">Interest Rate <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">M. Day <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">M. Month <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">M. Year <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">Maturity Date <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">Amount Invested <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="whitespace-nowrap"><span className="flex items-center">Purchase Date <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">Monthly Interest <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap"><span className="flex items-center justify-end">Annual Interest <ArrowUpDown className="ml-2 h-3 w-3" /></span></TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directDebtHoldings.map(debt => (
                      <TableRow key={debt.id}>
                        <TableCell><span className="flex items-center">{debt.displayName}</span></TableCell>
                        <TableCell><span className="flex items-center">{debt.debtSubType || 'N/A'}</span></TableCell>
                        <TableCell><span className="flex items-center">{debt.issuer || 'N/A'}</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{debt.interestRate?.toFixed(2) ?? 'N/A'}%</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{debt.maturityDay || 'N/A'}</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{debt.maturityMonth || 'N/A'}</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{debt.maturityYear || 'N/A'}</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{formatDateDisplay(debt.maturityDate)}</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{formatDisplayCurrency(debt.amountInvested, 'EGP')}</span></TableCell>
                        <TableCell><span className="flex items-center">
                          {debt.debtSubType === 'Certificate' || !debt.purchaseDate ? '' : formatDateDisplay(debt.purchaseDate)}
                        </span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{debt.projectedMonthlyInterest && debt.projectedMonthlyInterest > 0 ? formatDisplayCurrency(debt.projectedMonthlyInterest, 'EGP') : 'N/A'}</span></TableCell>
                        <TableCell className="text-right"><span className="flex items-center justify-end">{debt.projectedAnnualInterest && debt.projectedAnnualInterest > 0 ? formatDisplayCurrency(debt.projectedAnnualInterest, 'EGP') : 'N/A'}</span></TableCell>
                        <TableCell className="text-right">
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => confirmRemoveItem(debt)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove {debt.displayName}</span>
                            </Button>
                          </AlertDialogTrigger>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {(totalProjectedMonthlyInterest > 0 || totalProjectedAnnualInterest > 0) && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={10} className="font-semibold text-right">Total Projected Interest:</TableCell>
                        <TableCell className="text-right font-semibold">{formatDisplayCurrency(totalProjectedMonthlyInterest, 'EGP')}</TableCell>
                        <TableCell className="text-right font-semibold">{formatDisplayCurrency(totalProjectedAnnualInterest, 'EGP')}</TableCell>
                        <TableCell /> 
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center">
                You haven't added any direct debt investments yet.
              </p>
            )}
          </CardContent>
        </Card>


        {debtFundHoldings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-6 w-6 text-primary" />
                Debt-Related Fund Investments
              </CardTitle>
              <CardDescription>Funds primarily investing in debt instruments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {debtFundHoldings.map(holding => (
                <MyDebtListItem key={holding.id} holding={holding} />
              ))}
            </CardContent>
          </Card>
        )}

        {(directDebtHoldings.length === 0 && debtFundHoldings.length === 0) && !isLoading && (
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

        {itemToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently remove your investment record for {itemToDelete.displayName}.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (itemToDelete.itemType === 'direct') {
                    handleRemoveDirectDebt(itemToDelete.id, itemToDelete.displayName);
                  }
                }}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </div>
    </AlertDialog>
  );
}
