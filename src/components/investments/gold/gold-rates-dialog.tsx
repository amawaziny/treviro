"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGoldMarketPrices } from "@/hooks/use-gold-market-prices";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem } from "lucide-react";

export function GoldRatesDialog() {
  const [open, setOpen] = useState(false);
  const { goldMarketPrices, isLoading } = useGoldMarketPrices();

  const rates = [
    { 
      name: "24 Karat (per gram)", 
      value: goldMarketPrices?.pricePerGramK24, 
      currency: "EGP" 
    },
    { 
      name: "21 Karat (per gram)", 
      value: goldMarketPrices?.pricePerGramK21, 
      currency: "EGP" 
    },
    { 
      name: "Gold Pound", 
      value: goldMarketPrices?.pricePerGoldPound, 
      currency: "EGP" 
    },
    { 
      name: "24 Karat (per ounce)", 
      value: goldMarketPrices?.pricePerOunceK24, 
      currency: "EGP" 
    },
  ].filter(rate => rate.value !== undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <Gem className="h-4 w-4" />
          <span>View Gold Rates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-yellow-500" />
            Gold Market Rates
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {rates.map((rate) => (
                <div
                  key={rate.name}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {rate.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {rate.value?.toLocaleString() || 'N/A'} {rate.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Prices are updated periodically
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
