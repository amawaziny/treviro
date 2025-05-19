
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
import { v4 as uuidv4 } from "uuid";
import { currencyFluctuationAnalysis } from "@/ai/flows/currency-fluctuation-analysis";
import type { CurrencyFluctuationAnalysisInput, CurrencyFluctuationAnalysisOutput } from "@/ai/flows/currency-fluctuation-analysis";
import React, { useState, useEffect } from "react";
import { CurrencyAnalysisDisplay } from "./currency-analysis-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useListedStocks } from "@/hooks/use-listed-stocks";
import type { StockInvestment } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";

// Helper function to get current date in YYYY-MM-DD format
const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialFormValues: AddInvestmentFormValues = {
  name: "",
  amountInvested: 0, // Will be overridden for stocks
  purchaseDate: getCurrentDate(),
  type: undefined,
  selectedStockId: undefined,
  numberOfShares: '',
  purchasePricePerShare: '',
  isStockFund: false,
  purchaseFees: 0, // New field for stock purchase fees
  quantityInGrams: '',
  isPhysicalGold: true,
  currencyCode: "",
  baseCurrency: "",
  currentExchangeRate: '',
  propertyAddress: "",
  propertyType: undefined,
  issuer: "",
  interestRate: '',
  maturityDate: '',
};


