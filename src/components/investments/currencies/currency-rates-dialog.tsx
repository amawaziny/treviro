"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatNumberForMobile } from "@/lib/utils";
import { DollarSign, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyCode } from "@/lib/types";

export function CurrencyRatesDialog() {
  const { t, dir } = useLanguage();
  const isMobile = useIsMobile();
  const sheetSide = dir === "rtl" ? "left" : "right";
  const { exchangeRates, isLoading, isRefreshing, error, refreshRates } =
    useExchangeRates();
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Process, filter and sort all exchange rates
  const rates = React.useMemo(() => {
    const allRates = Object.entries(exchangeRates || {})
      .filter(([key]) => key.includes("_")) // Only include valid currency pairs
      .map(([pair, rate]) => {
        const [from, to] = pair.split("_");
        return { pair, from, to, rate: rate as number };
      });

    // Filter based on search term
    const filtered = searchTerm
      ? allRates.filter(
          ({ from, to }) =>
            from.toLowerCase().includes(searchTerm.toLowerCase()) ||
            to.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${from}/${to}`.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : allRates;

    // Sort the filtered results
    return filtered.sort(
      (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
    );
  }, [exchangeRates, searchTerm]);

  const renderSearchBar = () => (
    <div className="sticky top-0 z-10 p-4 bg-background border-b">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("search_currencies_placeholder")}
          className="w-full pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <SheetHeader dir={dir}>
            <SheetTitle dir={dir}>{t("loading")}...</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <p>{t("loading_exchange_rates")}</p>
          </div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <SheetHeader dir={dir}>
            <SheetTitle dir={dir}>{t("error")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 text-destructive">
            <p>{t("error_loading_exchange_rates")}</p>
          </div>
        </>
      );
    }

    return (
      <>
        <SheetHeader dir={dir} className="flex-shrink-0 p-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle dir={dir}>{t("all_currency_rates")}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshRates}
              disabled={isLoading || isRefreshing}
              className={cn("h-8 w-8", isRefreshing && "animate-spin")}
              title={t("refresh_rates")}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "opacity-50")}
              />
              <span className="sr-only">{t("refresh_rates")}</span>
            </Button>
          </div>
        </SheetHeader>
        {renderSearchBar()}
        <div className="flex-1 overflow-y-auto -mx-1">
          <div className="space-y-3 pr-1">
            {rates.map(({ pair, from, to, rate }) => (
              <div
                key={pair}
                className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-primary">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {from} / {to}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("rate")}:{" "}
                        {formatNumberForMobile(
                          isMobile,
                          rate,
                          to as CurrencyCode,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">1 {from}</p>
                    <p className="text-sm text-muted-foreground">
                      ={" "}
                      {formatNumberForMobile(
                        isMobile,
                        rate,
                        to as CurrencyCode,
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    1 {to} ={" "}
                    {formatNumberForMobile(
                      isMobile,
                      1 / rate,
                      from as CurrencyCode,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger dir={dir} asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DollarSign className="h-4 w-4" />
          {t("show_all_rates")}
        </Button>
      </SheetTrigger>
      <SheetContent
        dir={dir}
        side={isMobile ? "bottom" : sheetSide}
        className={cn(
          "flex flex-col p-0 overflow-hidden",
          isMobile ? "h-[90vh] max-h-[90vh]" : "h-full max-h-screen",
          dir === "rtl" ? "rtl" : "ltr",
        )}
      >
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
