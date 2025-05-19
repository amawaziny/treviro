
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
import { SellStockSchema, type SellStockFormValues } from "@/lib/schemas"; // Schema remains SellStockSchema
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities"; // Updated hook
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { ListedSecurity, StockInvestment } from "@/lib/types"; // ListedStock -> ListedSecurity
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SellSecurityFormProps { // Renamed interface for clarity
  stockId: string; // This is now securityId
}

export function SellStockForm({ stockId: securityId }: SellSecurityFormProps) { // Renamed prop for clarity
  const { recordSellStockTransaction, investments, isLoading: isLoadingInvestmentsContext } = useInvestments();
  const { getListedSecurityById, isLoading: isLoadingListedSecurities } = useListedSecurities(); // Updated hook
  const { toast } = useToast();
  const router = useRouter();

  const [securityBeingSold, setSecurityBeingSold] = useState<ListedSecurity | null>(null);
  const [maxSharesToSell, setMaxSharesToSell] = useState(0);
  const [isLoading, setIsLoading] = useState(true); 

  const form = useForm<SellStockFormValues>({
    resolver: zodResolver(SellStockSchema),
    defaultValues: {
      stockId: securityId, // Schema expects stockId, maps to securityId here
      numberOfSharesToSell: undefined,
      sellPricePerShare: undefined,
      sellDate: getCurrentDate(),
      fees: 0,
    },
  });

  useEffect(() => {
    setIsLoading(true);
    async function fetchData() {
      const listedSecurityData = await getListedSecurityById(securityId);
      setSecurityBeingSold(listedSecurityData || null);

      if (listedSecurityData) {
        const userOwnedForThisSymbol = investments.filter(
          (inv) => inv.type === 'Stocks' && inv.tickerSymbol === listedSecurityData.symbol
        ) as StockInvestment[];
        
        const totalOwned = userOwnedForThisSymbol.reduce(
          (sum, inv) => sum + (inv.numberOfShares || 0),
          0
        );
        setMaxSharesToSell(totalOwned);
      }
      setIsLoading(false);
    }
    if (securityId && !isLoadingInvestmentsContext) { 
        fetchData();
    } else if (!isLoadingInvestmentsContext) {
        setIsLoading(false); 
    }

  }, [securityId, getListedSecurityById, investments, isLoadingInvestmentsContext]);
  
  useEffect(() => {
    if (securityBeingSold && securityBeingSold.price && form.getValues("sellPricePerShare") === undefined) {
        form.setValue("sellPricePerShare", securityBeingSold.price);
    }
  }, [securityBeingSold, form]);

  const handleNumericInputChange = (field: any, value: string) => {
    if (value === '') {
      field.onChange(undefined); 
    } else {
      const parsedValue = parseFloat(value);
      field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
    }
  };

  async function onSubmit(values: SellStockFormValues) {
    if (!securityBeingSold) {
      toast({ title: "Error", description: "Security details not found.", variant: "destructive" });
      return;
    }
    if (values.numberOfSharesToSell === undefined || values.sellPricePerShare === undefined) {
        toast({ title: "Validation Error", description: "Number of shares/units and sell price must be provided.", variant: "destructive" });
        return;
    }

    if (values.numberOfSharesToSell > maxSharesToSell) {
      form.setError("numberOfSharesToSell", { type: "manual", message: `You only own ${maxSharesToSell} shares/units.` });
      return;
    }

    try {
      await recordSellStockTransaction(
        securityId, // Pass securityId
        securityBeingSold.symbol,
        values.numberOfSharesToSell,
        values.sellPricePerShare,
        values.sellDate,
        values.fees === undefined ? 0 : values.fees
      );
      toast({
        title: "Sale Recorded",
        description: `Successfully recorded sale of ${values.numberOfSharesToSell} ${securityBeingSold.securityType === 'Fund' ? 'units' : 'shares'} of ${securityBeingSold.name}.`,
      });
      router.push("/investments/stocks"); // Or to a more general "My Securities" page if that exists later
    } catch (error: any) {
      console.error("Error recording sale:", error);
      toast({
        title: "Sale Recording Failed",
        description: error.message || "Could not record the sale. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  if (isLoading || isLoadingListedSecurities || isLoadingInvestmentsContext) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading sale information...
      </div>
    );
  }

  if (!securityBeingSold) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Could not load security details to sell. Please go back and try again.</AlertDescription>
      </Alert>
    );
  }
  
  if (maxSharesToSell === 0 && !isLoading) {
     return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Holdings to Sell</AlertTitle>
        <AlertDescription>You do not currently own any holdings of {securityBeingSold.name} ({securityBeingSold.symbol}) to sell.</AlertDescription>
      </Alert>
    );
  }

  const securityLabel = securityBeingSold.securityType === 'Fund' ? 'units' : 'securities';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium">Selling: {securityBeingSold.name} ({securityBeingSold.symbol})</h3>
            <p className="text-sm text-muted-foreground">You currently own: {maxSharesToSell.toLocaleString()} {securityLabel}.</p>
            <p className="text-sm text-muted-foreground">Current Market Price: {securityBeingSold.price.toLocaleString(undefined, { style: 'currency', currency: securityBeingSold.currency })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="numberOfSharesToSell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of {securityLabel} to Sell</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="e.g., 50" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => handleNumericInputChange(field, e.target.value)}
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
                <FormLabel>Sell Price (per {securityLabel.slice(0,-1)})</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="e.g., 160.25" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => handleNumericInputChange(field, e.target.value)}
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
                  <Input type="date" {...field} value={field.value || getCurrentDate()} />
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
                    onChange={e => handleNumericInputChange(field, e.target.value)}
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

