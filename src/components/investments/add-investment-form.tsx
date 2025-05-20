
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
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type { ListedSecurity, Investment, InvestmentType, StockInvestment, GoldInvestment, CurrencyInvestment, RealEstateInvestment, DebtInstrumentInvestment } from "@/lib/types";
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
  purchaseFees: 0,

  quantityInGrams: '', 
  isPhysicalGold: true,

  currencyCode: "",
  baseCurrency: "",
  currentExchangeRate: '', 

  propertyAddress: "",
  propertyType: undefined,

  debtSubType: undefined,
  issuer: "",
  interestRate: '', 
  maturityDate: '', 
  name: "", // Added for general name/description
};


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

  const isDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments";
  const isPreSelectedStockMode = !!preSelectedSecurityId && !isDedicatedDebtMode;

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: { 
      ...initialFormValues,
    },
  });
  
  const selectedTypeFromForm = form.watch("type");
  const effectiveSelectedType = isDedicatedDebtMode ? "Debt Instruments" : (isPreSelectedStockMode ? "Stocks" : selectedTypeFromForm);


  if (Object.keys(form.formState.errors).length > 0) {
    console.log("AddInvestmentForm validation errors:", form.formState.errors);
  }

  useEffect(() => {
    let isMounted = true;
    if (isDedicatedDebtMode) {
      form.setValue("type", "Debt Instruments", { shouldValidate: true });
      form.setValue("selectedStockId", undefined); // Ensure no stock details are shown or carried over
      setPreSelectedSecurityDetails(null);
    } else if (isPreSelectedStockMode) {
      form.setValue("type", "Stocks", { shouldValidate: true });
      form.setValue("selectedStockId", preSelectedSecurityId, { shouldValidate: true });
      getListedSecurityById(preSelectedSecurityId).then(security => {
        if (isMounted && security) {
          setPreSelectedSecurityDetails(security);
        } else if (isMounted) {
          toast({
            title: "Error",
            description: "Pre-selected security not found.",
            variant: "destructive",
          });
          router.replace('/investments/add'); 
        }
      });
    } else if (preSelectedInvestmentTypeQueryParam) {
      form.setValue("type", preSelectedInvestmentTypeQueryParam, { shouldValidate: true });
      if (preSelectedInvestmentTypeQueryParam !== "Stocks") {
        form.setValue("selectedStockId", undefined);
      }
      setPreSelectedSecurityDetails(null);
    } else {
      // General Add mode (no pre-selection)
      setPreSelectedSecurityDetails(null);
      // Clear stockId if type is changed away from Stocks
      if (form.getValues("type") !== "Stocks" && form.getValues("selectedStockId")) {
         form.setValue("selectedStockId", undefined);
      }
    }
    return () => { isMounted = false; };
  }, [isDedicatedDebtMode, preSelectedSecurityId, preSelectedInvestmentTypeQueryParam, getListedSecurityById, form, toast, router]);


  async function onSubmit(values: AddInvestmentFormValues) {
    console.log("AddInvestmentForm onSubmit called with values:", JSON.stringify(values, null, 2));
    setIsLoadingAi(false);
    setAiAnalysisResult(null);

    const investmentId = uuidv4();
    let investmentName = values.name || ""; 

    const finalInvestmentType = isDedicatedDebtMode ? "Debt Instruments" : (isPreSelectedStockMode ? "Stocks" : values.type);

    if (!finalInvestmentType) {
        toast({ title: "Error", description: "Investment type is missing.", variant: "destructive" });
        return;
    }

    let newInvestment: Omit<Investment, 'createdAt'> = {
      id: investmentId,
      type: finalInvestmentType,
      name: "", 
      amountInvested: 0, 
      purchaseDate: values.purchaseDate,
    };

    let analysisResult: CurrencyFluctuationAnalysisOutput | undefined = undefined;

    if (finalInvestmentType === "Stocks") {
      const securityToProcessId = values.selectedStockId || preSelectedSecurityId;
      const selectedSecurity = listedSecurities.find(sec => sec.id === securityToProcessId) || preSelectedSecurityDetails;

      if (!selectedSecurity) {
        toast({ title: "Error", description: "Selected security details not found.", variant: "destructive" });
        console.error("Selected security not found. securityToProcessId:", securityToProcessId, "listedSecurities:", listedSecurities.map(s => ({id: s.id, name: s.name})), "preSelectedSecurityDetails:", preSelectedSecurityDetails);
        return;
      }
      
      const numShares = parseFloat(String(values.numberOfShares) || '0');
      const pricePerShare = parseFloat(String(values.purchasePricePerShare) || '0');
      const fees = parseFloat(String(values.purchaseFees) || '0');
      const calculatedAmountInvested = (numShares * pricePerShare) + fees;

      investmentName = `${selectedSecurity.name} Purchase`;

      newInvestment = {
        ...newInvestment,
        name: investmentName,
        amountInvested: calculatedAmountInvested,
        actualStockName: selectedSecurity.name,
        tickerSymbol: selectedSecurity.symbol,
        stockLogoUrl: selectedSecurity.logoUrl,
        numberOfShares: numShares,
        purchasePricePerShare: pricePerShare,
        purchaseFees: fees,
        type: 'Stocks', 
      } as Omit<StockInvestment, 'createdAt'>;

    } else if (finalInvestmentType === "Debt Instruments") {
        investmentName = `${values.debtSubType} from ${values.issuer}`; 
        newInvestment = {
          ...newInvestment,
          name: investmentName,
          amountInvested: parseFloat(String(values.amountInvested || '0')),
          issuer: values.issuer!,
          interestRate: parseFloat(String(values.interestRate) || '0'),
          maturityDate: values.maturityDate!,
          debtSubType: values.debtSubType,
          type: 'Debt Instruments',
        } as Omit<DebtInstrumentInvestment, 'createdAt'>;
    } else {
      // General investments like Gold, Currencies, Real Estate
      const generalAmountInvested = parseFloat(String(values.amountInvested || '0'));
      if (isNaN(generalAmountInvested) || generalAmountInvested <= 0) {
         toast({ title: "Error", description: "Amount invested must be a positive number for this investment type.", variant: "destructive" });
         return;
      }
      newInvestment.amountInvested = generalAmountInvested;
      
      if (finalInvestmentType === "Gold") {
        investmentName = values.name || `Gold Investment on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestment,
          name: investmentName,
          quantityInGrams: parseFloat(String(values.quantityInGrams) || '0'),
          isPhysicalGold: values.isPhysicalGold,
          type: 'Gold',
        } as Omit<GoldInvestment, 'createdAt'>;
      } else if (finalInvestmentType === "Currencies") {
        investmentName = values.name || `Currency (${values.currencyCode}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestment,
          name: investmentName,
          currencyCode: values.currencyCode!,
          baseCurrency: values.baseCurrency!,
          currentExchangeRate: parseFloat(String(values.currentExchangeRate) || '0'),
          type: 'Currencies',
        } as Omit<CurrencyInvestment, 'createdAt'>;

        if (values.currencyCode && values.baseCurrency && values.currentExchangeRate && newInvestment.amountInvested) {
          setIsLoadingAi(true);
          try {
            const aiInput: CurrencyFluctuationAnalysisInput = {
                transactionCurrency: values.currencyCode!,
                transactionAmount: newInvestment.amountInvested,
                transactionDate: values.purchaseDate,
                baseCurrency: values.baseCurrency!,
                currentExchangeRate: parseFloat(String(values.currentExchangeRate) || '0'),
            };
            analysisResult = await currencyFluctuationAnalysis(aiInput);
            setAiAnalysisResult(analysisResult);
          } catch (error) {
              console.error("AI Currency Analysis Error:", error);
              toast({ title: "AI Analysis Failed", description: "Could not perform currency fluctuation analysis.", variant: "destructive" });
          } finally { 
            setIsLoadingAi(false); 
          }
        }
      } else if (finalInvestmentType === "Real Estate") {
        investmentName = values.name || `Real Estate (${values.propertyAddress || 'N/A'}) on ${values.purchaseDate}`;
        newInvestment = {
          ...newInvestment,
          name: investmentName,
          propertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          type: 'Real Estate',
        } as Omit<RealEstateInvestment, 'createdAt'>;
      } else {
         // Fallback for any other type (should not happen if type enum is strict)
         investmentName = values.name || `${finalInvestmentType} Investment on ${values.purchaseDate}`;
         newInvestment.name = investmentName;
      }
    }
    
    newInvestment.name = investmentName; 

    console.log("Attempting to add investment:", JSON.stringify(newInvestment, null, 2));
    await addInvestment(newInvestment, analysisResult); // analysisResult can be undefined
    toast({
      title: "Investment Added",
      description: `${newInvestment.name} (${finalInvestmentType}) has been successfully added.`,
    });

    const resetValues: AddInvestmentFormValues = { 
        ...initialFormValues,
        type: undefined, // Reset type unless it's a dedicated mode
        selectedStockId: undefined,
        // Ensure all specific fields are reset to their initial string/boolean/undefined states
        name: "",
        amountInvested: '',
        purchaseDate: getCurrentDate(),
        numberOfShares: '',
        purchasePricePerShare: '',
        purchaseFees: 0,
        quantityInGrams: '',
        isPhysicalGold: true,
        currencyCode: "",
        baseCurrency: "",
        currentExchangeRate: '',
        propertyAddress: "",
        propertyType: undefined,
        debtSubType: undefined,
        issuer: "",
        interestRate: '',
        maturityDate: '',
    };

    if (isDedicatedDebtMode) {
        resetValues.type = "Debt Instruments"; // Keep type for dedicated debt mode
    } else if (isPreSelectedStockMode) {
        resetValues.type = "Stocks"; // Keep type for dedicated stock mode
        resetValues.selectedStockId = preSelectedSecurityId || undefined;
    } else if (preSelectedInvestmentTypeQueryParam) {
       resetValues.type = preSelectedInvestmentTypeQueryParam; // Keep type if passed by query param for general types
    }
    
    form.reset(resetValues);
    
    // Only redirect if not in a dedicated mode (to allow multiple additions)
    if (!isDedicatedDebtMode && !isPreSelectedStockMode && !preSelectedInvestmentTypeQueryParam) {
        router.replace('/investments/add'); 
    }
    
    if (!analysisResult) { // If AI analysis wasn't run or wasn't for this submission, clear old results
       setAiAnalysisResult(null);
    }
  }

  const handleNumericInputChange = (field: any, value: string) => {
    if (value === '') {
      field.onChange(undefined);
    } else {
      const parsedValue = parseFloat(value);
      field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
    }
  };
  
  let pageTitle = "Add New Investment";
  let submitButtonText = `Add ${effectiveSelectedType || 'Investment'}`;

  if (isDedicatedDebtMode) {
    pageTitle = "Buy Debt Instrument"; 
    submitButtonText = "Buy Debt Instrument";
  } else if (isPreSelectedStockMode && preSelectedSecurityDetails) {
    pageTitle = `Buy: ${preSelectedSecurityDetails.name}`;
    submitButtonText = `Buy ${preSelectedSecurityDetails.securityType === 'Fund' ? 'Fund' : 'Stock'}`;
  } else if (preSelectedInvestmentTypeQueryParam && preSelectedInvestmentTypeQueryParam !== "Debt Instruments") {
    pageTitle = `Add New ${preSelectedInvestmentTypeQueryParam}`;
    submitButtonText = `Add ${preSelectedInvestmentTypeQueryParam}`;
  }


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
          <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 5.5" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
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
              <Input type="number" step="any" placeholder="e.g., 10000" {...field}
                  value={field.value ?? ''}
                  onChange={e => handleNumericInputChange(field, e.target.value)} />
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
        {!preSelectedSecurityId && !isDedicatedDebtMode && ( // Ensure this dropdown doesn't show in dedicated debt mode
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
                <Input type="number" step="any" placeholder="e.g., 5.00" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} />
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

  const RenderGeneralFields = () => (
    <>
      {(!isDedicatedDebtMode && !isPreSelectedStockMode) && (
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
                        setPreSelectedSecurityDetails(null);
                    }
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

      {effectiveSelectedType && !["Stocks", "Debt Instruments"].includes(effectiveSelectedType) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="amountInvested"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Amount Invested</FormLabel>
                    <FormControl>
                    <Input type="number" step="any" placeholder="e.g., 10000" {...field}
                        value={field.value ?? ''}
                        onChange={e => handleNumericInputChange(field, e.target.value)} />
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
           <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Name / Description (Optional)</FormLabel>
                      <FormControl>
                          <Input placeholder="e.g., My Gold Bar, Downtown Apartment" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />
        </>
      )}

      {effectiveSelectedType === "Gold" && <RenderGoldFields />}
      {effectiveSelectedType === "Currencies" && <RenderCurrencyFields />}
      {effectiveSelectedType === "Real Estate" && <RenderRealEstateFields />}
      {effectiveSelectedType === "Stocks" && !isPreSelectedStockMode && !isDedicatedDebtMode && <RenderStockFields />}
    </>
  );

  const RenderGoldFields = () => (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Gold Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="quantityInGrams" render={({ field }) => (
            <FormItem><FormLabel>Quantity (grams)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="isPhysicalGold" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is this physical gold?</FormLabel><FormDescription>Uncheck for Gold ETFs, Digital Gold etc.</FormDescription></div></FormItem>
          )} />
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
            <FormItem><FormLabel>Current Exchange Rate (to Base)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 0.92" {...field} value={field.value ?? ''} onChange={e => handleNumericInputChange(field, e.target.value)} /></FormControl><FormDescription>Needed for AI fluctuation analysis.</FormDescription><FormMessage /></FormItem>
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
            ) : isPreSelectedStockMode ? (
              <RenderStockFields />
            ) : (
              <RenderGeneralFields />
            )}


            {isLoadingAi && !isDedicatedDebtMode && effectiveSelectedType === "Currencies" && (
              <div className="flex items-center justify-center p-4 my-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Performing currency analysis...
              </div>
            )}

            {aiAnalysisResult && effectiveSelectedType === "Currencies" && !isDedicatedDebtMode && (
              <CurrencyAnalysisDisplay result={aiAnalysisResult} />
            )}
            
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={
                form.formState.isSubmitting ||
                isLoadingAi ||
                (effectiveSelectedType === "Stocks" && !isDedicatedDebtMode && !isPreSelectedStockMode && (isLoadingListedSecurities || !!listedSecuritiesError || !form.getValues("selectedStockId"))) ||
                (isPreSelectedStockMode && (!preSelectedSecurityDetails || isLoadingListedSecurities))
              }
            >
              {form.formState.isSubmitting || isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitButtonText}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
    

    