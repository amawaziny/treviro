"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AddDividendSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, date: string) => Promise<void>;
  defaultDate?: string;
}

export function AddDividendSheet({ open, onOpenChange, onSubmit, defaultDate }: AddDividendSheetProps) {
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(defaultDate || new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid dividend amount.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await onSubmit(Number(amount), date);
      onOpenChange(false);
      setAmount("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add dividend.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-full w-full sm:w-[400px] mx-auto rounded-t-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Add Dividend</SheetTitle>
            <SheetDescription>Record a dividend payment for this stock. This will increase your cash balance and be reflected in this month's income.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="dividend-amount" className="font-medium">Amount</label>
            <Input
              id="dividend-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter dividend amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="dividend-date" className="font-medium">Date</label>
            <Input
              id="dividend-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <SheetFooter>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Add Dividend"}</Button>
            <SheetClose asChild>
              <Button type="button" variant="ghost" className="w-full">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
