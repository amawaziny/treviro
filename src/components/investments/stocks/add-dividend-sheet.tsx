"use client";
import { useLanguage } from "@/contexts/language-context";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AddDividendSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, date: string) => Promise<void>;
  defaultDate?: string;
}

export function AddDividendSheet({
  open,
  onOpenChange,
  onSubmit,
  defaultDate,
}: AddDividendSheetProps) {
  const { t, dir } = useLanguage();
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(
    defaultDate || new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: t("invalid_amount"),
        description: t("please_enter_a_valid_dividend_amount"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await onSubmit(Number(amount), date);
      onOpenChange(false);
      setAmount("");
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("failed_to_add_dividend"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-w-full w-full sm:w-[400px] mx-auto rounded-t-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SheetHeader className="sm:text-center">
            <SheetTitle>{t("add_dividend")}</SheetTitle>
            <SheetDescription>
              {t(
                "record_a_dividend_payment_for_this_stock_this_will_increase_your_cash_balance_and_be_reflected_in_this_months_income",
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="dividend-amount" className="font-medium">
              {t("amount")}
            </label>
            <Input
              id="dividend-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("Enter dividend amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="dividend-date" className="font-medium">
              {t("Date")}
            </label>
            <Input
              id="dividend-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <SheetFooter className="gap-2">
            <SheetClose asChild>
              <Button type="button" variant="ghost" className="w-full">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("saving") : t("add_dividend")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
