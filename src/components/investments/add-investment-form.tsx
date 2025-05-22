
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
  amountInvested: '',
  purchaseDate: getCurrentDate(),
  name: "", 

  selectedStockId: undefined,
  numberOfShares: '',
  purchasePricePerShare: '',
  purchaseFees: "0", 

  goldType: undefined,
  quantityInGrams: '',

  currencyCode: "",
  foreignCurrencyAmount: '',
  exchangeRateAtPurchase: '',

  propertyAddress: "",
  propertyType: undefined,

  debtSubType: undefined,
  issuer: "",
  interestRate: '',
  maturityDate: '',
};

// Props for Gold Fields Section
interface RenderGoldFieldsSectionProps {
  control: any; 
  isDedicatedGoldMode?: boolean;
}

// Memoized Gold Fields Section
const MemoizedRenderGoldFieldsSection: React.FC<RenderGoldFieldsSectionProps> = React.memo(
  function RenderGoldFieldsSection({
    control,
    isDedicatedGoldMode,
  }) {
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
                  placeholder="e.g., 50 or 2.5"
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
});
MemoizedRenderGoldFieldsSection.displayName = 'MemoizedRenderGoldFieldsSection';


// Props for Currency Fields Section
interface RenderCurrencyFieldsProps {
  control: any;
  isDedicatedCurrencyMode?: boolean;
}

// Memoized Currency Fields Section
const MemoizedRenderCurrencyFields: React.FC<RenderCurrencyFieldsProps> = React.memo(
  function RenderCurrencyFields({
    control,
    isDedicatedCurrencyMode,
  }) {
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
});
MemoizedRenderCurrencyFields.displayName = 'MemoizedRenderCurrencyFields';