export function AddInvestmentForm() {
  const { addInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedStockId = searchParams.get('stockId');

  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<CurrencyFluctuationAnalysisOutput | null>(null);
  const { listedStocks, isLoading: isLoadingListedStocks, error: listedStocksError } = useListedStocks();

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: {
      ...initialFormValues,
      type: preSelectedStockId ? "Stocks" : undefined,
      selectedStockId: preSelectedStockId || undefined,
    },
  });

  const selectedType = form.watch("type");

  useEffect(() => {
    if (preSelectedStockId && selectedType === "Stocks" && listedStocks.length > 0) {
      const stock = listedStocks.find(s => s.id === preSelectedStockId);
      if (stock && !form.getValues("name")) {
        form.setValue("name", `${stock.name} Purchase`);
      }
    }
  }, [preSelectedStockId, selectedType, listedStocks, form]);


  async function onSubmit(values: AddInvestmentFormValues) {
    setIsLoadingAi(false);
    setAiAnalysisResult(null);

    const investmentId = uuidv4();
    let newInvestment: any = { // Base structure, will be typed more strictly for specific types
      id: investmentId,
      name: values.name,
      type: values.type,
      purchaseDate: values.purchaseDate,
      // amountInvested will be set below
    };

    let analysisResult: CurrencyFluctuationAnalysisOutput | undefined = undefined;

    if (values.type === "Stocks") {
      const selectedStock = listedStocks.find(stock => stock.id === values.selectedStockId);
      if (!selectedStock) {
        toast({
          title: "Error",
          description: "Selected stock not found. Please try again.",
          variant: "destructive",
        });
        return;
      }
      // Ensure numberOfShares and purchasePricePerShare are numbers for calculation
      const numShares = typeof values.numberOfShares === 'number' ? values.numberOfShares : parseFloat(values.numberOfShares || '0');
      const pricePerShare = typeof values.purchasePricePerShare === 'number' ? values.purchasePricePerShare : parseFloat(values.purchasePricePerShare || '0');
      const fees = typeof values.purchaseFees === 'number' ? values.purchaseFees : parseFloat(String(values.purchaseFees || '0'));


      const calculatedAmountInvested = (numShares * pricePerShare) + fees;

      newInvestment = {
        ...newInvestment,
        amountInvested: calculatedAmountInvested,
        actualStockName: selectedStock.name,
        tickerSymbol: selectedStock.symbol,
        stockLogoUrl: selectedStock.logoUrl,
        numberOfShares: numShares,
        purchasePricePerShare: pricePerShare,
        isFund: values.isStockFund,
        purchaseFees: fees,
      } as StockInvestment;
    } else {
      // For non-stock types, amountInvested comes directly from the form or default
      newInvestment.amountInvested = typeof values.amountInvested === 'number' ? values.amountInvested : parseFloat(String(values.amountInvested || '0'));
      
      if (values.type === "Gold") {
        newInvestment = {
          ...newInvestment,
          quantityInGrams: typeof values.quantityInGrams === 'number' ? values.quantityInGrams : parseFloat(values.quantityInGrams || '0'),
          isPhysical: values.isPhysicalGold,
        };
      } else if (values.type === "Currencies") {
        newInvestment = {
          ...newInvestment,
          currencyCode: values.currencyCode,
          baseCurrency: values.baseCurrency,
          currentExchangeRate: typeof values.currentExchangeRate === 'number' ? values.currentExchangeRate : parseFloat(values.currentExchangeRate || '0'),
        };

        if (values.currencyCode && values.baseCurrency && values.currentExchangeRate && newInvestment.amountInvested) {
          setIsLoadingAi(true);
          try {
            const aiInput: CurrencyFluctuationAnalysisInput = {
              transactionCurrency: values.currencyCode,
              transactionAmount: newInvestment.amountInvested,
              transactionDate: values.purchaseDate,
              baseCurrency: values.baseCurrency,
              currentExchangeRate: newInvestment.currentExchangeRate,
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
          interestRate: typeof values.interestRate === 'number' ? values.interestRate : parseFloat(values.interestRate || '0'),
          maturityDate: values.maturityDate,
        }
      }
    }

    addInvestment(newInvestment, analysisResult);
    toast({
      title: "Investment Added",
      description: `${values.name} (${values.type}) has been successfully added.`,
    });
    form.reset({
      ...initialFormValues,
      type: undefined,
      selectedStockId: undefined,
    });
    router.replace('/investments/add');
    if (!analysisResult) {
       setAiAnalysisResult(null);
    }
  }

  const handleNumericInputChange = (field: any, value: string) => {
    if (value === '') {
      field.onChange(undefined); // Use undefined for react-hook-form's validation if field is optional
    } else {
      const parsedValue = parseFloat(value);
      field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
    }
  };
  
  const handleFeesInputChange = (field: any, value: string) => {
    if (value === '') {
      field.onChange(0); // Default to 0 if empty, as fees are optional and default to 0
    } else {
      const parsedValue = parseFloat(value);
      field.onChange(isNaN(parsedValue) ? 0 : parsedValue);
    }
  };


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
                    <FormLabel>Investment Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Tech Stocks Q1" {...field} />
                    </FormControl>
                    <FormDescription>A custom name for this specific investment lot.</FormDescription>
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
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "Stocks") {
                            form.setValue("selectedStockId", undefined);
                            if(form.getValues("name").includes("Purchase") && preSelectedStockId) {
                                form.setValue("name", "");
                            }
                        } else if (preSelectedStockId) {
                            form.setValue("selectedStockId", preSelectedStockId);
                            const stock = listedStocks.find(s => s.id === preSelectedStockId);
                            if (stock && !form.getValues("name")) {
                                form.setValue("name", `${stock.name} Purchase`);
                            }
                        }
                      }}
                      value={field.value || ""}
                      disabled={!!preSelectedStockId}
                    >
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
                    {!!preSelectedStockId && <FormDescription>Investment type locked to Stocks due to pre-selection.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType !== "Stocks" && (
                 <FormField
                    control={form.control}
                    name="amountInvested"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Amount Invested</FormLabel>
                        <FormControl>
                        <Input type="number" step="any" placeholder="e.g., 10000" {...field}
                            value={field.value ?? ''} // Ensure it's controlled, handle 0 if needed
                            onChange={e => handleNumericInputChange(field, e.target.value)} />
                        </FormControl>
                        <FormDescription>Total cost including any fees.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}


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

            {selectedType === "Stocks" && (
              <div className="space-y-6 mt-6 p-6 border rounded-md">
                <h3 className="text-lg font-medium text-primary">Stock Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="selectedStockId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Select Stock</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          disabled={isLoadingListedStocks || !!listedStocksError || listedStocks.length === 0 || !!preSelectedStockId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                isLoadingListedStocks ? "Loading stocks..." :
                                listedStocksError ? "Error loading stocks" :
                                listedStocks.length === 0 ? "No stocks available" :
                                "Select a stock from the list"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingListedStocks && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                            {listedStocksError && <SelectItem value="error" disabled>Could not load stocks.</SelectItem>}
                            {!isLoadingListedStocks && !listedStocksError && listedStocks.length === 0 && <SelectItem value="no-stocks" disabled>No stocks found. Add them via admin.</SelectItem>}
                            {listedStocks.map((stock) => (
                              <SelectItem key={stock.id} value={stock.id}>
                                {stock.name} ({stock.symbol}) - {stock.market}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                         {!!preSelectedStockId && <FormDescription>Stock pre-selected. Change stock by going back to Browse Stocks.</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="numberOfShares" render={({ field }) => (
                      <FormItem><FormLabel>Number of Securities</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 100" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField control={form.control} name="purchasePricePerShare" render={({ field }) => (
                      <FormItem><FormLabel>Purchase Price (per security)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 150.50" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <FormField
                    control={form.control}
                    name="purchaseFees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Fees (optional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="e.g., 5.00" {...field} value={field.value ?? ''} onChange={e => handleFeesInputChange(field, e.target.value)} />
                        </FormControl>
                        <FormDescription>Brokerage or transaction fees for this purchase.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      <FormItem><FormLabel>Quantity (grams)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
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
                      <FormItem><FormLabel>Current Exchange Rate (to Base)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 0.92" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormDescription>Needed for AI fluctuation analysis.</FormDescription><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>Property Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Residential">Residential</SelectItem><SelectItem value="Commercial">Commercial</SelectItem><SelectItem value="Land">Land</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 5.5" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
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

            <Button type="submit" className="w-full md:w-auto" disabled={isLoadingAi || (selectedType === "Stocks" && (isLoadingListedStocks || !!listedStocksError))}>
              {form.formState.isSubmitting || isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Investment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

