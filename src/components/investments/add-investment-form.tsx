
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
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddInvestmentSchema, type AddInvestmentFormValues, investmentTypes, goldTypes, debtSubTypes, propertyTypes } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { currencyFluctuationAnalysis } from "@/ai/flows/currency-fluctuation-analysis";
import type { CurrencyFluctuationAnalysisInput, CurrencyFluctuationAnalysisOutput } from "@/ai/flows/currency-fluctuation-analysis";
import React, { useState, useEffect, useCallback } from "react";
import { CurrencyAnalysisDisplay } from "./currency-analysis-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type { ListedSecurity, InvestmentType, StockInvestment, GoldInvestment, CurrencyInvestment, RealEstateInvestment, DebtInstrumentInvestment } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";


const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialFormValues: AddInvestmentFormValues = {
  type: undefined,
  amountInvested: '', // Keep as string for controlled input
  purchaseDate: getCurrentDate(),
  name: "",

  selectedStockId: undefined,
  numberOfShares: '', // Keep as string for controlled input
  purchasePricePerShare: '', // Keep as string for controlled input
  purchaseFees: "0", // Default to string "0"

  goldType: undefined,
  quantityInGrams: '', // Keep as string for controlled input

  currencyCode: "",
  foreignCurrencyAmount: '', // Keep as string for controlled input
  exchangeRateAtPurchase: '', // Keep as string for controlled input

  propertyAddress: "",
  propertyType: undefined,

  debtSubType: undefined,
  issuer: "",
  interestRate: '', // Keep as string for controlled input
  maturityDate: '',
};


