"use client";

import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities"; // Import the hook
import type { StockInvestment } from "@/lib/types"; // Import Investment type
import { InvestmentSecurityCard } from "../investment-security-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Map each stock investment to its corresponding security and render the card
  return (
    <div className="space-y-4">
      {stockInvestments.map((investment) => {
        if (!investment.tickerSymbol) return null;
        
        const listedSecurity = listedSecurities.find(
          (ls) => ls.symbol === investment.tickerSymbol
        );

        if (!listedSecurity) return null;

        return (
          <InvestmentSecurityCard
            key={`${investment.id}-${investment.tickerSymbol}`}
            security={listedSecurity}
            investment={investment}
          />
        );
      })}
    </div>
  );
}
