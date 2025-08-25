"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatNumberForMobile } from "@/lib/utils";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

type CurrencyRatesDialogProps = {
  // No props needed as we're managing state internally now
};

export function CurrencyRatesDialog() {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { exchangeRates, isLoading, error } = useExchangeRates();
  const [open, setOpen] = React.useState(false);

  // Process and sort all exchange rates
  const rates = React.useMemo(() => {
    return Object.entries(exchangeRates || {})
      .filter(([key]) => key.includes('_')) // Only include valid currency pairs
      .map(([pair, rate]) => {
        const [from, to] = pair.split('_');
        return { pair, from, to, rate: rate as number };
      })
      .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  }, [exchangeRates]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <SheetHeader>
            <SheetTitle>{t("loading")}...</SheetTitle>
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
          <SheetHeader>
            <SheetTitle>{t("error")}</SheetTitle>
          </SheetHeader>
          <div className="py-4 text-destructive">
            <p>{t("error_loading_exchange_rates")}</p>
          </div>
        </>
      );
    }

    return (
      <>
        <SheetHeader className="flex-shrink-0 p-6 pb-3">
          <SheetTitle>{t("all_currency_rates")} (vs EGP)</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 -mx-1">
          <div className="space-y-3 pr-1">
            {rates.map(({ pair, from, to, rate }) => (
              <div key={pair} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
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
                        {t("rate")}: {formatNumberForMobile(isMobile, rate, to)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">1 {from}</p>
                    <p className="text-sm text-muted-foreground">
                      = {formatNumberForMobile(isMobile, rate, to)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    1 {to} = {formatNumberForMobile(isMobile, 1 / rate, from)}
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
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DollarSign className="h-4 w-4" />
          {t("show_all_rates")}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={cn(
          "flex flex-col p-0",
          isMobile ? "h-[90vh] max-h-[90vh]" : "h-full max-h-screen"
        )}
      >
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
