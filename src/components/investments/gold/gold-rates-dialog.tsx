"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useGoldMarketPrices } from "@/hooks/use-gold-market-prices";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function GoldRatesDialog() {
  const { t, dir } = useLanguage();
  const { goldMarketPrices, isLoading, isRefreshing, refreshRates } =
    useGoldMarketPrices();
  const [open, setOpen] = React.useState(false);

  const rates = [
    // Gram prices
    {
      name: t("24_karat_gram"),
      value: goldMarketPrices?.pricePerGramK24,
      currency: "EGP",
    },
    {
      name: t("22_karat_gram"),
      value: goldMarketPrices?.pricePerGramK22,
      currency: "EGP",
    },
    {
      name: t("21_karat_gram"),
      value: goldMarketPrices?.pricePerGramK21,
      currency: "EGP",
    },
    {
      name: t("18_karat_gram"),
      value: goldMarketPrices?.pricePerGramK18,
      currency: "EGP",
    },
    {
      name: t("14_karat_gram"),
      value: goldMarketPrices?.pricePerGramK14,
      currency: "EGP",
    },
    {
      name: t("12_karat_gram"),
      value: goldMarketPrices?.pricePerGramK12,
      currency: "EGP",
    },
    {
      name: t("10_karat_gram"),
      value: goldMarketPrices?.pricePerGramK10,
      currency: "EGP",
    },
    {
      name: t("9_karat_gram"),
      value: goldMarketPrices?.pricePerGramK9,
      currency: "EGP",
    },
    {
      name: t("8_karat_gram"),
      value: goldMarketPrices?.pricePerGramK8,
      currency: "EGP",
    },
    {
      name: t("gold_pound"),
      value: goldMarketPrices?.pricePerGoldPound,
      currency: "EGP",
    },
    // Ounce prices
    {
      name: t("24_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK24,
      currency: "EGP",
    },
    {
      name: t("22_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK22,
      currency: "EGP",
    },
    {
      name: t("21_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK21,
      currency: "EGP",
    },
    {
      name: t("18_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK18,
      currency: "EGP",
    },
    {
      name: t("14_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK14,
      currency: "EGP",
    },
    {
      name: t("12_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK12,
      currency: "EGP",
    },
    {
      name: t("10_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK10,
      currency: "EGP",
    },
    {
      name: t("9_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK9,
      currency: "EGP",
    },
    {
      name: t("8_karat_ounce"),
      value: goldMarketPrices?.pricePerOunceK8,
      currency: "EGP",
    },
  ].filter((rate) => rate.value !== undefined);

  const [searchTerm, setSearchTerm] = React.useState("");
  const isMobile = useIsMobile();
  const sheetSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  // Filter rates based on search term
  interface RateItem {
    name: string;
    value: number | undefined;
    currency: string;
  }

  const filteredRates = React.useMemo<RateItem[]>(() => {
    if (!searchTerm) return rates;
    return rates.filter((rate: RateItem) =>
      rate.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rates, searchTerm]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger dir={dir} asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Gem className="h-4 w-4" />
          <span>{t("view_gold_rates")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        dir={dir}
        side={isMobile ? "bottom" : sheetSide}
        className={cn(
          "flex flex-col p-0 overflow-hidden",
          isMobile ? "h-[90vh] max-h-[90vh]" : "h-full max-h-screen",
          dir === "rtl" ? "rtl" : "ltr",
          isMobile && "rounded-t-xl"
        )}
      >
        <SheetHeader dir={dir} className="flex-shrink-0 p-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle dir={dir} className="flex items-center gap-2">
              {t("gold_market_rates")}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshRates}
              disabled={isRefreshing || isLoading}
              className="h-8 w-8"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </SheetHeader>

        {/* Search Bar */}
        <div className="relative px-6 pt-4 pb-2 border-b">
          <Search className="absolute left-9 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("search_gold_rates")}
            className="w-full pl-10"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1">
          <div className="space-y-3 px-6 py-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 19 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {t("no_rates_found")}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRates.map((rate) => (
                <div
                  key={rate.name}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/5 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{rate.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">
                      {rate.value?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      }) || "N/A"}{" "}
                      {rate.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("prices_updated_periodically")}
          </p>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
