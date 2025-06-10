"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities"; // Import the hook
import type { StockInvestment } from "@/lib/types"; // Import Investment type
import { MyStockListItem } from "./my-stock-list-item";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isStockRelatedFund } from "@/lib/utils"; // Import the utility function
import { getAllOfflineInvestments } from "@/lib/offline-investment-storage";

export function MyStockList() {
  const { investments, isLoading: isLoadingInvestments } = useInvestments();
  const { listedSecurities, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const [offlineInvestments, setOfflineInvestments] = React.useState<
    StockInvestment[]
  >([]);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (isOffline) {
      getAllOfflineInvestments().then((pending) => {
        setOfflineInvestments(
          pending.filter(
            (inv) =>
              inv.type === "Stocks" &&
              typeof inv.numberOfShares === "number" &&
              typeof inv.purchaseFees === "number",
          ) as StockInvestment[],
        );
      });
    } else {
      setOfflineInvestments([]);
    }
  }, [isOffline]);

  const allInvestments = React.useMemo(() => {
    return isOffline ? [...investments, ...offlineInvestments] : investments;
  }, [investments, offlineInvestments, isOffline]);

  const stockInvestments = React.useMemo(() => {
    if (isLoadingInvestments || isLoadingListedSecurities) return [];

    return allInvestments.filter((inv): inv is StockInvestment => {
      // Only process investments that have a tickerSymbol (i.e., StockInvestment)
      if (!("tickerSymbol" in inv) || typeof inv.tickerSymbol !== "string") {
        return false;
      }

      // Find the corresponding listed security for the investment
      const listedSecurity = listedSecurities.find(
        (ls) => ls.symbol === inv.tickerSymbol,
      );

      if (!listedSecurity) {
        // If no listed security is found, exclude the investment
        return false;
      }

      // Apply the filter condition based on the listed security's type and fundType
      const isStock = listedSecurity.securityType === "Stock";
      const isStockFund =
        listedSecurity.securityType === "Fund" &&
        isStockRelatedFund(listedSecurity.fundType);

      return isStock || isStockFund;
    });
  }, [
    allInvestments,
    listedSecurities,
    isLoadingInvestments,
    isLoadingListedSecurities,
  ]); // Add dependencies

  // Update loading state to consider both hooks
  const isLoading = isLoadingInvestments || isLoadingListedSecurities;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (stockInvestments.length === 0) {
    return (
      <Alert>
        <LineChart className="h-4 w-4" />
        <AlertTitle>No Stock Investments Yet!</AlertTitle>
        <AlertDescription>
          You haven't added any stock investments to your portfolio.
          <Button asChild variant="link" className="px-1">
            <Link href="/investments/add?type=Stocks">
              Add your first stock
            </Link>
          </Button>
          or browse available stocks via the "+" button.
        </AlertDescription>
      </Alert>
    );
  }

  // Group investments by ticker symbol to aggregate
  const aggregatedStocks: {
    [key: string]: {
      investments: StockInvestment[];
      totalShares: number;
      totalCost: number;
      logoUrl?: string;
      actualStockName?: string;
    };
  } = {};

  stockInvestments.forEach((inv) => {
    if (inv.tickerSymbol) {
      if (!aggregatedStocks[inv.tickerSymbol]) {
        aggregatedStocks[inv.tickerSymbol] = {
          investments: [],
          totalShares: 0,
          totalCost: 0,
          logoUrl: inv.stockLogoUrl,
          actualStockName: inv.actualStockName,
        };
      }
      aggregatedStocks[inv.tickerSymbol].investments.push(inv);
      aggregatedStocks[inv.tickerSymbol].totalShares += inv.numberOfShares || 0;
      aggregatedStocks[inv.tickerSymbol].totalCost +=
        (inv.numberOfShares || 0) * (inv.purchasePricePerShare || 0);
    }
  });

  return (
    <div className="space-y-4">
      {Object.entries(aggregatedStocks).map(([tickerSymbol, data]) => {
        const avgPurchasePrice =
          data.totalShares > 0 ? data.totalCost / data.totalShares : 0;
        // Find a representative stock item for details like logo, name, ID for linking
        // Prefer a listed stock that matches this symbol for linking to its detail page
        // This part needs to connect to listedStocks to get the ID for the link.
        // For now, MyStockListItem might not link to detail or link differently.
        // Let's assume MyStockListItem takes aggregated data.
        const representativeInvestment = data.investments[0];

        return (
          <MyStockListItem
            key={tickerSymbol}
            symbol={tickerSymbol}
            name={data.actualStockName || tickerSymbol}
            logoUrl={data.logoUrl || "https://placehold.co/40x40.png"}
            totalShares={data.totalShares}
            averagePurchasePrice={avgPurchasePrice}
            // Pass a stock ID if available to link to detail page
            // This requires finding the corresponding ListedStock ID.
            // For now, we'll omit direct linking from MyStockListItem to StockDetail.
            // listedsecurityId={findListedsecurityIdBySymbol(tickerSymbol)} // Placeholder for logic
          />
        );
      })}
    </div>
  );
}
