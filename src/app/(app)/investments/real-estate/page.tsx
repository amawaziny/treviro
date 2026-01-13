"use client";

import React from "react";
import { useInvestments } from "@/contexts/investment-context";
import { InvestmentSecurityCard } from "@/components/investments/investment-security-card";
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
import { Home, Building, Plus, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { MyRealEstateListItem } from "@/components/investments/real-estate/my-real-estate-list-item";

export default function MyRealEstatePage() {
  const { t, language } = useLanguage();
  const {
    realEstateInvestments,
    realEstateFundInvestments,
    totalRealEstate,
    deleteInvestment,
    isLoading,
  } = useInvestments();
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
          {t("real_estate")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            "overview_of_your_direct_real_estate_and_real_estate_fund_investments",
          )}
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_real_estate_pl_funds")}
          </CardTitle>
          {totalRealEstate.unrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-accent" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-xl font-bold",
              totalRealEstate.unrealizedPnL >= 0
                ? "text-accent"
                : "text-destructive",
            )}
          >
            {formatNumberForMobile(isMobile, totalRealEstate.unrealizedPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalRealEstate.unrealizedPnLPercent === Infinity
              ? "∞"
              : totalRealEstate.unrealizedPnLPercent.toFixed(2)}
            {t("overall_pl")}
          </p>
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("total_invested_in_real_estate")}
              </span>
              <span className="font-semibold">
                {formatNumberForMobile(isMobile, totalRealEstate.totalInvested)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex">
            <Home className="me-2 h-4 w-4 text-primary" />
            {t("direct_real_estate_holdings")}
          </CardTitle>
          <CardDescription>
            {t("residential_touristic_commercial_land_you_own_directly")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realEstateInvestments.length > 0 ? (
            <div className="space-y-4">
              {realEstateInvestments.map((investment) => (
                <MyRealEstateListItem
                  key={investment.id}
                  investment={investment}
                  removeRealEstateInvestment={deleteInvestment}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("you_havent_added_any_direct_real_estate_investments_yet")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex">
            <Building className="me-2 h-4 w-4 text-primary" />
            {t("real_estate_fund_investments_reits_etc")}
          </CardTitle>
          <CardDescription>
            {t("funds_primarily_investing_in_real_estate")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realEstateFundInvestments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {realEstateFundInvestments.map((fundInv) => {
                return (
                  <InvestmentSecurityCard
                    key={fundInv.id}
                    investment={fundInv}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              {t("no_real_estaterelated_fund_investments_found")}
            </p>
          )}
        </CardContent>
      </Card>
      <div style={{ marginBottom: "96px" }}></div>
      <Link href="/investments/buy-new?type=Real Estate" passHref>
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
