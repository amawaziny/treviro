"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useGoldMarketPrices } from "@/hooks/use-gold-market-prices";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function GoldRatesDialog() {
  const { t, dir } = useLanguage();
  const { goldMarketPrices, isLoading, isRefreshing, refreshRates } = useGoldMarketPrices();
  const [open, setOpen] = React.useState(false);

  const rates = [
    { 
      name: t("24_karat_gram"), 
      value: goldMarketPrices?.pricePerGramK24, 
      currency: "EGP" 
    },
    { 
      name: t("21_karat_gram"), 
      value: goldMarketPrices?.pricePerGramK21, 
      currency: "EGP" 
    },
    { 
      name: t("gold_pound"), 
      value: goldMarketPrices?.pricePerGoldPound, 
      currency: "EGP" 
    },
    { 
      name: t("24_karat_ounce"), 
      value: goldMarketPrices?.pricePerOunceK24, 
      currency: "EGP" 
    },
  ].filter(rate => rate.value !== undefined);

  const sheetSide = dir === "rtl" ? "left" : "right";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Gem className="h-4 w-4" />
          <span>{t("view_gold_rates")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side={sheetSide} className="w-full sm:max-w-md">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-yellow-500" />
              {t("gold_market_rates")}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshRates}
              disabled={isRefreshing || isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {rates.map((rate) => (
                <div
                  key={rate.name}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{rate.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">
                      {rate.value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 'N/A'} {rate.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center pt-2">
            {t("prices_updated_periodically")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
