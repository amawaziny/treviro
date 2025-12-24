"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import React from "react";
import { useInvestments } from "@/hooks/use-investments";
import { cn, formatNumberForMobile } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";

export default function MyStocksPage() {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const { stockInvestments, totalStocks, isLoading } = useInvestments();

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
      <div data-testid="stocks-header">
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
          data-testid="stocks-title"
        >
          {t("my_stocks_equity_funds")}
        </h1>
        <p
          className="text-muted-foreground text-sm"
          data-testid="stocks-subtitle"
        >
          {t("overview_of_your_stock_and_equity_fund_investments")}
        </p>
      </div>
      <Separator />

      {isLoading ? (
        <Card data-testid="loading-skeleton">
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="portfolio-summary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="pl-title">
              {t("total_stocks_equity_funds_pl")}
            </CardTitle>
            {totalStocks.unrealizedPnL >= 0 ? (
              <TrendingUp
                className="h-4 w-4 text-accent"
                data-testid="trend-up-icon"
              />
            ) : (
              <TrendingDown
                className="h-4 w-4 text-destructive"
                data-testid="trend-down-icon"
              />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-xl font-bold",
                totalStocks.unrealizedPnL >= 0
                  ? "text-accent"
                  : "text-destructive",
              )}
            >
              <span data-testid="total-pl-amount">
                {formatNumberForMobile(isMobile, totalStocks.unrealizedPnL)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {`${
                totalStocks.unrealizedPnL === Infinity
                  ? "∞"
                  : (
                      (totalStocks.unrealizedPnL / totalStocks.totalInvested) *
                      100
                    ).toFixed(2)
              }% ${t("overall_pl")}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {`${t("total_invested")}: `}
              <span
                className="font-medium text-foreground"
                data-testid="total-invested-amount"
              >
                {formatNumberForMobile(isMobile, totalStocks.totalInvested)}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
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
      ) : (
        <div className="space-y-4" data-testid="investments-list">
          {stockInvestments.map((investment) => {
            return (
              <InvestmentSecurityCard
                data-testid={`investment-card-${investment.id}`}
                key={`${investment.id}-${investment.securityId}`}
                investment={investment}
              />
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: "96px" }}></div>
      <Link href="/securities" passHref>
        <Button
          data-testid="add-security-button"
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Browse securities"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