interface RenderGoldFieldsSectionProps {
  control: any;
  isDedicatedGoldMode?: boolean;
}
const RenderGoldFieldsSection: React.FC<RenderGoldFieldsSectionProps> = ({
    control,
    isDedicatedGoldMode,
  }) => {
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Gold Investment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="goldType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gold Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gold type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {goldTypes.map(gType => (
                    <SelectItem key={gType} value={gType}>
                      {gType === 'K24' && '24 Karat'}
                      {gType === 'K21' && '21 Karat'}
                      {gType === 'Pound' && 'Gold Pound'}
                      {gType === 'Ounce' && 'Ounce'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="quantityInGrams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity / Units</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 50 or 2"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
               <FormDescription>Grams for K21/K24, units for Pound/Ounce.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="amountInvested"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Amount Invested (Cost)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 10000.50"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>Total cost including any fees.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || getCurrentDate()} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
const MemoizedRenderGoldFieldsSection = React.memo(RenderGoldFieldsSection);


interface RenderCurrencyFieldsProps {
  control: any;
  isDedicatedCurrencyMode?: boolean;
}
const RenderCurrencyFields: React.FC<RenderCurrencyFieldsProps> = ({
    control,
    isDedicatedCurrencyMode,
  }) => {
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Currency Holding Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!isDedicatedCurrencyMode && (
            <FormField control={control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder="e.g., USD Savings or Trip to Europe Fund" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
          )}
        <FormField control={control} name="currencyCode" render={({ field }) => (
            <FormItem><FormLabel>Transaction Currency Code</FormLabel><FormControl><Input placeholder="e.g., USD, EUR" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={control} name="foreignCurrencyAmount" render={({ field }) => (
            <FormItem><FormLabel>Foreign Currency Amount</FormLabel><FormControl>
              <NumericInput
                placeholder="e.g., 1000.50"
                value={field.value}
                onChange={field.onChange}
              />
              </FormControl><FormDescription>Amount of the foreign currency you bought.</FormDescription><FormMessage /></FormItem>
          )} />
        <FormField control={control} name="exchangeRateAtPurchase" render={({ field }) => (
            <FormItem><FormLabel>Exchange Rate at Purchase (to EGP)</FormLabel><FormControl>
              <NumericInput
                placeholder="e.g., 30.85 (for USD to EGP)"
                value={field.value}
                onChange={field.onChange}
              />
              </FormControl><FormMessage /></FormItem>
          )} />
         <FormField control={control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()} /></FormControl><FormMessage /></FormItem>
          )} />
      </div>
    </div>
  );
};
const MemoizedRenderCurrencyFields = React.memo(RenderCurrencyFields);


export function AddInvestmentForm() {
  const { addInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSelectedSecurityId = searchParams.get('stockId');
  const preSelectedInvestmentTypeQueryParam = searchParams.get('type') as InvestmentType | null;

  // console.log("AddInvestmentForm: Reading URL Params");
  // console.log("AddInvestmentForm - preSelectedSecurityId from URL:", preSelectedSecurityId);
  // console.log("AddInvestmentForm - preSelectedInvestmentTypeQueryParam from URL:", preSelectedInvestmentTypeQueryParam);


  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<CurrencyFluctuationAnalysisOutput | null>(null);
  const { listedSecurities, isLoading: isLoadingListedSecurities, error: listedSecuritiesError, getListedSecurityById } = useListedSecurities();
  const [preSelectedSecurityDetails, setPreSelectedSecurityDetails] = useState<ListedSecurity | null>(null);

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: initialFormValues,
  });

  const selectedTypeFromFormWatch = form.watch("type");


  const isDedicatedGoldMode = preSelectedInvestmentTypeQueryParam === "Gold" && !preSelectedSecurityId;
  const isDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments" && !preSelectedSecurityId;
  const isDedicatedCurrencyMode = preSelectedInvestmentTypeQueryParam === "Currencies" && !preSelectedSecurityId;
  const isPreSelectedStockMode = !!preSelectedSecurityId; // This is true if stockId is in URL

  // console.log("AddInvestmentForm - Calculated Modes:");
  // console.log("AddInvestmentForm - isDedicatedGoldMode:", isDedicatedGoldMode);
  // console.log("AddInvestmentForm - isDedicatedDebtMode:", isDedicatedDebtMode);
  // console.log("AddInvestmentForm - isDedicatedCurrencyMode:", isDedicatedCurrencyMode);
  // console.log("AddInvestmentForm - isPreSelectedStockMode:", isPreSelectedStockMode);


  const effectiveSelectedType = isDedicatedGoldMode ? "Gold" :
                                isDedicatedDebtMode ? "Debt Instruments" :
                                isDedicatedCurrencyMode ? "Currencies" :
                                isPreSelectedStockMode ? "Stocks" :
                                selectedTypeFromFormWatch;

  // console.log("AddInvestmentForm - Form State and Watched Values:");
  // console.log("AddInvestmentForm - form.watch('type'):", selectedTypeFromFormWatch);
  // console.log("AddInvestmentForm - effectiveSelectedType for UI logic:", effectiveSelectedType);


  useEffect(() => {
    let isMounted = true;
    const baseResetValues: AddInvestmentFormValues = {
        ...initialFormValues,
        purchaseDate: form.getValues("purchaseDate") || getCurrentDate(),
        name: "",
    };

    if (isDedicatedGoldMode) {
      // console.log("AddInvestmentForm - useEffect - Applying Dedicated Gold Mode settings to form.");
      form.reset({ ...baseResetValues, type: "Gold" });
      setPreSelectedSecurityDetails(null);
    } else if (isDedicatedDebtMode) {
      // console.log("AddInvestmentForm - useEffect - Applying Dedicated Debt Mode settings to form.");
      form.reset({ ...baseResetValues, type: "Debt Instruments" });
      setPreSelectedSecurityDetails(null);
    } else if (isDedicatedCurrencyMode) {
      // console.log("AddInvestmentForm - useEffect - Applying Dedicated Currency Mode settings to form.");
      form.reset({ ...baseResetValues, type: "Currencies" });
      setPreSelectedSecurityDetails(null);
    } else if (isPreSelectedStockMode && preSelectedSecurityId) {
      // console.log("AddInvestmentForm - useEffect - Applying Pre-selected Stock Mode.");
      form.reset({ ...baseResetValues, type: "Stocks", selectedStockId: preSelectedSecurityId, name: "" });
      getListedSecurityById(preSelectedSecurityId).then(security => {
        if (isMounted && security) {
          setPreSelectedSecurityDetails(security);
          form.setValue("purchasePricePerShare", String(security.price)); // Set as string
        } else if (isMounted) {
          toast({ title: "Error", description: "Pre-selected security not found.", variant: "destructive" });
          router.replace('/investments/add');
        }
      });
    } else if (preSelectedInvestmentTypeQueryParam && !isPreSelectedStockMode && !isDedicatedGoldMode && !isDedicatedDebtMode && !isDedicatedCurrencyMode) {
        // General type pre-selection (e.g., for Real Estate if we add a FAB)
        // console.log("AddInvestmentForm - useEffect - Applying general pre-selected type from URL:", preSelectedInvestmentTypeQueryParam);
        form.reset({ ...baseResetValues, type: preSelectedInvestmentTypeQueryParam as InvestmentType });
        setPreSelectedSecurityDetails(null);
    } else if (!preSelectedInvestmentTypeQueryParam && !preSelectedSecurityId) {
        // General mode, reset with current type or undefined.
        // console.log("AddInvestmentForm - useEffect - General mode, reset with current form type or undefined.");
        form.reset({ ...baseResetValues, type: selectedTypeFromFormWatch || undefined, name: form.getValues("name") || "" });
        setPreSelectedSecurityDetails(null);
    }
    return () => { isMounted = false; };
  }, [isDedicatedDebtMode, isDedicatedGoldMode, isDedicatedCurrencyMode, isPreSelectedStockMode, preSelectedSecurityId, preSelectedInvestmentTypeQueryParam, form, getListedSecurityById, toast, router, selectedTypeFromFormWatch]);


  async function onSubmit(values: AddInvestmentFormValues) {
    // console.log("AddInvestmentForm onSubmit - Raw Zod parsed values:", JSON.stringify(values, null, 2));

    if (Object.keys(form.formState.errors).length > 0) {
        // console.error("AddInvestmentForm onSubmit - Validation errors present, cannot submit:", form.formState.errors);
        toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
        return;
    }

    setIsLoadingAi(false);
    setAiAnalysisResult(null);

    const investmentId = uuidv4();
    let investmentName = "";

    const finalInvestmentType = effectiveSelectedType;

    if (!finalInvestmentType) {
        toast({ title: "Error", description: "Investment type is missing.", variant: "destructive" });
        return;
    }

    let newInvestmentBase = {
      id: investmentId,
      type: finalInvestmentType,
      purchaseDate: values.purchaseDate,
      amountInvested: 0,
      name: "",
    };

    let newInvestment: Omit<StockInvestment | GoldInvestment | CurrencyInvestment | RealEstateInvestment | DebtInstrumentInvestment, 'createdAt'>;
    let analysisResultFromAi: CurrencyFluctuationAnalysisOutput | undefined = undefined;

    // Zod schema ensures these are numbers or undefined if optional and not provided.
    // If required, Zod would have already errored.
    const parsedAmountInvested = values.amountInvested ?? 0;
    const parsedNumberOfShares = values.numberOfShares ?? 0;
    const parsedPricePerShare = values.purchasePricePerShare ?? 0;
    const parsedPurchaseFees = values.purchaseFees ?? 0;
    const parsedQuantityInGrams = values.quantityInGrams ?? 0;
    const parsedForeignCurrencyAmount = values.foreignCurrencyAmount ?? 0;
    const parsedExchangeRateAtPurchase = values.exchangeRateAtPurchase ?? 0;
    const parsedInterestRate = values.interestRate ?? 0;


    if (finalInvestmentType === "Stocks") {
      const securityToProcessId = values.selectedStockId || preSelectedSecurityId;
      const selectedSecurity = listedSecurities.find(sec => sec.id === securityToProcessId) || preSelectedSecurityDetails;

      if (!selectedSecurity) {
        // console.error("AddInvestmentForm onSubmit - Stocks: Selected security details NOT found. ID:", securityToProcessId);
        toast({ title: "Error", description: "Selected security details not found.", variant: "destructive" });
        return;
      }
      // console.log("AddInvestmentForm onSubmit - Stocks: Selected security FOUND:", selectedSecurity.name);

      const calculatedAmountInvested = (parsedNumberOfShares * parsedPricePerShare) + parsedPurchaseFees;
      investmentName = `${selectedSecurity.name} Purchase`;

      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: calculatedAmountInvested,
        actualStockName: selectedSecurity.name,
        tickerSymbol: selectedSecurity.symbol,
        stockLogoUrl: selectedSecurity.logoUrl,
        numberOfShares: parsedNumberOfShares,
        purchasePricePerShare: parsedPricePerShare,
        purchaseFees: parsedPurchaseFees,
        type: 'Stocks',
      };

    } else if (finalInvestmentType === "Debt Instruments") {
        investmentName = isDedicatedDebtMode ? `${values.debtSubType || 'Debt'} (${values.issuer || 'N/A'})` : (values.name || `${values.debtSubType || 'Debt'} (${values.issuer || 'N/A'})`);
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parsedAmountInvested,
          issuer: values.issuer!,
          interestRate: parsedInterestRate,
          maturityDate: values.maturityDate!,
          debtSubType: values.debtSubType!,
          type: 'Debt Instruments',
        };
    } else if (finalInvestmentType === "Gold") {
        investmentName = isDedicatedGoldMode ? `Gold (${values.goldType || 'N/A'})` : (values.name || `Gold (${values.goldType || 'N/A'})`);
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parsedAmountInvested,
          goldType: values.goldType!,
          quantityInGrams: parsedQuantityInGrams,
          type: 'Gold',
        };
    } else if (finalInvestmentType === "Currencies") {
        investmentName = isDedicatedCurrencyMode ? `Currency (${values.currencyCode || 'N/A'})` : (values.name || `Currency (${values.currencyCode || 'N/A'})`);
        const calculatedCost = parsedForeignCurrencyAmount * parsedExchangeRateAtPurchase;

        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: calculatedCost,
          currencyCode: values.currencyCode!,
          foreignCurrencyAmount: parsedForeignCurrencyAmount,
          exchangeRateAtPurchase: parsedExchangeRateAtPurchase,
          type: 'Currencies',
        };

        if (values.currencyCode && values.exchangeRateAtPurchase && parsedForeignCurrencyAmount) {
          setIsLoadingAi(true);
          try {
            const aiInput: CurrencyFluctuationAnalysisInput = {
                transactionCurrency: values.currencyCode!,
                transactionAmount: parsedForeignCurrencyAmount,
                transactionDate: values.purchaseDate,
                baseCurrency: "EGP",
                currentExchangeRate: parsedExchangeRateAtPurchase,
            };
            analysisResultFromAi = await currencyFluctuationAnalysis(aiInput);
            setAiAnalysisResult(analysisResultFromAi);
          } catch (error) {
              toast({ title: "AI Analysis Failed", description: "Could not perform currency fluctuation analysis.", variant: "destructive" });
          } finally {
            setIsLoadingAi(false);
          }
        }
    } else if (finalInvestmentType === "Real Estate") {
        investmentName = values.name || `Real Estate (${values.propertyAddress || 'N/A'})`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parsedAmountInvested,
          propertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          type: 'Real Estate',
        };
    } else {
         investmentName = values.name || `${finalInvestmentType} Investment`;
         newInvestment = { ...newInvestmentBase, name: investmentName, amountInvested: parsedAmountInvested, type: finalInvestmentType as any };
    }

    // console.log("AddInvestmentForm onSubmit - newInvestment object being passed to addInvestment:", JSON.stringify(newInvestment, null, 2));

    await addInvestment(newInvestment, analysisResultFromAi);
    toast({
      title: "Investment Added",
      description: `${newInvestment.name} (${finalInvestmentType}) has been successfully added.`,
    });

    const resetTargetType = isDedicatedDebtMode ? "Debt Instruments" :
                            isDedicatedGoldMode ? "Gold" :
                            isDedicatedCurrencyMode ? "Currencies" :
                            isPreSelectedStockMode ? "Stocks" :
                            undefined;

    const resetValues: AddInvestmentFormValues = {
        ...initialFormValues,
        type: resetTargetType,
        selectedStockId: isPreSelectedStockMode && preSelectedSecurityId ? preSelectedSecurityId : undefined,
        purchaseDate: getCurrentDate(),
        name: "",
    };

    form.reset(resetValues);

    if (isPreSelectedStockMode && preSelectedSecurityDetails && preSelectedSecurityId) {
        form.setValue("purchasePricePerShare", String(preSelectedSecurityDetails.price));
    } else if (!resetTargetType && !preSelectedInvestmentTypeQueryParam) {
        router.replace('/investments/add');
    }

    if (!analysisResultFromAi) {
       setAiAnalysisResult(null);
    }
  }


  let pageTitle = "Add New Investment";
  let submitButtonText = `Add Investment`;

  if (isDedicatedGoldMode) {
    pageTitle = "Add Gold Investment";
    submitButtonText = "Add Gold";
  } else if (isDedicatedDebtMode) {
    pageTitle = "Buy Debt Instrument";
    submitButtonText = "Buy Debt Instrument";
  } else if (isDedicatedCurrencyMode) {
    pageTitle = "Add Currency Holding";
    submitButtonText = "Add Currency";
  } else if (isPreSelectedStockMode && preSelectedSecurityDetails) {
    pageTitle = `Buy: ${preSelectedSecurityDetails.name} (${preSelectedSecurityDetails.securityType === 'Fund' ? preSelectedSecurityDetails.fundType || 'Fund' : preSelectedSecurityDetails.symbol})`;
    submitButtonText = `Buy ${preSelectedSecurityDetails.securityType === 'Fund' ? 'Units' : 'Securities'}`;
  } else if (preSelectedInvestmentTypeQueryParam && !isDedicatedGoldMode && !isDedicatedDebtMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode) {
    pageTitle = `Add New ${preSelectedInvestmentTypeQueryParam}`;
    submitButtonText = `Add ${preSelectedInvestmentTypeQueryParam}`;
  } else if (effectiveSelectedType && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode) {
     submitButtonText = `Add ${effectiveSelectedType}`;
  }


  const RenderDebtFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Debt Instrument Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="debtSubType" render={({ field }) => (
            <FormItem><FormLabel>Specific Debt Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} required><FormControl><SelectTrigger><SelectValue placeholder="Select the type of debt" /></SelectTrigger></FormControl><SelectContent>{debtSubTypes.map(dType => (<SelectItem key={dType} value={dType}>{dType}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="issuer" render={({ field }) => (
          <FormItem><FormLabel>Issuer / Institution</FormLabel><FormControl><Input placeholder="e.g., US Treasury, XYZ Corp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="interestRate" render={({ field }) => (
          <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl>
            <NumericInput
              placeholder="e.g., 5.5"
              value={field.value}
              onChange={field.onChange}
            />
            </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="maturityDate" render={({ field }) => (
          <FormItem><FormLabel>Maturity Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="amountInvested" render={({ field }) => (
          <FormItem><FormLabel>Total Amount Invested (Cost)</FormLabel><FormControl>
            <NumericInput
              placeholder="e.g., 10000.75"
              value={field.value}
              onChange={field.onChange}
            />
            </FormControl><FormDescription>Total cost including any fees.</FormDescription><FormMessage /></FormItem>
          )}
        />
        <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()} /></FormControl><FormMessage /></FormItem>
          )}
        />
      </div>
    </div>
  );

  const RenderStockFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {preSelectedSecurityDetails?.securityType === 'Fund' ? 'Fund Purchase Details' : 'Stock Purchase Details'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {!preSelectedSecurityId && (
          <FormField control={form.control} name="selectedStockId" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Select Security (Stock or Fund)</FormLabel><Select onValueChange={(value) => { field.onChange(value); const security = listedSecurities.find(s => s.id === value); setPreSelectedSecurityDetails(security || null); if(security) {form.setValue("purchasePricePerShare", String(security.price));}}} value={field.value || ""} disabled={isLoadingListedSecurities || !!listedSecuritiesError || listedSecurities.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingListedSecurities ? "Loading securities..." : listedSecuritiesError ? "Error loading securities" : listedSecurities.length === 0 ? "No securities available" : "Select a security from the list"} /></SelectTrigger></FormControl><SelectContent>{listedSecurities.map((security) => (<SelectItem key={security.id} value={security.id}>{security.name} ({security.symbol}) - {security.securityType === 'Fund' ? security.fundType : security.market}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )}
          />
        )}
        {preSelectedSecurityDetails && (
          <div className="md:col-span-2 p-3 bg-muted/50 rounded-md">
              <p className="text-sm font-medium">Selected Security: {preSelectedSecurityDetails.name} ({preSelectedSecurityDetails.symbol})</p>
              <p className="text-xs text-muted-foreground">Current Market Price: {preSelectedSecurityDetails.price.toLocaleString(undefined, {style: 'currency', currency: preSelectedSecurityDetails.currency})}</p>
              {preSelectedSecurityDetails.securityType === 'Fund' && preSelectedSecurityDetails.fundType && <p className="text-xs text-muted-foreground">Type: {preSelectedSecurityDetails.fundType}</p>}
          </div>
        )}
        <FormField control={form.control} name="numberOfShares" render={({ field }) => (
            <FormItem><FormLabel>Number of Securities</FormLabel><FormControl>
              <NumericInput
                placeholder="e.g., 100"
                value={field.value}
                onChange={field.onChange}
                allowDecimal={false}
              />
              </FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="purchasePricePerShare" render={({ field }) => (
            <FormItem><FormLabel>Purchase Price (per security)</FormLabel><FormControl>
              <NumericInput
                placeholder="e.g., 150.50"
                value={field.value}
                onChange={field.onChange}
              />
              </FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="purchaseFees" render={({ field }) => (
            <FormItem><FormLabel>Purchase Fees (optional)</FormLabel><FormControl>
              <NumericInput
                placeholder="e.g., 5.00"
                value={field.value}
                onChange={field.onChange}
              />
              </FormControl><FormDescription>Brokerage or transaction fees for this purchase.</FormDescription><FormMessage /></FormItem>
          )}
        />
        <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()}/></FormControl><FormMessage /></FormItem>
          )}
        />
      </div>
    </div>
  );


  const RenderRealEstateFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Real Estate Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="md:col-span-2"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder="e.g., Downtown Apartment or Beach House Plot" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="propertyAddress" render={({ field }) => (
          <FormItem><FormLabel>Property Address</FormLabel><FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="propertyType" render={({ field }) => (
          <FormItem><FormLabel>Property Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger></FormControl><SelectContent>{propertyTypes.map(pType => (<SelectItem key={pType} value={pType}>{pType}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="amountInvested" render={({ field }) => (
          <FormItem><FormLabel>Total Amount Invested (Cost)</FormLabel><FormControl>
            <NumericInput
              placeholder="e.g., 1000000.00"
              value={field.value}
              onChange={field.onChange}
            />
            </FormControl><FormDescription>Total cost including any fees.</FormDescription><FormMessage /></FormItem>
          )}
        />
        <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()}/></FormControl><FormMessage /></FormItem>
          )}
        />
      </div>
    </div>
  );

  const RenderGeneralTypeSelector = () => (
        <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Investment Type</FormLabel>
                <Select
                onValueChange={(value) => {
                    field.onChange(value);
                    const currentValues = form.getValues();
                    form.reset({
                    ...initialFormValues,
                    type: value as InvestmentType,
                    purchaseDate: currentValues.purchaseDate || getCurrentDate(),
                    name: "",
                    });
                    setPreSelectedSecurityDetails(null);
                }}
                value={field.value || ""}
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
                <FormMessage />
            </FormItem>
            )}
        />
  );

  const RenderGeneralFields = ({ currentType }: { currentType: InvestmentType | undefined }) => {
    // Only render these if NOT in a dedicated mode and a non-specific type is chosen
    const showGeneralName = currentType && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode && (currentType === "Real Estate");
    const showGeneralAmountAndDate = currentType && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode && (currentType === "Real Estate");


    return (
    <>
      {showGeneralName && (
         <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="mt-6"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder={`e.g., My ${currentType} Investment`} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
      )}

      {showGeneralAmountAndDate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <FormField
                control={form.control}
                name="amountInvested"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Total Amount Invested</FormLabel>
                    <FormControl>
                        <NumericInput
                        placeholder="e.g., 1000.00"
                        value={field.value}
                        onChange={field.onChange}
                        />
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
                        <Input type="date" {...field} value={field.value || getCurrentDate()} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
      )}
    </>
  )};

  // console.log("AddInvestmentForm: Rendering - isDedicatedDebtMode:", isDedicatedDebtMode);
  // console.log("AddInvestmentForm: Rendering - isDedicatedGoldMode:", isDedicatedGoldMode);
  // console.log("AddInvestmentForm: Rendering - isDedicatedCurrencyMode:", isDedicatedCurrencyMode);
  // console.log("AddInvestmentForm: Rendering - isPreSelectedStockMode:", isPreSelectedStockMode);
  // console.log("AddInvestmentForm: Rendering - effectiveSelectedType:", effectiveSelectedType);
  // console.log("AddInvestmentForm: Rendering - form.formState.errors:", form.formState.errors);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            {(isPreSelectedStockMode && isLoadingListedSecurities && !preSelectedSecurityDetails) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {pageTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {isDedicatedDebtMode ? <RenderDebtFields /> :
             isDedicatedGoldMode ? <MemoizedRenderGoldFieldsSection control={form.control} isDedicatedGoldMode={true}/> :
             isDedicatedCurrencyMode ? <MemoizedRenderCurrencyFields control={form.control} isDedicatedCurrencyMode={true} /> :
             isPreSelectedStockMode ? <RenderStockFields /> :
             ( // General Mode
                <>
                  <RenderGeneralTypeSelector />
                  {/* Render sections based on the type selected in the general selector */}
                  {effectiveSelectedType === "Stocks" && <RenderStockFields />}
                  {effectiveSelectedType === "Gold" && <MemoizedRenderGoldFieldsSection control={form.control} />}
                  {effectiveSelectedType === "Currencies" && <MemoizedRenderCurrencyFields control={form.control} />}
                  {effectiveSelectedType === "Real Estate" && <RenderRealEstateFields />}
                  {effectiveSelectedType === "Debt Instruments" && <RenderDebtFields />}

                  {/* RenderGeneralFields is for types that don't have a dedicated section like Real Estate */}
                  <RenderGeneralFields currentType={effectiveSelectedType} />
                </>
             )
            }

            {isLoadingAi && effectiveSelectedType === "Currencies" && (
              <div className="flex items-center justify-center p-4 my-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Performing currency analysis...
              </div>
            )}

            {aiAnalysisResult && effectiveSelectedType === "Currencies" && (
              <CurrencyAnalysisDisplay result={aiAnalysisResult} />
            )}

            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={
                form.formState.isSubmitting ||
                isLoadingAi ||
                (effectiveSelectedType === "Stocks" && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode && (isLoadingListedSecurities || !!listedSecuritiesError || !form.getValues("selectedStockId"))) ||
                (isPreSelectedStockMode && (!preSelectedSecurityDetails || isLoadingListedSecurities))
              }
            >
              {(form.formState.isSubmitting || isLoadingAi) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitButtonText}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
