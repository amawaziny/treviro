
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
import { EditStockInvestmentSchema, type EditStockInvestmentFormValues } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter }
from 'next/navigation';
import React, { useEffect, useState } from "react";
import type { StockInvestment } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface EditStockInvestmentFormProps {
  investmentId: string;
}

export function EditStockInvestmentForm({ investmentId }: EditStockInvestmentFormProps) {
  const { investments, updateStockInvestment, isLoading: isLoadingContext } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const [investmentToEdit, setInvestmentToEdit] = useState<StockInvestment | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const form = useForm<EditStockInvestmentFormValues>({
    resolver: zodResolver(EditStockInvestmentSchema),
    defaultValues: {
      purchaseDate: "",
      numberOfShares: undefined,
      purchasePricePerShare: undefined,
      purchaseFees: 0,
    },
  });

  useEffect(() => {
    setIsLoadingData(true);
    const foundInvestment = investments.find(inv => inv.id === investmentId && inv.type === 'Stocks') as StockInvestment | undefined;
    if (foundInvestment) {
      setInvestmentToEdit(foundInvestment);
      form.reset({
        purchaseDate: foundInvestment.purchaseDate.split('T')[0], // Ensure YYYY-MM-DD format for date input
        numberOfShares: foundInvestment.numberOfShares,
        purchasePricePerShare: foundInvestment.purchasePricePerShare,
        purchaseFees: foundInvestment.purchaseFees || 0,
      });
    } else if (!isLoadingContext) {
      toast({
        title: "Error",
        description: "Investment not found or not editable.",
        variant: "destructive",
      });
      router.back(); // Go back if investment not found
    }
    setIsLoadingData(false);
  }, [investmentId, investments, form, toast, router, isLoadingContext]);


  const handleNumericInputChange = (field: any, value: string) => {
    if (value === '') {
      field.onChange(undefined); 
    } else {
      const parsedValue = parseFloat(value);
      field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
    }
  };

  async function onSubmit(values: EditStockInvestmentFormValues) {
    if (!investmentToEdit) {
      toast({ title: "Error", description: "Cannot save, investment data missing.", variant: "destructive" });
      return;
    }

    const oldAmountInvested = investmentToEdit.amountInvested;

    try {
      await updateStockInvestment(investmentId, {
        purchaseDate: values.purchaseDate,
        numberOfShares: values.numberOfShares,
        purchasePricePerShare: values.purchasePricePerShare,
        purchaseFees: values.purchaseFees,
      }, oldAmountInvested);

      toast({
        title: "Investment Updated",
        description: `${investmentToEdit.actualStockName || investmentToEdit.name} purchase details updated.`,
      });
      router.push(`/stocks/${investmentToEdit.tickerSymbol}`); // Navigate back to stock detail page
    } catch (error: any) {
      console.error("Error updating investment:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update investment details.",
        variant: "destructive",
      });
    }
  }

  if (isLoadingData || isLoadingContext) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading investment details...
      </div>
    );
  }

  if (!investmentToEdit && !isLoadingData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Investment not found. It might have been removed.</AlertDescription>
      </Alert>
    );
  }
  
  const pageTitle = `Edit Purchase: ${investmentToEdit?.actualStockName || investmentToEdit?.name || 'Stock'}`;


  return (
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <CardDescription>Modify the details of this stock purchase.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfShares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Securities</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="e.g., 100" 
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
                name="purchasePricePerShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price (per security)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="e.g., 150.50" 
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
                name="purchaseFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Fees (optional)</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
