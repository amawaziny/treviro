"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type {
  RealEstateInvestment,
  StockInvestment,
  ListedSecurity,
} from "@/lib/types";
import { isRealEstateRelatedFund } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  Building,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { cn, formatNumberWithSuffix } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { MyRealEstateListItem } from "@/components/investments/real-estate/my-real-estate-list-item";

export default function MyRealEstatePage() {
  const {
    investments,
    isLoading: isLoadingInvestments,
    removeRealEstateInvestment,
  } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const router = useRouter();

  const directRealEstateHoldings = React.useMemo(() => {
    return investments.filter(
      (inv) => inv.type === "Real Estate",
    ) as RealEstateInvestment[];
  }, [investments]);

  const realEstateFundHoldings = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    const stockInvestments = investments.filter(
      (inv) => inv.type === "Stocks",
    ) as StockInvestment[];

    return stockInvestments
      .map((stockInv) => {
        const security = listedSecurities.find(
          (ls) => ls.symbol === stockInv.tickerSymbol,
        );
        if (
          security &&
          security.securityType === "Fund" &&
          isRealEstateRelatedFund(security.fundType)
        ) {
          const totalCost =
            (stockInv.numberOfShares || 0) *
            (stockInv.purchasePricePerShare || 0);
          const currentValue =
            (stockInv.numberOfShares || 0) * (security.price || 0);
          const profitLoss = currentValue - totalCost;
          const profitLossPercent =
            totalCost > 0
              ? (profitLoss / totalCost) * 100
              : currentValue > 0
                ? Infinity
                : 0;
          return {
            ...stockInv,
            fundDetails: security,
            totalCost,
            currentValue,
            profitLoss,
            profitLossPercent,
          };
        }
        return null;
      })
      .filter(Boolean) as (StockInvestment & {
      fundDetails: ListedSecurity;
      totalCost: number;
      currentValue: number;
      profitLoss: number;
      profitLossPercent: number;
    })[];
  }, [
    investments,
    listedSecurities,
    isLoadingInvestments,
    isLoadingListedSecurities,
  ]);

  const totalFundPnL = React.useMemo(() => {
    return realEstateFundHoldings.reduce(
      (sum, fund) => sum + (fund.profitLoss || 0),
      0,
    );
  }, [realEstateFundHoldings]);

  const totalFundCost = React.useMemo(() => {
    return realEstateFundHoldings.reduce(
      (sum, fund) => sum + (fund.totalCost || 0),
      0,
    );
  }, [realEstateFundHoldings]);

  const totalFundPnLPercent =
    totalFundCost > 0
      ? (totalFundPnL / totalFundCost) * 100
      : totalFundPnL !== 0
        ? Infinity
        : 0;
  const isTotalFundProfitable = totalFundPnL >= 0;

  const totalDirectRealEstateInvested = React.useMemo(() => {
    return directRealEstateHoldings.reduce(
      (sum, item) => sum + (item.amountInvested || 0),
      0,
    );
  }, [directRealEstateHoldings]);

  const totalInvestedInRealEstate =
    totalDirectRealEstateInvested + totalFundCost;

  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  const formatCurrencyEGP = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value))
      return "EGP 0.00";
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatSecurityCurrency = (
    value: number | undefined,
    currencyCode: string = "EGP",
  ) => {
    if (value === undefined || value === null || isNaN(value))
      return `${currencyCode} 0.00`;
    const digits = currencyCode === "EGP" ? 2 : 2;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  };

  const formatCurrencyWithSuffix = (
    value: number | undefined,
    currencyCode: string = "EGP",
  ) => {
    if (value === undefined || value === null || isNaN(value))
      return `${currencyCode} 0`;
    const formattedNumber = formatNumberWithSuffix(value);
    return `${currencyCode} ${formattedNumber}`;
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
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="mt-4">
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-56px)] pb-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Real Estate
        </h1>
        <p className="text-muted-foreground text-sm">
          Overview of your direct real estate and real estate fund investments.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Real Estate P/L (Funds)
          </CardTitle>
          {isTotalFundProfitable ? (
            <TrendingUp className="h-4 w-4 text-accent" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-2xl font-bold",
              isTotalFundProfitable ? "text-accent" : "text-destructive",
            )}
          >
            {isMobile
              ? formatCurrencyWithSuffix(
                  totalFundPnL,
                  realEstateFundHoldings[0]?.fundDetails.currency || "EGP",
                )
              : formatSecurityCurrency(
                  totalFundPnL,
                  realEstateFundHoldings[0]?.fundDetails.currency || "EGP",
                )}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalFundPnLPercent === Infinity
              ? "∞"
              : totalFundPnLPercent.toFixed(2)}
            % overall P/L from funds
          </p>
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total Invested in Real Estate:
              </span>
              <span className="font-semibold">
                {isMobile
                  ? formatCurrencyWithSuffix(totalInvestedInRealEstate)
                  : formatCurrencyEGP(totalInvestedInRealEstate)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                (Direct: {formatCurrencyEGP(totalDirectRealEstateInvested)})
              </span>
              <span>
                (Funds:{" "}
                {formatSecurityCurrency(
                  totalFundCost,
                  realEstateFundHoldings[0]?.fundDetails.currency || "EGP",
                )}
                )
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {directRealEstateHoldings.length > 0 ? (
        <div className="space-y-4 mt-6">
          {directRealEstateHoldings.map((investment) => (
            <MyRealEstateListItem key={investment.id} investment={investment} />
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="mr-2 h-4 w-4 text-primary" />
              No Direct Real Estate Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4 text-center">
              You haven't added any direct real estate investments yet.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-4 w-4 text-primary" />
            Real Estate Fund Investments (REITs, etc.)
          </CardTitle>
          <CardDescription>
            Funds primarily investing in real estate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realEstateFundHoldings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className={cn(language === "ar" ? "text-end" : "text-left")}
                  >
                    Fund Name (Symbol)
                  </TableHead>
                  <TableHead className="text-end">Units Held</TableHead>
                  <TableHead className="text-end">
                    Avg. Purchase Price
                  </TableHead>
                  <TableHead className="text-end">Total Invested</TableHead>
                  <TableHead className="text-end">
                    Current Market Price
                  </TableHead>
                  <TableHead className="text-end">Current Value</TableHead>
                  <TableHead className="text-end">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realEstateFundHoldings.map((fundInv) => {
                  const displayCurrency = fundInv.fundDetails.currency || "EGP";
                  const avgPurchasePrice =
                    fundInv.numberOfShares &&
                    fundInv.numberOfShares > 0 &&
                    fundInv.totalCost
                      ? fundInv.totalCost / fundInv.numberOfShares
                      : 0;

                  return (
                    <TableRow key={fundInv.id}>
                      <TableCell
                        className={cn(
                          language === "ar" ? "text-end" : "text-left",
                        )}
                      >
                        {fundInv.fundDetails.name} ({fundInv.fundDetails.symbol}
                        )
                      </TableCell>
                      <TableCell className="text-end">
                        {fundInv.numberOfShares?.toLocaleString() || "N/A"}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatSecurityCurrency(
                          avgPurchasePrice,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatSecurityCurrency(
                          fundInv.totalCost,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatSecurityCurrency(
                          fundInv.fundDetails.price || 0,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {formatSecurityCurrency(
                          fundInv.currentValue,
                          displayCurrency,
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-end font-semibold",
                          fundInv.profitLoss >= 0
                            ? "text-accent"
                            : "text-destructive",
                        )}
                      >
                        {formatSecurityCurrency(
                          fundInv.profitLoss,
                          displayCurrency,
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              No real estate-related fund investments found.
            </p>
          )}
        </CardContent>
      </Card>
      <Link href="/investments/add?type=Real Estate" passHref>
      <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new real estate investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
