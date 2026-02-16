"use client";

import React from "react";
import { useInvestments } from "@/contexts/investment-context";
import { formatNumberForMobile } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, Plus, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhysicalGoldListItem } from "@/components/investments/gold/my-gold-list-item";
import { GoldRatesDialog } from "@/components/investments/gold/gold-rates-dialog";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";

export default function MyGoldPage() {
  const { t, language } = useLanguage();
  const { goldInvestments, goldFundInvestments, totalGold, isLoading } =
    useInvestments();

  const isMobile = useIsMobile();

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
          {t("gold")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("overview_of_your_direct_gold_and_gold_fund_investments")}
        </p>
      </div>
      <Separator />
      <div className="flex justify-end">
        <GoldRatesDialog />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_gold_pl")}
          </CardTitle>
          {totalGold.unrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-accent" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-xl font-bold",
              totalGold.unrealizedPnL >= 0 ? "text-accent" : "text-destructive",
            )}
          >
            {formatNumberForMobile(isMobile, totalGold.unrealizedPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            {`${
              totalGold.unrealizedPnLPercent === Infinity
                ? "∞"
                : totalGold.unrealizedPnLPercent.toFixed(2)
            }% ${t("overall_pl")}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {`${t("total_invested")}: `}
            <span
              className="font-medium text-foreground"
              data-testid="total-invested-amount"
            >
              {formatNumberForMobile(isMobile, totalGold.totalInvested)}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gem className="me-2 h-4 w-4 text-primary" />
            {t("physical_gold_holdings")}
          </CardTitle>
          <CardDescription>
            <p>{`${t("k24_k21_pound_ounce_you_own_physically")}`}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {goldInvestments.length > 0 ? (
            <div className="space-y-4">
              {goldInvestments.map((inv) => (
                <PhysicalGoldListItem key={inv.id} holding={inv} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_gold_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6" style={{ marginBottom: "96px" }}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gem className="me-2 h-4 w-4 text-primary" />
            {t("gold_fund_holdings")}
          </CardTitle>
          <CardDescription>
            <p>{`${t("funds_invested_in_gold")}`}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {goldFundInvestments.length > 0 ? (
            <div className="space-y-4">
              {goldFundInvestments.map((holding) => {
                return (
                  <InvestmentSecurityCard
                    key={holding.id}
                    investment={holding}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_gold_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>

      <Link href="/investments/buy-new?type=Gold" passHref>
        <Button
          variant="default"
          size="icon"
          className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
          aria-label="Add new gold investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