export function AddInvestmentForm() {
  const { addInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSelectedSecurityId = searchParams.get('stockId');
  const preSelectedInvestmentTypeQueryParam = searchParams.get('type') as InvestmentType | null;
  
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<CurrencyFluctuationAnalysisOutput | null>(null);
  const { listedSecurities, isLoading: isLoadingListedSecurities, error: listedSecuritiesError, getListedSecurityById } = useListedSecurities();
  const [preSelectedSecurityDetails, setPreSelectedSecurityDetails] = useState<ListedSecurity | null>(null);

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: initialFormValues,
  });

  const selectedTypeFromForm = form.watch("type");

  const isDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments";
  const isDedicatedGoldMode = preSelectedInvestmentTypeQueryParam === "Gold";
  const isDedicatedCurrencyMode = preSelectedInvestmentTypeQueryParam === "Currencies";
  const isPreSelectedStockMode = !!preSelectedSecurityId && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode;


  const effectiveSelectedType = isDedicatedGoldMode ? "Gold" :
                                isDedicatedDebtMode ? "Debt Instruments" :
                                isDedicatedCurrencyMode ? "Currencies" :
                                isPreSelectedStockMode ? "Stocks" :
                                selectedTypeFromForm;

  useEffect(() => {
    let isMounted = true;
    // console.log("AddInvestmentForm: Reading URL Params");
    // console.log("AddInvestmentForm - preSelectedSecurityId from URL:", preSelectedSecurityId);
    // console.log("AddInvestmentForm - preSelectedInvestmentTypeQueryParam from URL:", preSelectedInvestmentTypeQueryParam);
    
    const baseResetValues: AddInvestmentFormValues = {
        ...initialFormValues, 
        purchaseDate: form.getValues("purchaseDate") || getCurrentDate(),
        amountInvested: '',
        numberOfShares: '',
        purchasePricePerShare: '',
        purchaseFees: '0',
        quantityInGrams: '',
        foreignCurrencyAmount: '',
        exchangeRateAtPurchase: '',
        interestRate: '',
        name: "", // Ensure name is always reset
    };
    // console.log("AddInvestmentForm - Calculated Modes:");
    // console.log("AddInvestmentForm - isDedicatedDebtMode:", isDedicatedDebtMode);
    // console.log("AddInvestmentForm - isDedicatedGoldMode:", isDedicatedGoldMode);
    // console.log("AddInvestmentForm - isDedicatedCurrencyMode:", isDedicatedCurrencyMode);
    // console.log("AddInvestmentForm - isPreSelectedStockMode:", isPreSelectedStockMode);


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
      // console.log("AddInvestmentForm - useEffect - Applying Pre-selected Stock Mode settings to form.");
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
    } else if (preSelectedInvestmentTypeQueryParam && !isDedicatedGoldMode && !isDedicatedDebtMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode) {
      // console.log("AddInvestmentForm - useEffect - Applying general pre-selected type from URL param (not dedicated).");
      form.reset({ ...baseResetValues, type: preSelectedInvestmentTypeQueryParam});
      setPreSelectedSecurityDetails(null);
    } else if (!preSelectedInvestmentTypeQueryParam && !preSelectedSecurityId) {
        // console.log("AddInvestmentForm - useEffect - No specific pre-selection, general mode.");
        form.reset({ ...baseResetValues, type: selectedTypeFromForm || undefined, name: form.getValues("name") || "" });
        setPreSelectedSecurityDetails(null);
    }
    return () => { isMounted = false; };
  }, [isDedicatedDebtMode, isDedicatedGoldMode, isDedicatedCurrencyMode, isPreSelectedStockMode, preSelectedSecurityId, preSelectedInvestmentTypeQueryParam, getListedSecurityById, form, toast, router, selectedTypeFromForm]);


  async function onSubmit(values: AddInvestmentFormValues) {
    // console.log("AddInvestmentForm - onSubmit - Raw Zod parsed values:", JSON.stringify(values, null, 2));

    if (Object.keys(form.formState.errors).length > 0) {
        console.error("Validation errors present, cannot submit:", form.formState.errors);
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

    const parsedAmountInvested = values.amountInvested ? parseFloat(String(values.amountInvested)) : 0;
    const parsedNumberOfShares = values.numberOfShares ? parseFloat(String(values.numberOfShares)) : 0;
    const parsedPricePerShare = values.purchasePricePerShare ? parseFloat(String(values.purchasePricePerShare)) : 0;
    const parsedPurchaseFees = values.purchaseFees ? parseFloat(String(values.purchaseFees)) : 0;
    const parsedQuantityInGrams = values.quantityInGrams ? parseFloat(String(values.quantityInGrams)) : 0;
    const parsedForeignCurrencyAmount = values.foreignCurrencyAmount ? parseFloat(String(values.foreignCurrencyAmount)) : 0;
    const parsedExchangeRateAtPurchase = values.exchangeRateAtPurchase ? parseFloat(String(values.exchangeRateAtPurchase)) : 0;
    const parsedInterestRate = values.interestRate ? parseFloat(String(values.interestRate)) : 0;


    if (finalInvestmentType === "Stocks") {
      const securityToProcessId = values.selectedStockId || preSelectedSecurityId;
      const selectedSecurity = listedSecurities.find(sec => sec.id === securityToProcessId) || preSelectedSecurityDetails;

      if (!selectedSecurity) {
        toast({ title: "Error", description: "Selected security details not found.", variant: "destructive" });
        return;
      }
      
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
        investmentName = `${values.debtSubType || 'Debt Instrument'} (${values.issuer || 'N/A'}) on ${values.purchaseDate}`;
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
        investmentName = isDedicatedGoldMode ? `Gold (${values.goldType || 'N/A'}) purchase on ${values.purchaseDate}` : (values.name || `Gold (${values.goldType || 'N/A'}) on ${values.purchaseDate}`);
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parsedAmountInvested,
          goldType: values.goldType!,
          quantityInGrams: parsedQuantityInGrams,
          type: 'Gold',
        };
    } else if (finalInvestmentType === "Currencies") {
        investmentName = isDedicatedCurrencyMode ? `Currency (${values.currencyCode || 'N/A'}) purchase on ${values.purchaseDate}` : (values.name || `Currency (${values.currencyCode || 'N/A'}) on ${values.purchaseDate}`);
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
        investmentName = values.name || `Real Estate (${values.propertyAddress || 'N/A'}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parsedAmountInvested,
          propertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          type: 'Real Estate',
        };
    } else { 
         investmentName = values.name || `${finalInvestmentType} Investment on ${values.purchaseDate}`;
         newInvestment = { ...newInvestmentBase, name: investmentName, amountInvested: parsedAmountInvested, type: finalInvestmentType as any };
    }
    
    newInvestment.name = investmentName; 
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
    
    if (!resetTargetType && !isPreSelectedStockMode && !preSelectedInvestmentTypeQueryParam) { 
        if (!preSelectedInvestmentTypeQueryParam && !isPreSelectedStockMode) {
             router.replace('/investments/add'); 
        }
    }
    
    if (!analysisResultFromAi) { 
       setAiAnalysisResult(null);
    }
  }

  
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
    pageTitle = `Buy: ${preSelectedSecurityDetails.name} (${preSelectedSecurityDetails.securityType === 'Fund' ? preSelectedSecurityDetails.fundType || 'Fund' : preSelectedSecurityDetails.symbol})`;
    submitButtonText = `Buy ${preSelectedSecurityDetails.securityType === 'Fund' ? 'Fund' : 'Stock'}`;
  } else if (preSelectedInvestmentTypeQueryParam && !isDedicatedGoldMode && !isDedicatedDebtMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode) {
    pageTitle = `Add New ${preSelectedInvestmentTypeQueryParam}`;
    submitButtonText = `Add ${preSelectedInvestmentTypeQueryParam}`;
  } else if (effectiveSelectedType && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode) {
     submitButtonText = `Add ${effectiveSelectedType}`;
  }

  // console.log("AddInvestmentForm - Form State and Watched Values for Rendering:");
  // console.log("  form.watch('type'):", form.watch("type"));
  // console.log("  effectiveSelectedType:", effectiveSelectedType);
  // console.log("  isDedicatedDebtMode:", isDedicatedDebtMode);
  // console.log("  isDedicatedGoldMode:", isDedicatedGoldMode);
  // console.log("  isDedicatedCurrencyMode:", isDedicatedCurrencyMode);
  // console.log("  isPreSelectedStockMode:", isPreSelectedStockMode);


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
                placeholder="e.g., 100.5" 
                value={field.value} 
                onChange={field.onChange}
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
      !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode && (
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
      )
  );
  
  // console.log("AddInvestmentForm: Determining render path in JSX...");
  // console.log("  JSX - isDedicatedDebtMode:", isDedicatedDebtMode);
  // console.log("  JSX - isDedicatedGoldMode:", isDedicatedGoldMode);
  // console.log("  JSX - isDedicatedCurrencyMode:", isDedicatedCurrencyMode);
  // console.log("  JSX - isPreSelectedStockMode:", isPreSelectedStockMode);
  // console.log("  JSX - effectiveSelectedType:", effectiveSelectedType);


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
             ( 
                <>
                  <RenderGeneralTypeSelector />
                  {effectiveSelectedType && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isPreSelectedStockMode && effectiveSelectedType !== "Stocks" && effectiveSelectedType !== "Debt Instruments" && (
                     <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="mt-6"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder={`e.g., My ${effectiveSelectedType} Investment`} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

                  {effectiveSelectedType === "Stocks" && <RenderStockFields />}
                  {effectiveSelectedType === "Gold" && <MemoizedRenderGoldFieldsSection control={form.control} />}
                  {effectiveSelectedType === "Currencies" && <MemoizedRenderCurrencyFields control={form.control} />}
                  {effectiveSelectedType === "Real Estate" && <RenderRealEstateFields />}
                  {effectiveSelectedType === "Debt Instruments" && <RenderDebtFields />}

                  {effectiveSelectedType !== "Stocks" && 
                   effectiveSelectedType !== "Debt Instruments" && 
                   effectiveSelectedType !== "Gold" && // Gold amount is in its specific section for dedicated mode
                   effectiveSelectedType !== "Currencies" && // Currency amount is calculated
                    (
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
