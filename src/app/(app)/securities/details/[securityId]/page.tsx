
"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import React, { useEffect, useState } from 'react';
import { useListedSecurities } from '@/hooks/use-listed-securities'; 
import type { ListedSecurity, StockInvestment, Transaction } from '@/lib/types'; 
import { useAuth } from '@/hooks/use-auth';
import { useForm } from '@/contexts/form-context';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddDividendSheet } from '@/components/investments/stocks/add-dividend-sheet';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, LineChart, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Loader2, Briefcase, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { StockDetailChart } from '@/components/investments/stocks/stock-detail-chart'; 
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { format } from 'date-fns';
import { useSwipeable } from 'react-swipeable';
import { useMediaQuery } from '@/hooks/use-media-query';


// Add viewport meta tag for mobile
import Head from 'next/head';

export default function SecurityDetailPage() { 
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const securityId = params.securityId as string; 
  const { toast } = useToast();
  const { language } = useLanguage();

  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities(); 
  const { investments, isLoading: isLoadingInvestments, transactions, deleteSellTransaction } = useInvestments();
  const { user } = useAuth();
  const userId = user?.uid;
  const { setHeaderProps } = useForm();
  const previousTab = searchParams.get('previousTab');
  const fromMyStocks = searchParams.get('fromMyStocks') === 'true';
  const backLinkHref = fromMyStocks ? '/investments/stocks' : (previousTab ? `/securities?tab=${previousTab}` : '/securities');

  const [dividendSheetOpen, setDividendSheetOpen] = useState(false);
  const [dividendLoading, setDividendLoading] = useState(false);
  
  const [security, setSecurity] = useState<ListedSecurity | null | undefined>(null); 
  
  // Set up header props after security data is loaded
  useEffect(() => {
    if (!security) return;
    
    setHeaderProps({
      showBackButton: true,
      backHref: backLinkHref,
      backLabel: 'Back',
      title: security.name,
      showNavControls: false
    });
    
    return () => {
      setHeaderProps({
        showBackButton: false,
        showNavControls: true,
        title: '',
        backHref: '/securities',
        backLabel: 'Back'
      });
    };
  }, [security, backLinkHref, setHeaderProps]);
  
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  // Add Dividend Handler
  const handleAddDividend = async (amount: number, date: string) => {
    setDividendLoading(true);
    try {
      // Compose dividend transaction object
      const transactionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const newDividendTx = {
        id: transactionId,
        type: 'dividend',
        tickerSymbol: security?.symbol,
        stockId: security?.id,
        date,
        amount,
        totalAmount: amount,
        shares: totalSharesOwned, // Add shares field for dividend
        createdAt: new Date().toISOString(),
      };
      // Save to Firestore via REST or context (ideally via context action, but fallback to direct call if not exposed)
      // For now, add to /transactions collection
      // You may want to expose an addTransaction method in your context for a cleaner approach
      const { db } = await import('@/lib/firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      if (!userId || !db) throw new Error('User not authenticated or db unavailable');
      await setDoc(doc(db, `users/${userId}/transactions`, transactionId), { ...newDividendTx, createdAt: serverTimestamp() });
      setDividendSheetOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add dividend.', variant: 'destructive' });
    } finally {
      setDividendLoading(false);
    }
  };


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

    // ADD: Dividend transactions for this security
    const dividendTransactions = transactions
      .filter(tx => tx.tickerSymbol === security.symbol && tx.type === 'dividend')
      .map(tx => ({
        ...tx,
        shares: totalSharesOwned, // Always show latest shares owned for display
        isInvestmentRecord: false,
      }));
    
    const allTransactions = [
      ...buyTransactions,
      ...sellTransactionsFromContext,
      ...dividendTransactions,
    ].map(tx => ({
        ...tx,
        createdAt: tx.createdAt || new Date(0).toISOString() 
    }));

    return allTransactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });
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
        description: `Sell transaction from ${transactionToDelete.date ? format(new Date(transactionToDelete.date + "T00:00:00Z"), 'dd-MM-yyyy') : ''} has been deleted.`,
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

  const createSwipeHandlers = (id: string) => useSwipeable({
    onSwipedLeft: () => setSwipedId(id),
    onSwipedRight: () => setSwipedId(null),
    trackMouse: false,
    delta: 10,
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

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
  
  const displayCurrency = security.currency || 'EGP'; // Default to EGP if currency not specified
  const BackArrowIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const formatCurrency = (value: number, currencyCode: string = displayCurrency) => {
    const digits = currencyCode === 'EGP' ? 3 : 2;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString + "T00:00:00Z"), 'dd-MM-yyyy');
    } catch {
      return 'Invalid Date';
    }
  };


  return (
    <div className="w-full max-w-full mx-auto md:pb-6 space-y-6 overflow-x-hidden">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover" />
      </Head>
      
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row justify-between space-y-0 p-4">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 md:h-12 md:w-12">
              <AvatarImage src={security.logoUrl} alt={security.name} data-ai-hint={security.securityType === 'Fund' ? "logo fund" : "logo company"}/>
              <AvatarFallback className="text-xs md:text-base">{security.symbol.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base md:text-xl font-bold">{security.symbol}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                <div className="text-xs">{security.market}</div>
              </CardDescription>
            </div>
          </div>
          <div className="text-end">
            <p className="text-sm md:text-xl font-bold">{formatCurrency(currentMarketPrice)}</p>
            <p className={cn("text-xs md:text-sm", security.changePercent >= 0 ? "text-accent" : "text-destructive")}>
              {security.changePercent >= 0 ? '+' : ''}{security.changePercent.toFixed(2)}%
            </p>
          </div>
          </CardHeader>
          {/* Desktop Buttons */}
          <CardContent className="hidden md:flex justify-end space-x-2 pb-4">
            <Link href={`/investments/add?securityId=${security.id}`} passHref> 
              <Button variant="default">
                <ShoppingCart className="mr-2 h-4 w-4" /> Buy
              </Button>
            </Link>
            {hasPosition && (
              <>
                <Link href={`/investments/sell-stock/${security.id}`} passHref> 
                  <Button variant="outline" > 
                    <DollarSign className="mr-2 h-4 w-4" /> Sell
                  </Button>
                </Link>
                <Button variant="secondary" onClick={() => setDividendSheetOpen(true)}>
                  Add Dividend
                </Button>
                <AddDividendSheet
                  open={dividendSheetOpen}
                  onOpenChange={setDividendSheetOpen}
                  onSubmit={handleAddDividend}
                  defaultDate={new Date().toISOString().slice(0, 10)}
                />
              </>
            )}
          </CardContent>

          {/* Mobile Fixed Action Bar */}
          <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-sm border-t z-50 flex md:hidden px-4 py-3 gap-2 justify-between safe-bottom">
            <Link href={`/investments/add?securityId=${security.id}`} passHref className="flex-1">
              <Button variant="default" className="w-full">
                <ShoppingCart className="mr-2 h-4 w-4" /> Buy
              </Button>
            </Link>
            {hasPosition && (
              <>
                <Link href={`/investments/sell-stock/${security.id}`} passHref className="flex-1">
                  <Button variant="outline" className="w-full">
                    <DollarSign className="mr-2 h-4 w-4" /> Sell
                  </Button>
                </Link>
                <Button variant="secondary" className="flex-1 w-full" onClick={() => setDividendSheetOpen(true)}>
                  Add Dividend
                </Button>
                <AddDividendSheet
                  open={dividendSheetOpen}
                  onOpenChange={setDividendSheetOpen}
                  onSubmit={handleAddDividend}
                  defaultDate={new Date().toISOString().slice(0, 10)}
                />
              </>
            )}
          </div>
        </Card>

        <Tabs defaultValue="performance" className="w-full max-w-full overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <TabsList
            className="flex w-full overflow-x-auto overflow-y-hidden flex-nowrap whitespace-nowrap gap-1 md:grid md:grid-cols-3 md:w-full md:gap-0 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent h-10 items-center px-1 touch-pan-x"
            style={{
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              overscrollBehaviorX: 'contain'
            }}
          >
            <TabsTrigger value="performance" className="flex-1 flex-shrink-0 text-xs md:text-base">
              <LineChart className="mr-2 h-4 w-4" /> Performance
            </TabsTrigger>
            <TabsTrigger value="position" className="flex-1 flex-shrink-0 text-xs md:text-base" disabled={!hasPosition}>
              <Briefcase className="mr-2 h-4 w-4" /> My Position
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 flex-shrink-0 text-xs md:text-base">
              <DollarSign className="mr-2 h-4 w-4" /> Transactions
            </TabsTrigger>
            {/* Add more TabsTrigger here for future tabs—they will scroll! */}
          </TabsList>
          <TabsContent value="performance" className="w-full max-w-full">
            <Card className="mb-16 md:mb-4 overflow-hidden">
              <CardHeader>
                <CardTitle className='text-md'>Price History</CardTitle>
                <CardDescription className='text-xs'>Historical price performance of {security.name}</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <StockDetailChart securityId={security.id} currency={displayCurrency} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="position">
            <Card className="mb-16 md:mb-4">
              <CardHeader>
                <CardTitle className='text-md'>My Position</CardTitle>
                <CardDescription className='text-xs'>Your current investment in {security.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {hasPosition ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Shares Owned</p>
                        <p className="text-xs font-medium">{totalSharesOwned.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg. Cost</p>
                        <p className="text-xs font-medium">{formatCurrency(averagePurchasePrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="text-xs font-medium">{formatCurrency(totalCostBasis)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Value</p>
                        <p className="text-xs font-medium">{formatCurrency(totalInvestmentValue)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Total Return</p>
                        <div className="text-end">
                          <p className={cn("text-sm font-bold", isProfitable ? "text-accent" : "text-destructive")}>
                            {0}
                          </p>
                          <p className={cn("text-xs", isProfitable ? "text-accent" : "text-destructive")}>
                            {isProfitable ? '+' : ''}{0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">You don't have a position in this security yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className='mb-16 md:mb-4'>
              <CardHeader>
                <CardTitle className='text-md'>Transaction History</CardTitle>
                <CardDescription className='text-xs'>All buy, sell, and dividend records for {security.name}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {securityTransactions.length > 0 ? (
                  <div className="divide-y">
                    {currentTransactions.map((tx) => {
                      const isDividend = tx.type === 'dividend';
                      const isBuy = tx.type === 'Buy';
                      const isSell = tx.type === 'Sell';
                      const shares = isDividend 
                        ? (tx as any).shares 
                        : (tx as any).shares || (tx as any).numberOfShares || 0;
                      const price = isDividend 
                        ? 0 
                        : (tx as any).price || (tx as any).pricePerShare || 0;
                      const amount = isDividend 
                        ? (tx as any).amount || (tx as any).totalAmount || 0 
                        : (tx as any).totalAmount || 0;
                      
                      // Create swipe handlers for mobile delete
                      const swipeHandlers = !isDesktop && tx.type === 'Sell' ? createSwipeHandlers(tx.id) : {};
                      
                      return (
                        <div 
                          key={tx.id} 
                          className="relative overflow-hidden"
                          {...swipeHandlers}
                        >
                          {/* Delete action overlay for mobile swipe */}
                          <div 
                            className={cn(
                              'absolute right-0 top-0 h-full w-20 bg-destructive/90 flex items-center justify-center transition-transform duration-300',
                              swipedId === tx.id ? 'translate-x-0' : 'translate-x-full',
                              'z-10' // Ensure delete button is above other content
                            )}
                            onClick={() => handleDeleteConfirmation(tx as unknown as Transaction)}
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </div>
                          
                          {/* Transaction content */}
                          <div 
                            className={cn(
                              'p-4 hover:bg-muted/50 transition-transform duration-300 bg-background relative z-0',
                              swipedId === tx.id ? '-translate-x-20' : 'translate-x-0',
                              'touch-pan-y select-none' // Better touch handling
                            )}
                          >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={isBuy ? 'secondary' : isSell ? 'destructive' : 'default'}
                                  className={cn(
                                    isSell && 'bg-destructive/10 text-destructive hover:bg-destructive/20',
                                    'text-xs'
                                  )}
                                >
                                  {tx.type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDateDisplay(tx.date ?? '')}
                                </span>
                              </div>
                              <div className="text-sm font-medium">
                                {shares.toLocaleString()} {security.securityType === 'Fund' ? 'Units' : 'Shares'}
                              </div>
                            </div>
                            <div className="text-end">
                              <div className={cn(
                                'text-xs font-medium',
                                isBuy ? 'text-foreground' : isSell ? 'text-destructive' : 'text-accent'
                              )}>
                                {isBuy ? '-' : ''}{formatCurrency(amount)}
                              </div>
                              {!isDividend && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(price)} each
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                            <div>
                              {!isDividend && (
                                <span>Fees: {formatCurrency((tx as any).fees || 0)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {tx.isInvestmentRecord && (
                                <Button variant="ghost" size="icon" className="h-4 w-4" asChild>
                                  <Link href={`/investments/stocks/edit/${tx.id}`}>
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span className="sr-only">Edit</span>
                                  </Link>
                                </Button>
                              )}
                              {isSell && !(tx as any).isInvestmentRecord && isDesktop && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 text-destructive/70 hover:text-destructive"
                                  onClick={() => handleDeleteConfirmation(tx as unknown as Transaction)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              )}
                              {isSell && !isDesktop && (
                                <div className="h-4 w-4 flex items-center justify-center opacity-50">
                                  <span className="text-xs">Swipe left to delete</span>
                                </div>
                              )}
                            </div>
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No transactions recorded yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add your first transaction to get started</p>
                  </div>
                )}
                
                {/* Pagination */}
                {securityTransactions.length > itemsPerPage && (
                  <div className="flex justify-between items-center px-4 py-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {Math.ceil(securityTransactions.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(securityTransactions.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(securityTransactions.length / itemsPerPage)}
                      className="gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this sell transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the record of selling {(('shares' in (transactionToDelete ?? {})) ? (transactionToDelete as any).shares : (transactionToDelete?.numberOfShares ?? 0)).toLocaleString()} {security?.securityType === 'Fund' ? 'units' : 'shares'} of {security?.name} on {transactionToDelete ? formatDateDisplay(transactionToDelete.date) : ''}.
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
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this sell transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the record of selling {(('shares' in (transactionToDelete ?? {})) ? (transactionToDelete as any).shares : (transactionToDelete?.numberOfShares ?? 0)).toLocaleString()} {security?.securityType === 'Fund' ? 'units' : 'shares'} of {security?.name} on {transactionToDelete ? formatDateDisplay(transactionToDelete.date) : ''}.
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
      </AlertDialog>
    </div>
  );
}
