
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
import { AddInvestmentSchema, type AddInvestmentFormValues, investmentTypes, goldTypes } from "@/lib/schemas";
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
  
  selectedStockId: undefined,
  numberOfShares: '', 
  purchasePricePerShare: '', 
  purchaseFees: '', 

  goldType: undefined,
  quantityInGrams: '', 

  currencyCode: "",
  baseCurrency: "",
  currentExchangeRate: '', 

  propertyAddress: "",
  propertyType: undefined,

  debtSubType: undefined,
  issuer: "",
  interestRate: '', 
  maturityDate: '', 
  name: "", 
};

// Memoized component for Gold Fields
const MemoizedRenderGoldFieldsSection = React.memo(function RenderGoldFieldsSection({
  control,
  handleNumericInput,
  getCurrentDateForForm,
}: {
  control: any;
  handleNumericInput: (field: any, value: string) => void;
  getCurrentDateForForm: () => string;
}) {
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Gold Investment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* "Name / Description" field removed from here */}
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
                      {gType === 'K24' && '24 Karat (per gram)'}
                      {gType === 'K21' && '21 Karat (per gram)'}
                      {gType === 'Pound' && 'Gold Pound (unit)'}
                      {gType === 'Ounce' && 'Ounce (unit)'}
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
                  value={field.value ?? ''}
                  onChange={e => handleNumericInput(field, e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="amountInvested"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Amount Invested</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 10000.50"
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => handleNumericInput(field, e.target.value)}
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
  
  // console.log("AddInvestmentForm: Reading URL Params");
  const preSelectedSecurityId = searchParams.get('stockId');
  const preSelectedInvestmentTypeQueryParam = searchParams.get('type') as InvestmentType | null;
  // console.log("AddInvestmentForm - preSelectedSecurityId from URL:", preSelectedSecurityId);
  // console.log("AddInvestmentForm - preSelectedInvestmentTypeQueryParam from URL:", preSelectedInvestmentTypeQueryParam);


  const isDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments";
  const isDedicatedGoldMode = preSelectedInvestmentTypeQueryParam === "Gold";
  const isPreSelectedStockMode = !!preSelectedSecurityId && !isDedicatedDebtMode && !isDedicatedGoldMode;
  
  // console.log("AddInvestmentForm - Calculated Modes:");
  // console.log("AddInvestmentForm - isDedicatedDebtMode:", isDedicatedDebtMode);
  // console.log("AddInvestmentForm - isDedicatedGoldMode:", isDedicatedGoldMode);
  // console.log("AddInvestmentForm - isPreSelectedStockMode:", isPreSelectedStockMode);
  
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
                                isPreSelectedStockMode ? "Stocks" : 
                                selectedTypeFromForm;

  // console.log("AddInvestmentForm - Form State and Watched Values:");
  // console.log("AddInvestmentForm - form.watch('type'):", form.watch("type"));
  // console.log("AddInvestmentForm - effectiveSelectedType for UI logic:", effectiveSelectedType);

  useEffect(() => {
    let isMounted = true;
    // console.log("AddInvestmentForm - useEffect for pre-selection triggered.");
    // console.log("  Inside useEffect: isDedicatedGoldMode:", isDedicatedGoldMode, "isDedicatedDebtMode:", isDedicatedDebtMode, "isPreSelectedStockMode:", isPreSelectedStockMode);

    if (isDedicatedGoldMode) {
      // console.log("AddInvestmentForm - useEffect - Applying Dedicated Gold Mode settings to form.");
      form.setValue("type", "Gold", { shouldValidate: true });
      form.setValue("selectedStockId", undefined); // Clear any stock selection
      setPreSelectedSecurityDetails(null); // Clear any stock details
    } else if (isDedicatedDebtMode) {
      // console.log("AddInvestmentForm - useEffect - Applying Dedicated Debt Mode settings to form.");
      form.setValue("type", "Debt Instruments", { shouldValidate: true });
      form.setValue("selectedStockId", undefined); 
      setPreSelectedSecurityDetails(null);
    } else if (isPreSelectedStockMode && preSelectedSecurityId) {
      // console.log("AddInvestmentForm - useEffect - Applying Pre-selected Stock Mode settings to form for ID:", preSelectedSecurityId);
      form.setValue("type", "Stocks", { shouldValidate: true });
      form.setValue("selectedStockId", preSelectedSecurityId, { shouldValidate: true });
      getListedSecurityById(preSelectedSecurityId).then(security => {
        if (isMounted && security) {
          // console.log("AddInvestmentForm - useEffect - Pre-selected security found:", security.name);
          setPreSelectedSecurityDetails(security);
        } else if (isMounted) {
          // console.error("AddInvestmentForm - useEffect - Pre-selected security NOT found for ID:", preSelectedSecurityId);
          toast({
            title: "Error",
            description: "Pre-selected security not found.",
            variant: "destructive",
          });
          router.replace('/investments/add'); 
        }
      });
    } else if (preSelectedInvestmentTypeQueryParam) {
      // console.log("AddInvestmentForm - useEffect - Applying general pre-selected type:", preSelectedInvestmentTypeQueryParam);
      form.setValue("type", preSelectedInvestmentTypeQueryParam, { shouldValidate: true });
      if (preSelectedInvestmentTypeQueryParam !== "Stocks") {
        form.setValue("selectedStockId", undefined);
      }
      setPreSelectedSecurityDetails(null);
    } else {
       // console.log("AddInvestmentForm - useEffect - No pre-selection, general mode.");
       // Clear stock selection if current type is not 'Stocks'
       if (form.getValues("type") !== "Stocks" && form.getValues("selectedStockId")) {
         form.setValue("selectedStockId", undefined);
      }
    }
    return () => { isMounted = false; };
  }, [isDedicatedDebtMode, isDedicatedGoldMode, isPreSelectedStockMode, preSelectedSecurityId, preSelectedInvestmentTypeQueryParam, getListedSecurityById, form, toast, router]);


  async function onSubmit(values: AddInvestmentFormValues) {
    // console.log("AddInvestmentForm - onSubmit triggered. Values:", JSON.stringify(values, null, 2));
    // console.log("AddInvestmentForm - onSubmit - form.formState.errors:", JSON.stringify(form.formState.errors, null, 2));

    if (Object.keys(form.formState.errors).length > 0) {
        // console.error("AddInvestmentForm - Submission prevented by validation errors:", form.formState.errors);
        toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
        return;
    }
    
    setIsLoadingAi(false);
    setAiAnalysisResult(null);

    const investmentId = uuidv4();
    let investmentName = values.name || ""; 

    const finalInvestmentType = isDedicatedGoldMode ? "Gold" :
                                isDedicatedDebtMode ? "Debt Instruments" :
                                isPreSelectedStockMode ? "Stocks" :
                                values.type; 

    // console.log("AddInvestmentForm - onSubmit - finalInvestmentType:", finalInvestmentType);

    if (!finalInvestmentType) {
        // console.error("AddInvestmentForm - onSubmit - Investment type is missing!");
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
    let analysisResult: CurrencyFluctuationAnalysisOutput | undefined = undefined;

    if (finalInvestmentType === "Stocks") {
      // console.log("AddInvestmentForm - onSubmit - Processing 'Stocks' type.");
      const securityToProcessId = values.selectedStockId || preSelectedSecurityId;
      // console.log("AddInvestmentForm - onSubmit - securityToProcessId:", securityToProcessId);
      // console.log("AddInvestmentForm - onSubmit - available listedSecurities (name, id):", listedSecurities.map(s => ({name: s.name, id: s.id })));
      
      const selectedSecurity = listedSecurities.find(sec => sec.id === securityToProcessId) || preSelectedSecurityDetails;

      if (!selectedSecurity) {
        // console.error("AddInvestmentForm - onSubmit - Selected security details not found for ID:", securityToProcessId);
        toast({ title: "Error", description: "Selected security details not found.", variant: "destructive" });
        return;
      }
      // console.log("AddInvestmentForm - onSubmit - Selected security:", selectedSecurity.name);
      
      const numShares = parseFloat(String(values.numberOfShares) || '0');
      const pricePerShare = parseFloat(String(values.purchasePricePerShare) || '0');
      const fees = parseFloat(String(values.purchaseFees) || '0');
      const calculatedAmountInvested = (numShares * pricePerShare) + fees;

      investmentName = `${selectedSecurity.name} Purchase`; 

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
        // console.log("AddInvestmentForm - onSubmit - Processing 'Debt Instruments' type.");
        investmentName = `${values.debtSubType} from ${values.issuer}`; 
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parseFloat(String(values.amountInvested || '0')),
          issuer: values.issuer!,
          interestRate: parseFloat(String(values.interestRate) || '0'),
          maturityDate: values.maturityDate!,
          debtSubType: values.debtSubType!, 
          type: 'Debt Instruments',
        };
    } else if (finalInvestmentType === "Gold") {
        // console.log("AddInvestmentForm - onSubmit - Processing 'Gold' type.");
        investmentName = values.name || `Gold (${values.goldType || 'N/A'}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: parseFloat(String(values.amountInvested || '0')), 
          goldType: values.goldType!,
          quantityInGrams: parseFloat(String(values.quantityInGrams) || '0'),
          type: 'Gold',
        };
    } else { 
      // console.log("AddInvestmentForm - onSubmit - Processing other types (Currencies, Real Estate).");
      const generalAmountInvested = parseFloat(String(values.amountInvested || '0'));
      newInvestmentBase.amountInvested = generalAmountInvested;
      
      if (finalInvestmentType === "Currencies") {
        investmentName = values.name || `Currency (${values.currencyCode || 'N/A'}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          currencyCode: values.currencyCode!,
          baseCurrency: values.baseCurrency!,
          currentExchangeRate: parseFloat(String(values.currentExchangeRate) || '0'),
          type: 'Currencies',
        };

        if (values.currencyCode && values.baseCurrency && values.currentExchangeRate && newInvestmentBase.amountInvested) {
          setIsLoadingAi(true);
          try {
            const aiInput: CurrencyFluctuationAnalysisInput = {
                transactionCurrency: values.currencyCode!,
                transactionAmount: newInvestmentBase.amountInvested,
                transactionDate: values.purchaseDate,
                baseCurrency: values.baseCurrency!,
                currentExchangeRate: parseFloat(String(values.currentExchangeRate) || '0'),
            };
            analysisResult = await currencyFluctuationAnalysis(aiInput);
            setAiAnalysisResult(analysisResult);
          } catch (error) {
              // console.error("AddInvestmentForm - onSubmit - AI Analysis Failed:", error);
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
          propertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          type: 'Real Estate',
        };
      } else {
         // console.warn("AddInvestmentForm - onSubmit - Fallback investment type processing. This shouldn't usually be hit if all types are handled explicitly.");
         investmentName = values.name || `${finalInvestmentType} Investment on ${values.purchaseDate}`;
         newInvestment = { ...newInvestmentBase, name: investmentName, type: finalInvestmentType as any }; 
      }
    }
    
    newInvestment.name = investmentName; 
    // console.log("AddInvestmentForm - onSubmit - Final newInvestment object:", newInvestment);

    await addInvestment(newInvestment, analysisResult);
    toast({
      title: "Investment Added",
      description: `${newInvestment.name} (${finalInvestmentType}) has been successfully added.`,
    });

    const resetValues: AddInvestmentFormValues = { 
        ...initialFormValues,
        type: (isDedicatedDebtMode || isDedicatedGoldMode) ? finalInvestmentType : (isPreSelectedStockMode ? "Stocks" : undefined), 
        selectedStockId: isPreSelectedStockMode && preSelectedSecurityId ? preSelectedSecurityId : undefined,
        name: "", 
        amountInvested: '', 
        purchaseDate: getCurrentDate(),
        numberOfShares: '',
        purchasePricePerShare: '',
        purchaseFees: '',
        goldType: isDedicatedGoldMode ? form.getValues("goldType") : undefined, 
        quantityInGrams: '',
        currencyCode: "",
        baseCurrency: "",
        currentExchangeRate: '',
        propertyAddress: "",
        propertyType: undefined,
        debtSubType: isDedicatedDebtMode ? form.getValues("debtSubType") : undefined, 
        issuer: "",
        interestRate: '',
        maturityDate: '',
    };
    
    form.reset(resetValues);
    
    // console.log("AddInvestmentForm - onSubmit - Form reset with values:", resetValues);
    if (!isDedicatedDebtMode && !isDedicatedGoldMode && !isPreSelectedStockMode && !preSelectedInvestmentTypeQueryParam) {
        // console.log("AddInvestmentForm - onSubmit - Resetting router to general add page.");
        router.replace('/investments/add'); 
    }
    
    if (!analysisResult) {
       setAiAnalysisResult(null);
    }
  }

  const handleNumericInputChangeCallback = useCallback((field: any, rawStringValue: string) => {
    if (rawStringValue === '') {
      field.onChange(undefined); 
    } else {
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
  } else if (isPreSelectedStockMode && preSelectedSecurityDetails) {
    pageTitle = `Buy: ${preSelectedSecurityDetails.name}`;
    submitButtonText = `Buy ${preSelectedSecurityDetails.securityType === 'Fund' ? 'Fund' : 'Stock'}`;
  } else if (preSelectedInvestmentTypeQueryParam && !isDedicatedDebtMode && !isDedicatedGoldMode) {
    pageTitle = `Add New ${preSelectedInvestmentTypeQueryParam}`;
    submitButtonText = `Add ${preSelectedInvestmentTypeQueryParam}`;
  } else if (effectiveSelectedType) {
     submitButtonText = `Add ${effectiveSelectedType}`;
  }

  // console.log("AddInvestmentForm - Rendering - pageTitle:", pageTitle);
  // console.log("AddInvestmentForm - Rendering - submitButtonText:", submitButtonText);

  const RenderDebtFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Debt Instrument Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="debtSubType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specific Debt Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of debt" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Certificate">Certificate</SelectItem>
                  <SelectItem value="Treasury Bill">Treasury Bill</SelectItem>
                  <SelectItem value="Bond">Bond</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="issuer" render={({ field }) => (
          <FormItem><FormLabel>Issuer / Institution</FormLabel><FormControl><Input placeholder="e.g., US Treasury, XYZ Corp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="interestRate" render={({ field }) => (
          <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 5.5" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="maturityDate" render={({ field }) => (
          <FormItem><FormLabel>Maturity Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField
          control={form.control}
          name="amountInvested"
          render={({ field }) => (
          <FormItem>
              <FormLabel>Total Amount Invested</FormLabel>
              <FormControl>
              <Input type="text" inputMode="decimal" placeholder="e.g., 10000.75" {...field}
                  value={field.value ?? ''}
                  onChange={e => handleNumericInputChangeCallback(field, e.target.value)} />
              </FormControl>
              <FormDescription>Total cost including any fees.</FormDescription>
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
    </div>
  );

  const RenderStockFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {preSelectedSecurityDetails?.securityType === 'Fund' ? 'Fund Purchase Details' : 'Stock Purchase Details'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!preSelectedSecurityId && ( 
          <FormField
            control={form.control}
            name="selectedStockId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Select Security (Stock or Fund)</FormLabel>
                <Select
                  onValueChange={(value) => {
                      field.onChange(value);
                      const security = listedSecurities.find(s => s.id === value);
                      setPreSelectedSecurityDetails(security || null);
                  }}
                  value={field.value || ""}
                  disabled={isLoadingListedSecurities || !!listedSecuritiesError || listedSecurities.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoadingListedSecurities ? "Loading securities..." :
                        listedSecuritiesError ? "Error loading securities" :
                        listedSecurities.length === 0 ? "No securities available" :
                        "Select a security from the list"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {listedSecurities.map((security) => (
                      <SelectItem key={security.id} value={security.id}>
                        {security.name} ({security.symbol}) - {security.securityType === 'Fund' ? security.fundType : security.market}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {preSelectedSecurityDetails && (
          <div className="md:col-span-2 p-3 bg-muted/50 rounded-md">
              <p className="text-sm font-medium">Selected Security: {preSelectedSecurityDetails.name} ({preSelectedSecurityDetails.symbol})</p>
              <p className="text-xs text-muted-foreground">Current Market Price: {preSelectedSecurityDetails.price.toLocaleString(undefined, {style: 'currency', currency: preSelectedSecurityDetails.currency})}</p>
              {preSelectedSecurityDetails.securityType === 'Fund' && preSelectedSecurityDetails.fundType &&
                <p className="text-xs text-muted-foreground">Type: {preSelectedSecurityDetails.fundType}</p>
              }
          </div>
        )}
        <FormField control={form.control} name="numberOfShares" render={({ field }) => (
            <FormItem><FormLabel>Number of Securities</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 100.5" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="purchasePricePerShare" render={({ field }) => (
            <FormItem><FormLabel>Purchase Price (per security)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 150.50" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField
          control={form.control}
          name="purchaseFees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Fees (optional)</FormLabel>
              <FormControl>
                <Input type="text" inputMode="decimal" placeholder="e.g., 5.00" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} />
              </FormControl>
              <FormDescription>Brokerage or transaction fees for this purchase.</FormDescription>
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
                <Input type="date" {...field} value={field.value || getCurrentDate()}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );


  const RenderCurrencyFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Currency Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField control={form.control} name="currencyCode" render={({ field }) => (
            <FormItem><FormLabel>Transaction Currency Code</FormLabel><FormControl><Input placeholder="e.g., USD" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="baseCurrency" render={({ field }) => (
            <FormItem><FormLabel>Base Currency Code (for comparison)</FormLabel><FormControl><Input placeholder="e.g., EUR" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="currentExchangeRate" render={({ field }) => (
            <FormItem><FormLabel>Current Exchange Rate (to Base)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="e.g., 0.92" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChangeCallback(field, e.target.value)} /></FormControl><FormDescription>Needed for AI fluctuation analysis.</FormDescription><FormMessage /></FormItem>
          )} />
      </div>
    </div>
  );

  const RenderRealEstateFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Real Estate Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="propertyAddress" render={({ field }) => (
          <FormItem><FormLabel>Property Address</FormLabel><FormControl><Input placeholder="e.g., 123 Main St, Anytown" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="propertyType" render={({ field }) => (
          <FormItem><FormLabel>Property Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Residential">Residential</SelectItem><SelectItem value="Commercial">Commercial</SelectItem><SelectItem value="Land">Land</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
      </div>
    </div>
  );
  
  const RenderGeneralModeFields = () => (
    <>
        {/* General Investment Type Selector - NOT rendered in dedicated modes */}
        {(!isDedicatedDebtMode && !isDedicatedGoldMode && !isPreSelectedStockMode) && (
           <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investment Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.reset({ 
                      ...initialFormValues, 
                      type: value as InvestmentType, 
                      purchaseDate: form.getValues("purchaseDate") || getCurrentDate(),
                      // Clear specific fields when type changes in general mode
                      selectedStockId: undefined,
                      numberOfShares: '',
                      purchasePricePerShare: '',
                      purchaseFees: '',
                      goldType: undefined,
                      quantityInGrams: '',
                      currencyCode: "",
                      baseCurrency: "",
                      currentExchangeRate: '',
                      propertyAddress: "",
                      propertyType: undefined,
                      debtSubType: undefined,
                      issuer: "",
                      interestRate: '',
                      maturityDate: '',
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
        )}

        {/* Name for Gold, Currency, Real Estate in general mode (NOT for dedicated gold mode) */}
        {effectiveSelectedType && ["Gold", "Currencies", "Real Estate"].includes(effectiveSelectedType) && !isDedicatedGoldMode && (
           <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem className="mt-6">
                    <FormLabel>Name / Description (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., My Gold Coins or Downtown Apartment" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
        )}

        {/* Amount & Date for Gold, Currencies, Real Estate in general mode (NOT for dedicated gold mode) */}
        {effectiveSelectedType && ["Gold", "Currencies", "Real Estate"].includes(effectiveSelectedType) && !isDedicatedGoldMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <FormField
                control={form.control}
                name="amountInvested"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Amount Invested</FormLabel>
                    <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="e.g., 10000.25" {...field}
                        value={field.value ?? ''}
                        onChange={e => handleNumericInputChangeCallback(field, e.target.value)} />
                    </FormControl>
                    <FormDescription>Total cost including any fees.</FormDescription>
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

        {/* Render type-specific field sections based on `effectiveSelectedType` for GENERAL mode */}
        {/* These are only rendered if not in a more specific dedicated mode */}
        {effectiveSelectedType === "Gold" && !isDedicatedGoldMode && <MemoizedRenderGoldFieldsSection control={form.control} handleNumericInput={handleNumericInputChangeCallback} getCurrentDateForForm={getCurrentDate} />}
        {effectiveSelectedType === "Currencies" && <RenderCurrencyFields />}
        {effectiveSelectedType === "Real Estate" && <RenderRealEstateFields />}
        {effectiveSelectedType === "Stocks" && !isPreSelectedStockMode && <RenderStockFields />} 
        {effectiveSelectedType === "Debt Instruments" && !isDedicatedDebtMode && <RenderDebtFields />}
    </>
  );


  // if (Object.keys(form.formState.errors).length > 0) {
  //   console.warn("AddInvestmentForm validation errors:", form.formState.errors);
  // }
  
  // console.log("AddInvestmentForm: Determining render path in JSX...");
  // console.log("  JSX - isDedicatedDebtMode:", isDedicatedDebtMode);
  // console.log("  JSX - isDedicatedGoldMode:", isDedicatedGoldMode);
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
            
            {isDedicatedDebtMode ? (
                <RenderDebtFields />
            ) : isDedicatedGoldMode ? (
                <MemoizedRenderGoldFieldsSection 
                    control={form.control} 
                    handleNumericInput={handleNumericInputChangeCallback}
                    getCurrentDateForForm={getCurrentDate}
                />
            ) : isPreSelectedStockMode ? (
              <RenderStockFields />
            ) : (
              <RenderGeneralModeFields />
            )}

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
                (effectiveSelectedType === "Stocks" && !isDedicatedDebtMode && !isPreSelectedStockMode && !isDedicatedGoldMode && (isLoadingListedSecurities || !!listedSecuritiesError || !form.getValues("selectedStockId"))) ||
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

