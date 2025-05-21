
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
  amountInvested: undefined,
  purchaseDate: getCurrentDate(),

  selectedStockId: undefined,
  numberOfShares: undefined,
  purchasePricePerShare: undefined,
  purchaseFees: "0", // Default as string for Zod coercion

  goldType: undefined,
  quantityInGrams: undefined,

  currencyCode: "",
  foreignCurrencyAmount: undefined,
  exchangeRateAtPurchase: undefined,
  baseCurrencyAtPurchase: "EGP",

  propertyAddress: "",
  propertyType: undefined,

  debtSubType: undefined,
  issuer: "",
  interestRate: undefined,
  maturityDate: '',
  name: "",
};


// Memoized component for Gold Fields
const MemoizedRenderGoldFieldsSection = React.memo(function RenderGoldFieldsSection({
  control,
  handleNumericInputChange,
  getCurrentDateForForm,
  isDedicatedGoldMode,
}: {
  control: any;
  handleNumericInputChange: (field: any, value: string) => void;
  getCurrentDateForForm: () => string;
  isDedicatedGoldMode?: boolean;
}) {
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Gold Investment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {!isDedicatedGoldMode && (
           <FormField
            control={control}
            name="name"
            render={({ field }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>Name / Description (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., My Gold Bar or Wedding Gold" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
         )}
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
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 50 or 2.5"
                  {...field}
                  value={String(field.value ?? '')}
                  onChange={e => handleNumericInputChange(field, e.target.value)}
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
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 10000.50"
                  {...field}
                  value={String(field.value ?? '')}
                  onChange={e => handleNumericInputChange(field, e.target.value)}
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
                <Input type="date" {...field} value={field.value || getCurrentDateForForm()} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
});
MemoizedRenderGoldFieldsSection.displayName = 'MemoizedRenderGoldFieldsSection';


export function AddInvestmentForm() {
  const { addInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSelectedSecurityId = searchParams.get('stockId');
  const preSelectedInvestmentTypeQueryParam = searchParams.get('type') as InvestmentType | null;

  const isDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments";
  const isDedicatedGoldMode = preSelectedInvestmentTypeQueryParam === "Gold";
  const isDedicatedCurrencyMode = preSelectedInvestmentTypeQueryParam === "Currencies";
  const isPreSelectedStockMode = !!preSelectedSecurityId && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode;

  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<CurrencyFluctuationAnalysisOutput | null>(null);
  const { listedSecurities, isLoading: isLoadingListedSecurities, error: listedSecuritiesError, getListedSecurityById } = useListedSecurities();
  const [preSelectedSecurityDetails, setPreSelectedSecurityDetails] = useState<ListedSecurity | null>(null);

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: initialFormValues,
  });

  const selectedTypeFromForm = form.watch("type");
  const effectiveSelectedType = isDedicatedGoldMode ? "Gold" :
                                isDedicatedDebtMode ? "Debt Instruments" :
                                isDedicatedCurrencyMode ? "Currencies" :
                                isPreSelectedStockMode ? "Stocks" :
                                selectedTypeFromForm;
  
  // console.log("AddInvestmentForm - Current effectiveSelectedType:", effectiveSelectedType);
  // console.log("AddInvestmentForm - form.formState.errors:", form.formState.errors);


  useEffect(() => {
    let isMounted = true;
    
    const baseResetValues: AddInvestmentFormValues = {
        ...initialFormValues, // Spread initial defaults first
        purchaseDate: form.getValues("purchaseDate") || getCurrentDate(), // Preserve current date if set
        baseCurrencyAtPurchase: "EGP", // Always default this for new forms
    };

    if (isDedicatedGoldMode) {
      form.reset({ ...baseResetValues, type: "Gold" });
      setPreSelectedSecurityDetails(null);
    } else if (isDedicatedDebtMode) {
      form.reset({ ...baseResetValues, type: "Debt Instruments" });
      setPreSelectedSecurityDetails(null);
    } else if (isDedicatedCurrencyMode) {
      form.reset({ ...baseResetValues, type: "Currencies" });
      setPreSelectedSecurityDetails(null);
    } else if (isPreSelectedStockMode && preSelectedSecurityId) {
      form.reset({ ...baseResetValues, type: "Stocks", selectedStockId: preSelectedSecurityId });
      getListedSecurityById(preSelectedSecurityId).then(security => {
        if (isMounted && security) {
          setPreSelectedSecurityDetails(security);
          form.setValue("purchasePricePerShare", String(security.price));
        } else if (isMounted) {
          toast({ title: "Error", description: "Pre-selected security not found.", variant: "destructive" });
          router.replace('/investments/add');
        }
      });
    } else if (preSelectedInvestmentTypeQueryParam) {
      form.reset({ ...baseResetValues, type: preSelectedInvestmentTypeQueryParam});
      setPreSelectedSecurityDetails(null);
    }
    return () => { isMounted = false; };
  }, [isDedicatedDebtMode, isDedicatedGoldMode, isDedicatedCurrencyMode, isPreSelectedStockMode, preSelectedSecurityId, preSelectedInvestmentTypeQueryParam, getListedSecurityById, form, toast, router]);


  async function onSubmit(values: AddInvestmentFormValues) {
    // console.log("AddInvestmentForm - onSubmit - Zod parsed values:", JSON.stringify(values, null, 2));

    if (Object.keys(form.formState.errors).length > 0) {
        // console.error("Validation errors present, cannot submit:", form.formState.errors)
        toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
        return;
    }
    
    setIsLoadingAi(false);
    setAiAnalysisResult(null);

    const investmentId = uuidv4();
    let investmentName = values.name || ""; 

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

    if (finalInvestmentType === "Stocks") {
      const securityToProcessId = values.selectedStockId || preSelectedSecurityId;
      const selectedSecurity = listedSecurities.find(sec => sec.id === securityToProcessId) || preSelectedSecurityDetails;

      if (!selectedSecurity) {
        toast({ title: "Error", description: "Selected security details not found.", variant: "destructive" });
        return;
      }
      
      const numShares = values.numberOfShares!;
      const pricePerShare = values.purchasePricePerShare!;
      const fees = values.purchaseFees!;
      const calculatedAmountInvested = (numShares * pricePerShare) + fees;

      investmentName = values.name || `${selectedSecurity.name} Purchase`;

      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: calculatedAmountInvested,
        actualStockName: selectedSecurity.name,
        tickerSymbol: selectedSecurity.symbol,
        stockLogoUrl: selectedSecurity.logoUrl,
        numberOfShares: numShares,
        purchasePricePerShare: pricePerShare,
        purchaseFees: fees,
        type: 'Stocks',
      };

    } else if (finalInvestmentType === "Debt Instruments") {
        investmentName = values.name || `${values.debtSubType || 'Debt'} from ${values.issuer || 'N/A'}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: values.amountInvested!,
          issuer: values.issuer!,
          interestRate: values.interestRate!,
          maturityDate: values.maturityDate!,
          debtSubType: values.debtSubType!,
          type: 'Debt Instruments',
        };
    } else if (finalInvestmentType === "Gold") {
        investmentName = values.name || `Gold (${values.goldType || 'N/A'}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: values.amountInvested!,
          goldType: values.goldType!,
          quantityInGrams: values.quantityInGrams!,
          type: 'Gold',
        };
    } else if (finalInvestmentType === "Currencies") {
        investmentName = values.name || `Currency (${values.currencyCode || 'N/A'}) on ${values.purchaseDate}`;
        const foreignAmount = values.foreignCurrencyAmount!;
        const rateAtPurchase = values.exchangeRateAtPurchase!;
        const calculatedCost = foreignAmount * rateAtPurchase;

        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: calculatedCost,
          currencyCode: values.currencyCode!,
          foreignCurrencyAmount: foreignAmount,
          exchangeRateAtPurchase: rateAtPurchase,
          baseCurrencyAtPurchase: values.baseCurrencyAtPurchase!,
          type: 'Currencies',
        };

        if (values.currencyCode && values.baseCurrencyAtPurchase && values.exchangeRateAtPurchase && foreignAmount) {
          setIsLoadingAi(true);
          try {
            const aiInput: CurrencyFluctuationAnalysisInput = {
                transactionCurrency: values.currencyCode!,
                transactionAmount: foreignAmount,
                transactionDate: values.purchaseDate,
                baseCurrency: values.baseCurrencyAtPurchase!,
                currentExchangeRate: rateAtPurchase,
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
        investmentName = values.name || `Real Estate (${values.propertyAddress || 'N/A'}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: values.amountInvested!,
          propertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          type: 'Real Estate',
        };
    } else {
         investmentName = values.name || `${finalInvestmentType} Investment on ${values.purchaseDate}`;
         newInvestment = { ...newInvestmentBase, name: investmentName, amountInvested: values.amountInvested!, type: finalInvestmentType as any };
    }
    
    newInvestment.name = investmentName; 

    await addInvestment(newInvestment, analysisResultFromAi);
    toast({
      title: "Investment Added",
      description: `${newInvestment.name} (${finalInvestmentType}) has been successfully added.`,
    });

    const resetValues: AddInvestmentFormValues = {
        ...initialFormValues,
        type: (isDedicatedDebtMode || isDedicatedGoldMode || isDedicatedCurrencyMode) ? finalInvestmentType : (isPreSelectedStockMode ? "Stocks" : undefined),
        selectedStockId: isPreSelectedStockMode && preSelectedSecurityId ? preSelectedSecurityId : undefined,
        name: "", 
        purchaseDate: getCurrentDate(),
        baseCurrencyAtPurchase: "EGP",
    };
    
    form.reset(resetValues);
    
    if (!isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode && !preSelectedInvestmentTypeQueryParam) {
        router.replace('/investments/add'); 
    }
    
    if (!analysisResultFromAi) { 
       setAiAnalysisResult(null);
    }
  }

  const handleNumericInputChangeCallback = useCallback((field: any, rawStringValue: string) => {
    if (rawStringValue === '') {
      field.onChange(''); // Pass empty string to allow Zod to coerce or use default
      return;
    }
    const decimalRegex = /^\d*\.?\d*$/;
    if (decimalRegex.test(rawStringValue)) {
      field.onChange(rawStringValue);
    }
  }, []);
  
  let pageTitle = "Add New Investment";
  let submitButtonText = `Add Investment`;

  if (isDedicatedGoldMode) {
    pageTitle = "Add Gold Investment";
    submitButtonText = "Add Gold Investment";
  } else if (isDedicatedDebtMode) {
    pageTitle = "Buy Debt Instrument";
    submitButtonText = "Buy Debt Instrument";
  } else if (isDedicatedCurrencyMode) {
    pageTitle = "Add Currency Holding";
    submitButtonText = "Add Currency";
  } else if (isPreSelectedStockMode && preSelectedSecurityDetails) {
    pageTitle = `Buy: ${preSelectedSecurityDetails.name}`;
    submitButtonText = `Buy ${preSelectedSecurityDetails.securityType === 'Fund' ? 'Fund' : 'Stock'}`;
  } else if (preSelectedInvestmentTypeQueryParam) {
    pageTitle = `Add New ${preSelectedInvestmentTypeQueryParam}`;
    submitButtonText = `Add ${preSelectedInvestmentTypeQueryParam}`;
  } else if (effectiveSelectedType) {
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
          <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 5.5" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="maturityDate" render={({ field }) => (
          <FormItem><FormLabel>Maturity Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="amountInvested" render={({ field }) => (
          <FormItem><FormLabel>Total Amount Invested (Cost)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 10000.75" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormDescription>Total cost including any fees.</FormDescription><FormMessage /></FormItem>
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
       {!isPreSelectedStockMode && <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="md:col-span-2 mt-4"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder="e.g., My Apple Shares" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} /> }
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
            <FormItem><FormLabel>Number of Securities</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 100.5" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="purchasePricePerShare" render={({ field }) => (
            <FormItem><FormLabel>Purchase Price (per security)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 150.50" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="purchaseFees" render={({ field }) => (
            <FormItem><FormLabel>Purchase Fees (optional)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 5.00" {...field} value={String(field.value ?? '0')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormDescription>Brokerage or transaction fees for this purchase.</FormDescription><FormMessage /></FormItem>
          )}
        />
        <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()}/></FormControl><FormMessage /></FormItem>
          )}
        />
      </div>
    </div>
  );


  const RenderCurrencyFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Currency Holding Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!isDedicatedCurrencyMode && (
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder="e.g., USD Savings or Trip to Europe Fund" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
          )}
        <FormField control={form.control} name="currencyCode" render={({ field }) => (
            <FormItem><FormLabel>Transaction Currency Code</FormLabel><FormControl><Input placeholder="e.g., USD, EUR" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="foreignCurrencyAmount" render={({ field }) => (
            <FormItem><FormLabel>Foreign Currency Amount</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 1000" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormDescription>Amount of the foreign currency you bought.</FormDescription><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="exchangeRateAtPurchase" render={({ field }) => (
            <FormItem><FormLabel>Exchange Rate at Purchase (to EGP)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 30.85 (for USD to EGP)" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="baseCurrencyAtPurchase" render={({ field }) => (
            <FormItem><FormLabel>Base Currency at Purchase</FormLabel><FormControl><Input placeholder="e.g., EGP" {...field} value={field.value || 'EGP'} /></FormControl><FormDescription>The currency used for the transaction cost. Default EGP.</FormDescription><FormMessage /></FormItem>
          )} />
         <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()} /></FormControl><FormMessage /></FormItem>
          )} />
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
          <FormItem><FormLabel>Total Amount Invested (Cost)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 1000000.00" {...field} value={String(field.value ?? '')} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormDescription>Total cost including any fees.</FormDescription><FormMessage /></FormItem>
          )}
        />
        <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()}/></FormControl><FormMessage /></FormItem>
          )}
        />
      </div>
    </div>
  );
  
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
             isDedicatedGoldMode ? <MemoizedRenderGoldFieldsSection control={form.control} handleNumericInputChange={handleNumericInputChangeCallback} getCurrentDateForForm={getCurrentDate} isDedicatedGoldMode={true} /> :
             isDedicatedCurrencyMode ? <RenderCurrencyFields /> :
             isPreSelectedStockMode ? <RenderStockFields /> :
             ( // General Mode
                <>
                  <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem><FormLabel>Investment Type</FormLabel><Select onValueChange={(value) => { field.onChange(value); const currentValues = form.getValues(); form.reset({ ...initialFormValues, type: value as InvestmentType, purchaseDate: currentValues.purchaseDate || getCurrentDate(), baseCurrencyAtPurchase: "EGP" }); setPreSelectedSecurityDetails(null); }} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select an investment type" /></SelectTrigger></FormControl><SelectContent>{investmentTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                    )}
                  />
                  {effectiveSelectedType === "Stocks" && <RenderStockFields />}
                  {effectiveSelectedType === "Gold" && <MemoizedRenderGoldFieldsSection control={form.control} handleNumericInputChange={handleNumericInputChangeCallback} getCurrentDateForForm={getCurrentDate} />}
                  {effectiveSelectedType === "Currencies" && <RenderCurrencyFields />}
                  {effectiveSelectedType === "Real Estate" && <RenderRealEstateFields />}
                  {effectiveSelectedType === "Debt Instruments" && <RenderDebtFields />}
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
