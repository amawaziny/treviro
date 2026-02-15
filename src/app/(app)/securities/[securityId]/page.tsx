"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation"; // Added useSearchParams
import React, { useEffect, useState } from "react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type { Transaction } from "@/lib/types";
import { useForm } from "@/contexts/form-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddDividendSheet } from "@/components/investments/securities/add-dividend-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  DollarSign,
  Loader2,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useInvestments } from "@/contexts/investment-context";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  cn,
  formatCurrencyWithCommas,
  formatDateDisplay,
  formatDateISO,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { useTransactions } from "@/contexts/transactions-context";
import SecurityChart from "@/components/investments/securities/security-chart";
import { calcProfit } from "@/lib/financial-utils";

export default function SecurityDetailPage() {
  const { t, language, dir } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const securityId = params.securityId as string;
  const previousTab = searchParams.get("previousTab");
  const fromMyStocks = searchParams.get("fromMyStocks") === "true";
  const backLinkHref = fromMyStocks
    ? "/investments/stocks"
    : previousTab
      ? `/securities?tab=${previousTab}`
      : "/securities";

  const { setHeaderProps } = useForm();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dividendSheetOpen, setDividendSheetOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);

  const { getSecurityById, isLoading: isLoadingSecurities } =
    useListedSecurities();
  const security = getSecurityById(securityId);

  const securityName = security?.[language === "ar" ? "name_ar" : "name"];
  // Set up header props after security data is loaded
  useEffect(() => {
    if (!security) return;

    setHeaderProps({
      showBackButton: true,
      backHref: backLinkHref,
      backLabel: "Back",
      title: securityName,
      showNavControls: false,
    });

    return () => {
      setHeaderProps({
        showBackButton: false,
        showNavControls: true,
        title: "",
        backHref: "/securities",
        backLabel: "Back",
      });
    };
  }, [security, backLinkHref, setHeaderProps]);

  const {
    isLoading: isLoadingInvestments,
    addDividend,
    getInvestmentBySecurityId,
  } = useInvestments();

  const {
    isLoading: isLoadingTransactions,
    deleteTransaction,
    getTransactionsBySecurityId,
  } = useTransactions();

  useEffect(() => {
    if (!dividendSheetOpen)
      getTransactionsBySecurityId(securityId).then(setTransactions);
  }, [securityId, getTransactionsBySecurityId, dividendSheetOpen]);

  const userOwnedSecurities = getInvestmentBySecurityId(securityId);

  // Add Dividend Handler
  const handleAddDividend = async (
    amount: number,
    quantity: number,
    date: string,
  ) => {
    try {
      await addDividend(
        userOwnedSecurities!.id,
        securityId,
        amount,
        quantity,
        new Date(date),
      );
      setDividendSheetOpen(false);
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("failed_to_add_dividend"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteSellTransaction = () => {
    deleteTransaction(transactionToDelete!.id);
    setIsDeleteAlertOpen(false);
    setTransactionToDelete(null);
  };

  const handleDeleteConfirmation = (tx: Transaction) => {
    setTransactionToDelete(tx);
    setIsDeleteAlertOpen(true);
  };

  if (
    isLoadingSecurities ||
    isLoadingInvestments ||
    isLoadingTransactions ||
    !security
  ) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">
          {t("loading_security_details")}
        </p>
      </div>
    );
  }

  const totalSharesOwned = userOwnedSecurities?.totalShares || 0;
  const averagePurchasePrice = userOwnedSecurities?.averagePurchasePrice || 0;
  const hasPosition = totalSharesOwned > 0;
  const currentMarketPrice = security.price || 0;
  const displayCurrency = security.currency || "EGP"; // Default to EGP if currency not specified

  // Calculate profit/loss
  const {
    isProfitable,
    profitLoss: PnL,
    totalCost: totalCostBasis,
    profitLossPercent: PnLPercentage,
    totalCurrentValue: totalInvestmentValue,
  } = calcProfit(totalSharesOwned, averagePurchasePrice, currentMarketPrice);

  return (
    <div className="md:pb-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between space-y-0 p-4">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 md:h-12 md:w-12">
              <AvatarImage
                src={security.logoUrl}
                alt={security.symbol}
                data-ai-hint={
                  security.securityType === "Fund"
                    ? t("logo_fund")
                    : t("logo_company")
                }
              />

              <AvatarFallback className="text-xs md:text-base">
                {security.symbol.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base md:text-xl font-bold">
                {security.symbol}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                <div className="text-xs">{security.market}</div>
              </CardDescription>
            </div>
          </div>
          <div className="text-end">
            <p className="text-sm md:text-xl font-bold">
              {formatCurrencyWithCommas(currentMarketPrice, displayCurrency)}
            </p>
            <p
              className={cn(
                "text-xs md:text-sm",
                security.changePercent >= 0
                  ? "text-accent"
                  : "text-destructive",
              )}
            >
              {security.changePercent >= 0 ? "+" : ""}
              {security.changePercent.toFixed(2)}%
            </p>
          </div>
        </CardHeader>
        {/* Desktop Buttons */}
        <CardContent className="hidden md:flex justify-end gap-2 pb-4">
          <Link
            href={
              hasPosition
                ? `/securities/${security.id}/buy`
                : `/investments/buy-new?securityId=${security.id}`
            }
            passHref
          >
            <Button variant="default" data-testid="buy-security-button">
              <ShoppingCart className="h-4 w-4" /> {t("buy")}
            </Button>
          </Link>
          {hasPosition && (
            <>
              <Link href={`/securities/${security.id}/sell`} passHref>
                <Button variant="outline">
                  <DollarSign className="h-4 w-4" /> {t("sell")}
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => setDividendSheetOpen(true)}
              >
                {t("add_dividend")}
              </Button>
              <AddDividendSheet
                open={dividendSheetOpen}
                onOpenChange={setDividendSheetOpen}
                onSubmit={handleAddDividend}
                defaultDate={formatDateISO(new Date())}
              />
            </>
          )}
        </CardContent>

        {/* Mobile Fixed Action Bar */}
        <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-sm border-t z-50 flex md:hidden px-4 py-3 gap-2 justify-between safe-bottom">
          <Link
            href={`/securities/${security.id}/buy`}
            passHref
            className="flex-1"
          >
            <Button variant="default" className="w-full">
              <ShoppingCart className="h-4 w-4" /> {t("buy")}
            </Button>
          </Link>
          {hasPosition && (
            <>
              <Link
                href={`/securities/${security.id}/sell`}
                passHref
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  <DollarSign className="h-4 w-4" /> {t("sell")}
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="flex-1 w-full"
                onClick={() => setDividendSheetOpen(true)}
              >
                {t("add_dividend")}
              </Button>
              <AddDividendSheet
                open={dividendSheetOpen}
                onOpenChange={setDividendSheetOpen}
                onSubmit={handleAddDividend}
                defaultDate={formatDateISO(new Date())}
              />
            </>
          )}
        </div>
      </Card>

      <Tabs defaultValue="performance" className="w-full max-w-full" dir={dir}>
        <TabsList className="flex w-full gap-3 md:grid md:grid-cols-3 h-11 items-center px-1">
          <TabsTrigger
            value="performance"
            className="flex text-xs md:text-base w-full"
          >
            {t("performance")}
          </TabsTrigger>
          <TabsTrigger
            value="position"
            className="flex text-xs md:text-base w-full"
            disabled={!hasPosition}
          >
            {t("my_position")}
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="flex text-xs md:text-base w-full"
            disabled={!hasPosition}
          >
            {t("transactions")}
          </TabsTrigger>
          {/* Add more TabsTrigger here for future tabs—they will scroll! */}
        </TabsList>
        <TabsContent value="performance" className="w-full max-w-full">
          <Card className="mb-2">
            <CardHeader>
              <CardTitle className="text-md">{t("price_history")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {security.securityType !== "Fund" && (
                <SecurityChart symbol={security.symbol} />
              )}
            </CardContent>
          </Card>

          {/* Security Details Section */}
          <Card className="mb-16 md:mb-2">
            <CardHeader>
              <CardTitle className="text-md">{t("security_details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div
                hidden={security.securityType === "Fund"}
                className="space-y-4"
              >
                <h3 className="text-sm font-medium">
                  {t("basic_information")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("isin")}
                    </p>
                    <p className="text-sm">
                      {security.isin || t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("sector")}
                    </p>
                    <p className="text-sm">
                      {language === "ar"
                        ? security.sectorAr || security.sector
                        : security.sector || t("not_available")}
                    </p>
                  </div>
                  {security.fundType && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("fund_type")}
                      </p>
                      <p className="text-sm">{security.fundType}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("listing_date")}
                    </p>
                    <p className="text-sm">
                      {security.listingDate
                        ? security.listingDate
                        : t("not_available")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Market Data */}
              <div
                hidden={security.securityType === "Fund"}
                className="pt-4 border-t space-y-4"
              >
                <h3 className="text-sm font-medium">{t("market_data")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("market_cap")}
                    </p>
                    <p className="text-sm">
                      {security.marketCap
                        ? formatCurrencyWithCommas(
                            security.marketCap,
                            security.currency,
                          )
                        : t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("traded_volume")}
                    </p>
                    <p className="text-sm">
                      {security.tradedVolume?.toLocaleString() ||
                        t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("traded_value")}
                    </p>
                    <p className="text-sm">
                      {security.tradedValue
                        ? formatCurrencyWithCommas(
                            security.tradedValue,
                            security.currency,
                          )
                        : t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("listed_shares")}
                    </p>
                    <p className="text-sm">
                      {security.listedShares?.toLocaleString() ||
                        t("not_available")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div
                hidden={security.securityType === "Fund"}
                className="pt-4 border-t space-y-4"
              >
                <h3 className="text-sm font-medium">
                  {t("financial_metrics")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("pe_ratio")}
                    </p>
                    <p className="text-sm">
                      {security.priceEarningRatio?.toFixed(2) ||
                        t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("dividend_yield")}
                    </p>
                    <p className="text-sm">
                      {security.dividendYield
                        ? `${security.dividendYield.toFixed(2)}%`
                        : t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("par_value")}
                    </p>
                    <p className="text-sm">
                      {security.parValue
                        ? formatCurrencyWithCommas(
                            security.parValue,
                            security.currency,
                          )
                        : t("not_available")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dividend */}
              <div
                hidden={security.securityType === "Fund"}
                className="pt-4 border-t space-y-4"
              >
                <h3 className="text-sm font-medium">{t("dividend")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("coupon_payment_date")}
                    </p>
                    <p className="text-sm">
                      {security.couponPaymentDate
                        ? security.couponPaymentDate
                        : t("not_available")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("coupon_number")}
                    </p>
                    <p className="text-sm">{security.couponNo}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("cash_dividends")}
                    </p>
                    <p className="text-sm">{security.cashDividends}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-medium">{t("description")}</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {security.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="position">
          <Card className="mb-16 md:mb-4">
            <CardHeader>
              <CardTitle className="text-md">{t("my_position")}</CardTitle>
              <CardDescription className="text-xs">
                {`${t("your_current_investment_in")} ${securityName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasPosition ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("shares_owned")}
                      </p>
                      <p className="text-xs font-medium">
                        {totalSharesOwned.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("avg_cost")}
                      </p>
                      <p className="text-xs font-medium">
                        {formatCurrencyWithCommas(
                          averagePurchasePrice,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("total_cost")}
                      </p>
                      <p className="text-xs font-medium">
                        {formatCurrencyWithCommas(
                          totalCostBasis,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("market_value")}
                      </p>
                      <p className="text-xs font-medium">
                        {formatCurrencyWithCommas(
                          totalInvestmentValue,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{t("total_return")}</p>
                      <div className="text-end">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            isProfitable ? "text-accent" : "text-destructive",
                          )}
                        >
                          {formatCurrencyWithCommas(PnL, displayCurrency)}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            isProfitable ? "text-accent" : "text-destructive",
                          )}
                        >
                          {isProfitable ? "+" : ""}
                          {PnLPercentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {t("you_dont_have_a_position_in_this_security_yet")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="mb-16 md:mb-4">
            <CardHeader>
              <CardTitle className="text-md">
                {t("transaction_history")}
              </CardTitle>
              <CardDescription className="text-xs">
                {`${t("all_buy_sell_and_dividend_records_for")} ${securityName}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length > 0 ? (
                <div>
                  {transactions.map((tx) => {
                    return (
                      <div
                        key={tx.id}
                        className="p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {t(tx.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateDisplay(tx.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              asChild
                            >
                              <Link
                                href={`/investments/security/edit/${tx.id}`}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span className="sr-only">{t("Edit")}</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive/70 hover:text-destructive"
                              onClick={() =>
                                handleDeleteConfirmation(
                                  tx as unknown as Transaction,
                                )
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">{t("Delete")}</span>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs ">
                          <div>
                            <p className="text-muted-foreground">
                              {`${security.securityType === "Fund" ? t("units") : t("shares")}`}
                            </p>
                            <p className="font-medium">
                              {Math.abs(tx.quantity).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">
                              {t("avg_cost")}
                            </p>
                            <p className="font-medium">
                              {formatCurrencyWithCommas(
                                tx.averagePurchasePrice,
                                displayCurrency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-muted-foreground">
                              {t("price_per_unit")}
                            </p>
                            <p className="font-medium">
                              {formatCurrencyWithCommas(
                                tx.pricePerUnit,
                                displayCurrency,
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">{t("fees")}</p>
                            <p className="font-medium">
                              {formatCurrencyWithCommas(
                                tx.fees,
                                displayCurrency,
                              )}
                            </p>
                          </div>

                          <div className="col-span-2 border-t pt-2 mt-2">
                            <p className="text-muted-foreground">
                              {t("total_amount")}
                            </p>
                            <p className="text-sm font-medium">
                              {formatCurrencyWithCommas(
                                Math.abs(tx.amount),
                                displayCurrency,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {t("no_transactions_recorded_yet")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("add_your_first_transaction_to_get_started")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("are_you_sure_you_want_to_delete_this_sell_transaction")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`${t("this_will_remove_the_record_of_selling")} ${transactionToDelete?.quantity?.toLocaleString()} ${security?.securityType === "Fund" ? "units" : "shares"} ${t("of")} ${securityName} ${t("on")} ${transactionToDelete ? formatDateDisplay(transactionToDelete.date) : ""}`}
              {t(
                "this_action_will_reverse_its_impact_on_your_total_realized_pl_it_will_not_automatically_add_the_shares_back_to_your_holdings_you_may_need_to_reenter_purchases_or_adjust_existing_ones_if_this_sale_previously_depleted_them_this_action_cannot_be_undone",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSellTransaction}
              className={buttonVariants({ variant: "destructive" })}
            >
              {t("delete_transaction")}
            </AlertDialogAction>
          </AlertDialogFooter>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("are_you_sure_you_want_to_delete_this_sell_transaction")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`${t("this_will_remove_the_record_of_selling")} ${transactionToDelete?.quantity?.toLocaleString()} ${security?.securityType === "Fund" ? "units" : "shares"} ${t("of")} ${securityName} ${t("on")} ${transactionToDelete ? formatDateDisplay(transactionToDelete.date) : ""}`}
              {t(
                "this_action_will_reverse_its_impact_on_your_total_realized_pl_it_will_not_automatically_add_the_shares_back_to_your_holdings_you_may_need_to_reenter_purchases_or_adjust_existing_ones_if_this_sale_previously_depleted_them_this_action_cannot_be_undone",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSellTransaction}
              className={buttonVariants({ variant: "destructive" })}
            >
              {t("delete_transaction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
