
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SellStockSchema, type SellStockFormValues } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useListedStocks } from "@/hooks/use-listed-stocks";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { ListedStock, StockInvestment } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SellStockFormProps {
  stockId: string;
}

export function SellStockForm({ stockId }: SellStockFormProps) {
  const { recordSellStockTransaction, investments, isLoading: isLoadingInvestmentsContext } = useInvestments();
  const { getListedStockById, isLoading: isLoadingListedStocks } = useListedStocks();
  const { toast } = useToast();
  const router = useRouter();

  const [stockBeingSold, setStockBeingSold] = useState<ListedStock | null>(null);
  const [maxSharesToSell, setMaxSharesToSell] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state for this form

  const form = useForm<SellStockFormValues>({
    resolver: zodResolver(SellStockSchema),
    defaultValues: {
      stockId: stockId,
      numberOfSharesToSell: undefined,
      sellPricePerShare: undefined,
      sellDate: getCurrentDate(),
      fees: 0,
    },
  });

  useEffect(() => {
    setIsLoading(true);
    async function fetchData() {
      const listedStockData = await getListedStockById(stockId);
      setStockBeingSold(listedStockData || null);

      if (listedStockData) {
        const userOwnedForThisSymbol = investments.filter(
          (inv) => inv.type === 'Stocks' && inv.tickerSymbol === listedStockData.symbol
        ) as StockInvestment[];
        
        const totalOwned = userOwnedForThisSymbol.reduce(
          (sum, inv) => sum + (inv.numberOfShares || 0),
          0
        );
        setMaxSharesToSell(totalOwned);
      }
      setIsLoading(false);
    }
    if (stockId && !isLoadingInvestmentsContext) { // Ensure investments are loaded before calculating max shares
        fetchData();
    } else if (!isLoadingInvestmentsContext) {
        setIsLoading(false); // If no stockId, or investments context finished loading but no stockId
    }

  }, [stockId, getListedStockById, investments, isLoadingInvestmentsContext]);
  
  // Update default sell price if stock data available
  useEffect(() => {
    if (stockBeingSold && stockBeingSold.price) {
        form.setValue("sellPricePerShare", stockBeingSold.price);
    }
  }, [stockBeingSold, form]);


  async function onSubmit(values: SellStockFormValues) {
    if (!stockBeingSold) {
      toast({ title: "Error", description: "Stock details not found.", variant: "destructive" });
      return;
    }
    if (values.numberOfSharesToSell > maxSharesToSell) {
      form.setError("numberOfSharesToSell", { type: "manual", message: `You only own ${maxSharesToSell} shares.` });
      return;
    }

    try {
      await recordSellStockTransaction(
        stockId,
        stockBeingSold.symbol,
        values.numberOfSharesToSell,
        values.sellPricePerShare,
        values.sellDate,
        values.fees
      );
      toast({
        title: "Sale Recorded",
        description: `Successfully recorded sale of ${values.numberOfSharesToSell} shares of ${stockBeingSold.name}.`,
      });
      router.push("/investments/stocks");
    } catch (error: any) {
      console.error("Error recording sale:", error);
      toast({
        title: "Sale Recording Failed",
        description: error.message || "Could not record the sale. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  if (isLoading || isLoadingListedStocks || isLoadingInvestmentsContext) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading sale information...
      </div>
    );
  }

  if (!stockBeingSold) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Could not load stock details to sell. Please go back and try again.</AlertDescription>
      </Alert>
    );
  }
  
  if (maxSharesToSell === 0 && !isLoading) {
     return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Shares to Sell</AlertTitle>
        <AlertDescription>You do not currently own any shares of {stockBeingSold.name} ({stockBeingSold.symbol}) to sell.</AlertDescription>
      </Alert>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium">Selling: {stockBeingSold.name} ({stockBeingSold.symbol})</h3>
            <p className="text-sm text-muted-foreground">You currently own: {maxSharesToSell.toLocaleString()} shares.</p>
            <p className="text-sm text-muted-foreground">Current Market Price: {stockBeingSold.price.toLocaleString(undefined, { style: 'currency', currency: stockBeingSold.currency })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="numberOfSharesToSell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Securities to Sell</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="e.g., 50" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseFloat(e.target.value))} 
                  />
                </FormControl>
                <FormDescription>Max: {maxSharesToSell}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellPricePerShare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell Price (per security)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="e.g., 160.25" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseFloat(e.target.value))} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fees (if any)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="e.g., 5.00" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseFloat(e.target.value))} 
                  />
                </FormControl>
                <FormDescription>Total fees for this transaction.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || maxSharesToSell === 0}>
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Record Sale
        </Button>
      </form>
    </Form>
  );
}

