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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AddInvestmentSchema, type AddInvestmentFormValues, investmentTypes } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid"; // Needs: npm install uuid && npm install --save-dev @types/uuid
import { currencyFluctuationAnalysis } from "@/ai/flows/currency-fluctuation-analysis";
import type { CurrencyFluctuationAnalysisInput, CurrencyFluctuationAnalysisOutput } from "@/ai/flows/currency-fluctuation-analysis";
import React, { useState } from "react";
import { CurrencyAnalysisDisplay } from "./currency-analysis-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";


// Helper function to get current date in YYYY-MM-DD format
const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};


export function AddInvestmentForm() {
  const { addInvestment } = useInvestments();
  const { toast } = useToast();
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<CurrencyFluctuationAnalysisOutput | null>(null);

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: {
      name: "",
      amountInvested: 0,
      purchaseDate: getCurrentDate(),
      type: undefined, // User must select
      // Stock
      tickerSymbol: "",
      numberOfShares: undefined,
      purchasePricePerShare: undefined,
      stockLogoUrl: "",
      isStockFund: false,
      // Gold
      quantityInGrams: undefined,
      isPhysicalGold: true,
      // Currency
      currencyCode: "",
      baseCurrency: "",
      currentExchangeRate: undefined,
      // Real Estate
      propertyAddress: "",
      propertyType: undefined,
      // Debt
      issuer: "",
      interestRate: undefined,
      maturityDate: undefined,
    },
  });

  const selectedType = form.watch("type");

  async function onSubmit(values: AddInvestmentFormValues) {
    setIsLoadingAi(false);
    setAiAnalysisResult(null);

    const investmentId = uuidv4();
    let newInvestment: any = { // Use 'any' for flexibility before casting to specific type
      id: investmentId,
      name: values.name,
      type: values.type,
      amountInvested: values.amountInvested,
      purchaseDate: values.purchaseDate,
    };
    
    let analysisResult: CurrencyFluctuationAnalysisOutput | undefined = undefined;

    if (values.type === "Stocks") {
      newInvestment = {
        ...newInvestment,
        tickerSymbol: values.tickerSymbol,
        numberOfShares: values.numberOfShares,
        purchasePricePerShare: values.purchasePricePerShare,
        stockLogoUrl: values.stockLogoUrl,
        isFund: values.isStockFund,
      };
    } else if (values.type === "Gold") {
      newInvestment = {
        ...newInvestment,
        quantityInGrams: values.quantityInGrams,
        isPhysical: values.isPhysicalGold,
      };
    } else if (values.type === "Currencies") {
      newInvestment = {
        ...newInvestment,
        currencyCode: values.currencyCode,
        baseCurrency: values.baseCurrency,
        currentExchangeRate: values.currentExchangeRate, // Storing this for record keeping
      };
      
      // Call GenAI flow for currency analysis
      if (values.currencyCode && values.baseCurrency && values.currentExchangeRate && values.amountInvested) {
        setIsLoadingAi(true);
        try {
          const aiInput: CurrencyFluctuationAnalysisInput = {
            transactionCurrency: values.currencyCode,
            transactionAmount: values.amountInvested,
            transactionDate: values.purchaseDate,
            baseCurrency: values.baseCurrency,
            currentExchangeRate: values.currentExchangeRate,
          };
          analysisResult = await currencyFluctuationAnalysis(aiInput);
          setAiAnalysisResult(analysisResult);
        } catch (error) {
          console.error("Currency analysis AI error:", error);
          toast({
            title: "AI Analysis Failed",
            description: "Could not perform currency fluctuation analysis.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingAi(false);
        }
      }
    } else if (values.type === "Real Estate") {
      newInvestment = {
        ...newInvestment,
        propertyAddress: values.propertyAddress,
        propertyType: values.propertyType,
      }
    } else if (values.type === "Debt Instruments") {
      newInvestment = {
        ...newInvestment,
        issuer: values.issuer,
        interestRate: values.interestRate,
        maturityDate: values.maturityDate,
      }
    }
    
    addInvestment(newInvestment, analysisResult);
    toast({
      title: "Investment Added",
      description: `${values.name} (${values.type}) has been successfully added.`,
    });
    form.reset();
    // Keep AI analysis result displayed if it was generated
    if (!analysisResult) {
       setAiAnalysisResult(null); // Clear if no new analysis was made (e.g. not currency type)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Investment</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Tech Startup XYZ Shares" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an investment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {investmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amountInvested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Invested</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>
            
            {/* Conditional Fields */}
            {selectedType === "Stocks" && (
              <div className="space-y-6 mt-6 p-6 border rounded-md">
                <h3 className="text-lg font-medium text-primary">Stock Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="tickerSymbol" render={({ field }) => (
                      <FormItem><FormLabel>Ticker Symbol</FormLabel><FormControl><Input placeholder="e.g., AAPL" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="stockLogoUrl" render={({ field }) => (
                      <FormItem><FormLabel>Stock Logo URL (Optional)</FormLabel><FormControl><Input placeholder="e.g., https://example.com/logo.png" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="numberOfShares" render={({ field }) => (
                      <FormItem><FormLabel>Number of Shares</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="purchasePricePerShare" render={({ field }) => (
                      <FormItem><FormLabel>Purchase Price Per Share</FormLabel><FormControl><Input type="number" placeholder="e.g., 150.50" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="isStockFund" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is this a stock fund/ETF?</FormLabel></div></FormItem>
                    )} />
                </div>
              </div>
            )}

            {selectedType === "Gold" && (
               <div className="space-y-6 mt-6 p-6 border rounded-md">
                <h3 className="text-lg font-medium text-primary">Gold Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="quantityInGrams" render={({ field }) => (
                      <FormItem><FormLabel>Quantity (grams)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="isPhysicalGold" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is this physical gold?</FormLabel><FormDescription>Uncheck for Gold ETFs, Digital Gold etc.</FormDescription></div></FormItem>
                    )} />
                </div>
              </div>
            )}

            {selectedType === "Currencies" && (
              <div className="space-y-6 mt-6 p-6 border rounded-md">
                <h3 className="text-lg font-medium text-primary">Currency Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="currencyCode" render={({ field }) => (
                      <FormItem><FormLabel>Transaction Currency Code</FormLabel><FormControl><Input placeholder="e.g., USD" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="baseCurrency" render={({ field }) => (
                      <FormItem><FormLabel>Base Currency Code (for comparison)</FormLabel><FormControl><Input placeholder="e.g., EUR" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                   <FormField control={form.control} name="currentExchangeRate" render={({ field }) => (
                      <FormItem><FormLabel>Current Exchange Rate (to Base)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 0.92" {...field} /></FormControl><FormDescription>Needed for AI fluctuation analysis.</FormDescription><FormMessage /></FormItem>
                    )} />
                </div>
              </div>
            )}
            
            {selectedType === "Real Estate" && (
              <div className="space-y-6 mt-6 p-6 border rounded-md">
                <h3 className="text-lg font-medium text-primary">Real Estate Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="propertyAddress" render={({ field }) => (
                    <FormItem><FormLabel>Property Address</FormLabel><FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="propertyType" render={({ field }) => (
                    <FormItem><FormLabel>Property Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Residential">Residential</SelectItem><SelectItem value="Commercial">Commercial</SelectItem><SelectItem value="Land">Land</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
            )}

            {selectedType === "Debt Instruments" && (
              <div className="space-y-6 mt-6 p-6 border rounded-md">
                <h3 className="text-lg font-medium text-primary">Debt Instrument Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="issuer" render={({ field }) => (
                    <FormItem><FormLabel>Issuer</FormLabel><FormControl><Input placeholder="e.g., Government Bonds" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="interestRate" render={({ field }) => (
                    <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 5.5" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="maturityDate" render={({ field }) => (
                    <FormItem><FormLabel>Maturity Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
            )}
            
            {isLoadingAi && (
              <div className="flex items-center justify-center p-4_my-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Performing currency analysis...
              </div>
            )}

            {aiAnalysisResult && selectedType === "Currencies" && (
              <CurrencyAnalysisDisplay result={aiAnalysisResult} />
            )}

            <Button type="submit" className="w-full md:w-auto" disabled={isLoadingAi}>
              {isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Investment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
