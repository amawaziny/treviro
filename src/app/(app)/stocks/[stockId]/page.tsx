
"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import React, { useEffect, useState } from 'react';
import { useListedSecurities } from '@/hooks/use-listed-securities'; 
import type { ListedSecurity, StockInvestment, Transaction } from '@/lib/types'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, LineChart, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Loader2, Briefcase, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { StockDetailChart } from '@/components/stocks/stock-detail-chart'; 
import { useInvestments } from '@/hooks/use-investments';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useLanguage } from '@/contexts/language-context';
import { format } from 'date-fns';


export default function SecurityDetailPage() { 
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); // For reading query params
  const securityId = params.stockId as string; 
  const { toast } = useToast();
  const { language } = useLanguage();

  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities(); 
  const { investments, isLoading: isLoadingInvestments, transactions, deleteSellTransaction } = useInvestments();
  
  const [security, setSecurity] = useState<ListedSecurity | null | undefined>(null); 
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const previousTab = searchParams.get('previousTab');
  const backLinkHref = previousTab ? `/stocks?tab=${previousTab}` : '/stocks';


  useEffect(() => {
    if (securityId) {
      getListedSecurityById(securityId).then(data => {
        setSecurity(data || null);
      });
    }
  }, [securityId, getListedSecurityById]);

  
  const userOwnedSecurities = React.useMemo(() => 
    investments.filter(inv => inv.type === 'Stocks' && inv.tickerSymbol === security?.symbol) as StockInvestment[],
    [investments, security]
  );

  const totalSharesOwned = React.useMemo(() =>
    userOwnedSecurities.reduce((sum, inv) => sum + (inv.numberOfShares || 0), 0),
    [userOwnedSecurities]
  );

  const averagePurchasePrice = React.useMemo(() => {
    if (totalSharesOwned === 0) return 0;
    const totalCost = userOwnedSecurities.reduce((sum, inv) => sum + (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0), 0);
    return totalCost / totalSharesOwned;
  }, [userOwnedSecurities, totalSharesOwned]);

  const hasPosition = totalSharesOwned > 0;

  const securityTransactions = React.useMemo(() => {
    if (!security) return [];
    
    const buyTransactions = investments
      .filter(inv => inv.type === 'Stocks' && inv.tickerSymbol === security.symbol)
      .map(inv => ({
        id: inv.id, 
        date: inv.purchaseDate,
        type: 'Buy' as 'Buy' | 'Sell', 
        shares: (inv as StockInvestment).numberOfShares || 0,
        price: (inv as StockInvestment).purchasePricePerShare || 0,
        fees: (inv as StockInvestment).purchaseFees || 0,
        totalAmount: inv.amountInvested,
        isInvestmentRecord: true, 
        tickerSymbol: security.symbol, 
        profitOrLoss: undefined, 
        createdAt: inv.createdAt || new Date().toISOString(),
      }));

    const sellTransactionsFromContext = transactions
      .filter(tx => tx.tickerSymbol === security.symbol && tx.type === 'sell')
      .map(tx => ({
        ...tx, 
        isInvestmentRecord: false, 
      }));
    
    const allTransactions = [...buyTransactions, ...sellTransactionsFromContext].map(tx => ({
        ...tx,
        createdAt: tx.createdAt || new Date(0).toISOString() 
    }));

    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [investments, transactions, security]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = securityTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(securityTransactions.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [securityId, securityTransactions.length]);


  const handleDeleteConfirmation = (tx: Transaction) => {
    const sellTx = transactions.find(t => t.id === tx.id && t.type === 'sell');
    if (sellTx) {
      setTransactionToDelete(sellTx);
      setIsDeleteAlertOpen(true);
    } else {
        toast({
            title: "Invalid Operation",
            description: "This action is only available for sell transactions.",
            variant: "destructive",
        })
    }
  };

  const handleDeleteSellTransaction = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteSellTransaction(transactionToDelete);
      toast({
        title: "Transaction Deleted",
        description: `Sell transaction from ${transactionToDelete.date ? format(new Date(transactionToDelete.date + "T00:00:00"), 'dd-MM-yyyy') : ''} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Deleting Transaction",
        description: error.message || "Could not delete the transaction.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setTransactionToDelete(null);
    }
  };


  if (isLoadingListedSecurities || isLoadingInvestments || security === undefined) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading security details...</p>
      </div>
    );
  }

  if (!security) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Security Not Found</h1>
        <p className="text-muted-foreground mb-6">The security you are looking for could not be found.</p>
        <Button onClick={() => router.push(backLinkHref)}> 
          {language === 'ar' ? <ArrowRight className="ml-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
           Go Back
        </Button>
      </div>
    );
  }

  const currentMarketPrice = security.price;
  const totalInvestmentValue = totalSharesOwned * currentMarketPrice;
  const totalCostBasis = totalSharesOwned * averagePurchasePrice;
  const PnL = totalInvestmentValue - totalCostBasis;
  const PnLPercentage = totalCostBasis > 0 ? (PnL / totalCostBasis) * 100 : (totalInvestmentValue > 0 ? Infinity : 0);
  const isProfitable = PnL >= 0;

  const pageTitle = security.securityType === 'Fund' 
    ? `${security.name} (${security.symbol}) - ${security.fundType || 'Fund'}`
    : `${security.name} (${security.symbol})`;
  
  const displayCurrency = security.currency || 'USD';
  const BackArrowIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const formatCurrency = (value: number, currencyCode: string = displayCurrency, minFractionDigits = 3, maxFractionDigits = 3) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    }).format(value);
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString + "T00:00:00"), 'dd-MM-yyyy');
  };


  return (
    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
      <div className="container mx-auto py-8 space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
           <Link href={backLinkHref}> 
             <BackArrowIcon className={language === 'ar' ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} /> Back to Explore
           </Link>
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={security.logoUrl} alt={security.name} data-ai-hint={security.securityType === 'Fund' ? "logo fund" : "logo company"}/>
                <AvatarFallback>{security.symbol.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold">{pageTitle}</CardTitle>
                <CardDescription>{security.market} - {displayCurrency}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{currentMarketPrice.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              <p className={cn("text-sm", security.changePercent >= 0 ? "text-accent" : "text-destructive")}>
                  {security.changePercent >= 0 ? '+' : ''}{security.changePercent.toFixed(2)}%
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex justify-end space-x-2 pb-4">
            <Link href={`/investments/add?stockId=${security.id}`} passHref> 
              <Button variant="default">
                <ShoppingCart className="mr-2 h-4 w-4" /> Buy
              </Button>
            </Link>
            {hasPosition && (
              <Link href={`/investments/sell-stock/${security.id}`} passHref> 
                <Button variant="outline" > 
                  <DollarSign className="mr-2 h-4 w-4" /> Sell
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="performance" className="w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 md:w-[500px]">
            <TabsTrigger value="performance">
              <LineChart className="mr-2 h-4 w-4" /> Performance
            </TabsTrigger>
            <TabsTrigger value="position" disabled={!hasPosition}>
              <Briefcase className="mr-2 h-4 w-4" /> My Position
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Briefcase className="mr-2 h-4 w-4" /> Transactions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Price History</CardTitle>
                <CardDescription>Daily closing prices from admin-entered data.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <StockDetailChart securityId={security.id} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="position">
            <Card>
              <CardHeader>
                <CardTitle>My Position in {security.name}</CardTitle>
                <CardDescription>Overview of your investment in this security.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasPosition ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium text-muted-foreground">Total {security.securityType === 'Fund' ? 'Units' : 'Shares'}:</span> {totalSharesOwned.toLocaleString()}</div>
                      <div><span className="font-medium text-muted-foreground">Avg. Purchase Price:</span> {formatCurrency(averagePurchasePrice)}</div>
                      <div><span className="font-medium text-muted-foreground">Total Cost Basis:</span> {formatCurrency(totalCostBasis)}</div>
                      <div><span className="font-medium text-muted-foreground">Current Market Price:</span> {formatCurrency(currentMarketPrice)}</div>
                      <div><span className="font-medium text-muted-foreground">Total Current Value:</span> {formatCurrency(totalInvestmentValue)}</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-lg font-semibold">Profit / Loss:</p>
                      <div className="text-right">
                          <p className={cn("text-2xl font-bold", isProfitable ? "text-accent" : "text-destructive")}>
                              {formatCurrency(PnL)}
                          </p>
                          <Badge variant={isProfitable ? 'default' : 'destructive'} 
                                className={cn(isProfitable ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground", "text-xs")}>
                              {isProfitable ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                              {PnLPercentage === Infinity ? '∞%' : PnLPercentage.toFixed(2) + '%'}
                          </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">You do not have a position in this security.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History for {security.name}</CardTitle>
                <CardDescription>All buy and sell records for this security.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {securityTransactions.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Date</TableHead>
                          <TableHead className={cn(language === 'ar' ? 'text-right' : 'text-left')}>Type</TableHead>
                          <TableHead className="text-right">Shares/Units</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Fees</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          {currentTransactions.some(tx => tx.profitOrLoss !== undefined) && <TableHead className="text-right">P/L</TableHead>}
                          <TableHead className={cn(language === 'ar' ? 'text-left' : 'text-right')}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>{formatDateDisplay(tx.date)}</TableCell>
                            <TableCell className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
                              <Badge variant={tx.type === 'Buy' ? 'secondary' : 'outline'} className={tx.type === 'Sell' ? 'border-destructive text-destructive' : ''}>
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{(tx.shares ?? 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency((tx.price ?? 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency((tx.fees ?? 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency((tx.totalAmount ?? 0))}</TableCell>
                            {currentTransactions.some(t => t.profitOrLoss !== undefined) && (
                                <TableCell className={cn("text-right", tx.profitOrLoss && tx.profitOrLoss < 0 ? 'text-destructive' : tx.profitOrLoss && tx.profitOrLoss > 0 ? 'text-accent' : '')}>
                                {tx.profitOrLoss !== undefined ? formatCurrency((tx.profitOrLoss ?? 0)) : 'N/A'}
                                </TableCell>
                            )}
                            <TableCell className={cn(language === 'ar' ? 'text-left' : 'text-right')}>
                              {tx.isInvestmentRecord && (
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/investments/edit/${tx.id}`}>
                                    <Edit3 className="h-4 w-4" />
                                    <span className="sr-only">Edit Purchase</span>
                                  </Link>
                                </Button>
                              )}
                              {!tx.isInvestmentRecord && tx.type === 'sell' && (
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteConfirmation(tx as Transaction)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Sell Transaction</span>
                                  </Button>
                                </AlertDialogTrigger>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 py-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          {language === 'ar' ? (
                            <>
                              <span>السابق</span> 
                              <ChevronRight className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              <ChevronLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </>
                          )}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          {language === 'ar' ? (
                            <>
                              <ChevronLeft className="h-4 w-4" />
                              <span>التالي</span>
                            </>
                          ) : (
                            <>
                              <span>Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground py-4 text-center">No transactions recorded for this security yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this sell transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the record of selling {(transactionToDelete?.shares ?? 0).toLocaleString()} {security.securityType === 'Fund' ? 'units' : 'shares'} of {security.name} on {transactionToDelete ? formatDateDisplay(transactionToDelete.date) : ''}.
              This action will reverse its impact on your total realized P/L. It will NOT automatically add the shares back to your holdings; you may need to re-enter purchases or adjust existing ones if this sale previously depleted them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSellTransaction}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  );
}
