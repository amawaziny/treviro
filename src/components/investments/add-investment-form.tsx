"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, // Added FormDescription here
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
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type { ListedSecurity, InvestmentType, StockInvestment, GoldInvestment, CurrencyInvestment, RealEstateInvestment, DebtInstrumentInvestment } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useLanguage } from '@/contexts/language-context';
import { RealEstateForm } from './real-estate-form';

const getCurrentDate = () => {
  const date = new Date();
  return format(date, "yyyy-MM-dd");
};

// Initial values for each investment type
const initialFormValuesByType: Record<InvestmentType, AddInvestmentFormValues> = {
  "Stocks": {
    type: "Stocks",
    selectedSecurityId: "",
    numberOfShares: 1, // must be number for Zod transform result
    purchasePricePerShare: 1,
    purchaseFees: 0,
    purchaseDate: getCurrentDate(),
    name: "",
  },
  "Gold": {
    type: "Gold",
    goldType: goldTypes[0],
    quantityInGrams: 1,
    amountInvested: 1,
    purchaseDate: getCurrentDate(),
    name: "",
  },
  "Currencies": {
    type: "Currencies",
    currencyCode: "",
    foreignCurrencyAmount: 1,
    exchangeRateAtPurchase: 1,
    purchaseDate: getCurrentDate(),
    name: "",
  },
  "Real Estate": {
    type: "Real Estate",
    propertyAddress: "",
    propertyType: propertyTypes[0],
    amountInvested: 1,
    installmentFrequency: "Monthly",
    installmentAmount: 0,
    purchaseDate: getCurrentDate(),
    name: "",
  },
  "Debt Instruments": {
    type: "Debt Instruments",
    debtSubType: debtSubTypes[0],
    issuer: "",
    interestRate: 1,
    maturityDate: getCurrentDate(),
    certificateInterestFrequency: "Monthly",
    amountInvested: 1,
    purchaseDate: getCurrentDate(),
    name: "",
  },
};

// Helper to get initial values for a type
function getInitialFormValues(type: InvestmentType): AddInvestmentFormValues {
  return { ...initialFormValuesByType[type] };
}

interface RenderGoldFieldsProps {
  control: any;
  isDedicatedGoldMode?: boolean;
}
const RenderGoldFieldsComponent: React.FC<RenderGoldFieldsProps> = ({
    control,
    isDedicatedGoldMode,
  }) => {
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Gold Investment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDedicatedGoldMode && (
            <FormField control={control} name="name" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder="e.g., Gold Bar Q1 2024 or Wedding Gold" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
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
                <NumericInput
                  placeholder="e.g., 50 or 2"
                  value={field.value !== undefined ? String(field.value) : undefined}
                  onChange={field.onChange}
                  allowDecimal={true}
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
                  value={field.value !== undefined ? String(field.value) : ''}
                  onChange={field.onChange}
                  allowDecimal={true}
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
const MemoizedRenderGoldFieldsSection = React.memo(RenderGoldFieldsComponent);


interface RenderCurrencyFieldsProps {
  control: any;
  isDedicatedCurrencyMode?: boolean;
}
const RenderCurrencyFieldsComponent: React.FC<RenderCurrencyFieldsProps> = ({
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
                value={field.value !== undefined ? String(field.value) : undefined}
                onChange={field.onChange}
                allowDecimal={true}
              />
              </FormControl><FormDescription>Amount of the foreign currency you bought.</FormDescription><FormMessage /></FormItem>
          )} />
        <FormField control={control} name="exchangeRateAtPurchase" render={({ field }) => (
            <FormItem><FormLabel>Exchange Rate at Purchase (to EGP)</FormLabel><FormControl>
              <NumericInput
                placeholder="e.g., 30.85 (for USD to EGP)"
                value={field.value !== undefined ? String(field.value) : undefined}
                onChange={field.onChange}
                allowDecimal={true}
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
const MemoizedRenderCurrencyFields = React.memo(RenderCurrencyFieldsComponent);

interface RenderStockFieldsProps {
  control: any;
  preSelectedSecurityDetails: ListedSecurity | null;
  listedSecurities: ListedSecurity[];
  isLoadingListedSecurities: boolean;
  listedSecuritiesError: Error | null;
  onSecuritySelect: (value: string) => void;
  isPreSelectedStockMode: boolean;
}

const RenderStockFieldsComponent: React.FC<RenderStockFieldsProps> = ({
  control,
  preSelectedSecurityDetails,
  listedSecurities,
  isLoadingListedSecurities,
  listedSecuritiesError,
  onSecuritySelect,
  isPreSelectedStockMode
}) => {
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {preSelectedSecurityDetails?.securityType === 'Fund' ? 'Fund Purchase Details' : 'Stock Purchase Details'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {!isPreSelectedStockMode && (
          <FormField
            control={control}
            name="selectedsecurityId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Select Security (Stock or Fund)</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSecuritySelect(value);
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
            <p className="text-xs text-muted-foreground">Current Market Price: {preSelectedSecurityDetails.price.toLocaleString(undefined, { style: 'currency', currency: preSelectedSecurityDetails.currency || 'USD', minimumFractionDigits:3, maximumFractionDigits:3 })}</p>
            {preSelectedSecurityDetails.securityType === 'Fund' && preSelectedSecurityDetails.fundType && <p className="text-xs text-muted-foreground">Type: {preSelectedSecurityDetails.fundType}</p>}
          </div>
        )}
        <FormField
          control={control}
          name="numberOfShares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Securities</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 100"
                  value={field.value !== undefined ? String(field.value) : undefined}
                  onChange={field.onChange}
                  allowDecimal={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="purchasePricePerShare"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Price (per security)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 150.50"
                  value={field.value !== undefined ? String(field.value) : undefined}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="purchaseFees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Fees (optional)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 5.00"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>Brokerage or transaction fees for this purchase.</FormDescription>
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
              <FormControl><Input type="date" {...field} value={field.value || getCurrentDate()} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
const MemoizedRenderStockFields = React.memo(RenderStockFieldsComponent);

interface RenderDebtFieldsProps {
  control: any;
  setValue: any;
  watch: any;
}
const RenderDebtFieldsComponent: React.FC<RenderDebtFieldsProps> = () => {
  const { control, setValue, watch } = useFormContext();
  const watchedDebtSubType = watch("debtSubType");
  console.log("RenderDebtFieldsComponent rendered, watchedDebtSubType:", watchedDebtSubType);

  useEffect(() => {
    console.log("useEffect running, watchedDebtSubType:", watchedDebtSubType);
    if (watchedDebtSubType === 'Certificate') {
      setValue('purchaseDate', ''); 
    } else if (watchedDebtSubType && !watch("purchaseDate")) {
      setValue('purchaseDate', getCurrentDate());
    }
  }, [watchedDebtSubType, setValue, watch]);

  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">Debt Instrument Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={control} name="debtSubType" render={({ field }) => (
            <FormItem><FormLabel>Specific Debt Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} required><FormControl><SelectTrigger><SelectValue placeholder="Select the type of debt" /></SelectTrigger></FormControl><SelectContent>{debtSubTypes.map(dType => (<SelectItem key={dType} value={dType}>{dType}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="issuer" render={({ field }) => (
          <FormItem><FormLabel>Issuer / Institution</FormLabel><FormControl><Input placeholder="e.g., US Treasury, XYZ Corp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="interestRate" render={({ field }) => (
          <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl>
            <NumericInput
              placeholder="e.g., 5.5"
              value={field.value}
              onChange={field.onChange}
              allowDecimal={true}
            />
            </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="maturityDate" render={({ field }) => (
          <FormItem><FormLabel>Maturity Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="amountInvested" render={({ field }) => (
 <FormItem><FormLabel>Total Amount Invested (Cost)</FormLabel><FormControl>
            <NumericInput
              placeholder="e.g., 10000.75"
              value={field.value}
 onChange={field.onChange}
 allowDecimal={true}
            />
            </FormControl><FormDescription>Total cost including any fees.</FormDescription><FormMessage /></FormItem>
          )}
        />
        {/* Certificate Interest Frequency Dropdown */}
        {watchedDebtSubType === 'Certificate' && (
          <FormField
            control={control}
            name="certificateInterestFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate Interest Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'Monthly'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>How often interest is paid. Default is Monthly.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {/* Only show purchase date for non-certificate debt types */}
        {watchedDebtSubType !== 'Certificate' && (
            <FormField control={control} name="purchaseDate" render={({ field }) => (
                <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()} /></FormControl><FormMessage /></FormItem>
            )} />
        )}
      </div>
    </div>
  );
};
const MemoizedRenderDebtFields = React.memo(RenderDebtFieldsComponent);

interface RenderRealEstateFieldsProps {
  control: any;
}

const RenderRealEstateFieldsComponent: React.FC<RenderRealEstateFieldsProps> = ({ control }) => {
  return <RealEstateForm control={control} />;
};

export default RenderRealEstateFieldsComponent;
const MemoizedRenderRealEstateFields = React.memo(RenderRealEstateFieldsComponent);


// Recursively remove all undefined fields from an object (deep)
function removeUndefinedFieldsDeep(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFieldsDeep);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefinedFieldsDeep(v)])
    );
  }
  return obj;
}

// Remove undefined fields before saving to Firestore
function removeUndefinedFields(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

export function AddInvestmentForm({ mode = "add", initialValues }: { mode?: "add" | "edit"; initialValues?: Partial<AddInvestmentFormValues> }) {
  // ...existing code

  const { addInvestment, investments, updateRealEstateInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const preSelectedSecurityId = searchParams.get('securityId');
  const preSelectedInvestmentTypeQueryParam = searchParams.get('type') as InvestmentType | null;


  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<CurrencyFluctuationAnalysisOutput | null>(null);
  const { listedSecurities, isLoading: isLoadingListedSecurities, error: listedSecuritiesError, getListedSecurityById } = useListedSecurities();
  const [preSelectedSecurityDetails, setPreSelectedSecurityDetails] = useState<ListedSecurity | null>(null);

  // Use a state to track the current type for initial values
  const [currentType, setCurrentType] = useState<InvestmentType>(initialValues?.type as InvestmentType || "Stocks");

  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(AddInvestmentSchema),
    defaultValues: mode === "edit" && initialValues ? { ...getInitialFormValues(initialValues.type as InvestmentType), ...initialValues } : getInitialFormValues(currentType),
  });

  const selectedTypeFromFormWatch = form.watch("type");

  const isDedicatedGoldMode = preSelectedInvestmentTypeQueryParam === "Gold" && !preSelectedSecurityId;
  const isDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments" && !preSelectedSecurityId;
  const isDedicatedCurrencyMode = preSelectedInvestmentTypeQueryParam === "Currencies" && !preSelectedSecurityId;
  const isDedicatedRealEstateMode = preSelectedInvestmentTypeQueryParam === "Real Estate" && !preSelectedSecurityId;
  const isPreSelectedStockMode = !!preSelectedSecurityId;


  const effectiveSelectedType = 
      isDedicatedGoldMode ? "Gold" :
      isDedicatedDebtMode ? "Debt Instruments" :
      isDedicatedCurrencyMode ? "Currencies" :
      isDedicatedRealEstateMode ? "Real Estate" :
      isPreSelectedStockMode ? "Stocks" :
      selectedTypeFromFormWatch;
  

  useEffect(() => {
    let isMounted = true;
    if (mode === "edit" && initialValues) {
      // Only reset for the correct type
      const type = initialValues.type as InvestmentType;
      if (type) {
        // Patch: convert to string for real estate only if property exists
        const patchedInitialValues: any = { ...initialValues };
        if (type === "Real Estate") {
          if (Object.prototype.hasOwnProperty.call(patchedInitialValues, 'amountInvested') && typeof patchedInitialValues.amountInvested === "number") {
            patchedInitialValues.amountInvested = String(patchedInitialValues.amountInvested);
          }
          if (Object.prototype.hasOwnProperty.call(patchedInitialValues, 'installmentAmount') && typeof patchedInitialValues.installmentAmount === "number") {
            patchedInitialValues.installmentAmount = String(patchedInitialValues.installmentAmount);
          }
        }
        form.reset({ ...getInitialFormValues(type), ...patchedInitialValues } as any);
        setCurrentType(type);
      }
      return () => { isMounted = false; };
    }
    const currentFormValues = form.getValues();
    const baseResetValues: AddInvestmentFormValues = {
        ...initialFormValuesByType[currentType], 
        purchaseDate: currentFormValues.purchaseDate || getCurrentDate(), 
        name: "", 
    };

    // Fix: resetFormWithType and form.reset must use correct type for discriminated union
    const resetFormWithType = (type: InvestmentType) => {
      setCurrentType(type);
      form.reset({ ...initialFormValuesByType[type], type } as AddInvestmentFormValues);
      setPreSelectedSecurityDetails(null);
    };

    console.log("AddInvestmentForm: Reading URL Params");
    console.log("AddInvestmentForm - preSelectedSecurityId from URL:", preSelectedSecurityId);
    console.log("AddInvestmentForm - preSelectedInvestmentTypeQueryParam from URL:", preSelectedInvestmentTypeQueryParam);

    const calculatedIsDedicatedDebtMode = preSelectedInvestmentTypeQueryParam === "Debt Instruments" && !preSelectedSecurityId;
    const calculatedIsDedicatedGoldMode = preSelectedInvestmentTypeQueryParam === "Gold" && !preSelectedSecurityId;
    const calculatedIsDedicatedCurrencyMode = preSelectedInvestmentTypeQueryParam === "Currencies" && !preSelectedSecurityId;
    const calculatedIsDedicatedRealEstateMode = preSelectedInvestmentTypeQueryParam === "Real Estate" && !preSelectedSecurityId;
    const calculatedIsPreSelectedStockMode = !!preSelectedSecurityId;

    console.log("AddInvestmentForm - Calculated Modes:");
    console.log("AddInvestmentForm - isDedicatedDebtMode:", calculatedIsDedicatedDebtMode);
    console.log("AddInvestmentForm - isDedicatedGoldMode:", calculatedIsDedicatedGoldMode);
    console.log("AddInvestmentForm - isDedicatedCurrencyMode:", calculatedIsDedicatedCurrencyMode);
    console.log("AddInvestmentForm - isDedicatedRealEstateMode:", calculatedIsDedicatedRealEstateMode);
    console.log("AddInvestmentForm - isPreSelectedStockMode:", calculatedIsPreSelectedStockMode);


    if (calculatedIsDedicatedGoldMode) {
      console.log("AddInvestmentForm - useEffect - Applying Dedicated Gold Mode settings to form.");
      resetFormWithType("Gold");
    } else if (calculatedIsDedicatedDebtMode) {
      console.log("AddInvestmentForm - useEffect - Applying Dedicated Debt Mode settings to form.");
      resetFormWithType("Debt Instruments");
    } else if (calculatedIsDedicatedCurrencyMode) {
      console.log("AddInvestmentForm - useEffect - Applying Dedicated Currency Mode settings to form.");
      resetFormWithType("Currencies");
    } else if (calculatedIsDedicatedRealEstateMode) {
      console.log("AddInvestmentForm - useEffect - Applying Dedicated Real Estate Mode settings to form.");
      resetFormWithType("Real Estate");
    } else if (calculatedIsPreSelectedStockMode && preSelectedSecurityId) {
      console.log("AddInvestmentForm - useEffect - Applying Pre-selected Stock Mode settings to form.");
      resetFormWithType("Stocks");
      form.setValue("selectedSecurityId", preSelectedSecurityId);
      getListedSecurityById(preSelectedSecurityId).then(security => {
        if (isMounted && security) {
          setPreSelectedSecurityDetails(security);
          form.setValue("purchasePricePerShare", security.price);
        } else if (isMounted) {
          toast({ title: "Error", description: "Pre-selected security not found.", variant: "destructive" });
          router.replace('/investments/add');
        }
      });
    } else if (preSelectedInvestmentTypeQueryParam) {
        console.log("AddInvestmentForm - useEffect - Applying general pre-selected type from URL.");
        resetFormWithType(preSelectedInvestmentTypeQueryParam as InvestmentType);
    } else {
        console.log("AddInvestmentForm - useEffect - Applying general mode settings (no specific pre-selection).");
        resetFormWithType("Stocks"); // fallback to Stocks
    }
    return () => { isMounted = false; };
  }, [
      mode, initialValues, preSelectedSecurityId, preSelectedInvestmentTypeQueryParam, 
      form, getListedSecurityById, toast, router, selectedTypeFromFormWatch
  ]);


  async function onSubmit(values: AddInvestmentFormValues) {
    console.log("[DEBUG] onSubmit called");
    console.log("[DEBUG] Submitted values:", values);
    console.log("[DEBUG] form.getValues():", form.getValues());
    console.log("[DEBUG] form.formState.errors:", form.formState.errors);
    if (form.formState.errors && Object.keys(form.formState.errors).length > 0) {
      console.log("[DEBUG] Entered error block in onSubmit");
      // Print detailed errors for debugging
      console.error('Zod Validation Errors:', JSON.stringify(form.formState.errors, null, 2));
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

    let newInvestment: DebtInstrumentInvestment | StockInvestment | GoldInvestment | CurrencyInvestment | RealEstateInvestment;
    let analysisResultFromAi: CurrencyFluctuationAnalysisOutput | undefined = undefined;

    // Remove all parsed* variables, use type narrowing instead
    if (finalInvestmentType === "Stocks" && values.type === "Stocks") {
      const securityToProcessId = values.selectedSecurityId || preSelectedSecurityId;
      console.log("AddInvestmentForm - onSubmit - Stocks - securityToProcessId:", securityToProcessId);
      console.log("AddInvestmentForm - onSubmit - Stocks - listedSecurities (sample):", listedSecurities.slice(0,3).map(s => ({id: s.id, name: s.name})));
      const selectedSecurity = listedSecurities.find(sec => sec.id === securityToProcessId) || preSelectedSecurityDetails;
      console.log("AddInvestmentForm - onSubmit - Stocks - selectedSecurity:", selectedSecurity);


      if (!selectedSecurity) {
        toast({ title: "Error", description: "Selected security details not found.", variant: "destructive" });
        return;
      }
      const calculatedAmountInvested = (values.numberOfShares * values.purchasePricePerShare) + values.purchaseFees;
      investmentName = `${selectedSecurity.name} Purchase`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: calculatedAmountInvested,
        tickerSymbol: selectedSecurity.symbol as string,
        stockLogoUrl: selectedSecurity.logoUrl,
        numberOfShares: values.numberOfShares,
        purchasePricePerShare: values.purchasePricePerShare,
        purchaseFees: values.purchaseFees,
        type: 'Stocks',
      };
    } else if (finalInvestmentType === "Debt Instruments" && values.type === "Debt Instruments") {
        investmentName = `${values.debtSubType} - ${values.issuer}`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: values.amountInvested,
          issuer: values.issuer || "",
          interestRate: values.interestRate,
          maturityDate: values.maturityDate!,
          debtSubType: values.debtSubType!,
          type: 'Debt Instruments',
          purchaseDate: values.debtSubType === 'Certificate' ? undefined : values.purchaseDate,
          certificateInterestFrequency: values.certificateInterestFrequency || 'Monthly',
        };
    } else if (finalInvestmentType === "Gold" && values.type === "Gold") {
        investmentName = values.name || `Gold (${values.goldType || 'N/A'})`;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: values.amountInvested,
          goldType: values.goldType!,
          quantityInGrams: values.quantityInGrams,
          type: 'Gold',
        };
    } else if (finalInvestmentType === "Currencies" && values.type === "Currencies") {
        investmentName = values.name || `Currency (${values.currencyCode || 'N/A'})`;
        const calculatedCost = values.foreignCurrencyAmount * values.exchangeRateAtPurchase;
        newInvestment = {
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: calculatedCost,
          currencyCode: values.currencyCode!,
          foreignCurrencyAmount: values.foreignCurrencyAmount,
          exchangeRateAtPurchase: values.exchangeRateAtPurchase,
          type: 'Currencies',
        };
        if (values.currencyCode && values.exchangeRateAtPurchase && values.foreignCurrencyAmount && values.purchaseDate) {
          setIsLoadingAi(true);
          try {
            const aiInput: CurrencyFluctuationAnalysisInput = {
                transactionCurrency: values.currencyCode!,
                transactionAmount: values.foreignCurrencyAmount,
                transactionDate: values.purchaseDate,
                baseCurrency: "EGP",
                currentExchangeRate: values.exchangeRateAtPurchase,
            };
            analysisResultFromAi = await currencyFluctuationAnalysis(aiInput);
            setAiAnalysisResult(analysisResultFromAi);
          } catch (error) {
              toast({ title: "AI Analysis Failed", description: "Could not perform currency fluctuation analysis.", variant: "destructive" });
          } finally {
            setIsLoadingAi(false);
          }
        }
    } else if (finalInvestmentType === "Real Estate" && values.type === "Real Estate") {
        investmentName = values.name || `Real Estate (${values.propertyAddress || 'N/A'})`;
        newInvestment = removeUndefinedFieldsDeep({
          ...newInvestmentBase,
          name: investmentName,
          amountInvested: values.amountInvested,
          propertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          installmentFrequency: values.installmentFrequency,
          installmentAmount: values.installmentAmount,
          totalInstallmentPrice: values.totalInstallmentPrice,
          installmentStartDate: values.installmentStartDate,
          installmentEndDate: values.installmentEndDate,
          downPayment: values.downPayment,
          maintenanceAmount: values.maintenanceAmount,
          maintenancePaymentDate: values.maintenancePaymentDate,
          type: 'Real Estate',
        });
    } else {
         investmentName = values.name || `${finalInvestmentType} Investment`;
         newInvestment = { ...newInvestmentBase, name: investmentName, amountInvested: values.amountInvested, type: finalInvestmentType as any };
    }

    console.log("AddInvestmentForm - onSubmit - newInvestment object:", newInvestment);
    if (mode === "edit" && initialValues && 'id' in initialValues && initialValues['id']) {
      // Only update for Real Estate investments
      if (values.type === "Real Estate") {
        await updateRealEstateInvestment(initialValues['id'] as string, removeUndefinedFieldsDeep(values));
        toast({
          title: "Investment Updated",
          description: `${values.name || values.propertyAddress || "Real Estate"} has been updated successfully.`,
        });
        router.push("/investments/real-estate");
        return;
      }
      // Add more types here if you want to support editing other investment types
    } else {
      await addInvestment(newInvestment, analysisResultFromAi);
      toast({
        title: "Investment Added",
        description: `${newInvestment.name} (${finalInvestmentType}) has been successfully added.`,
      });
    }

    // Fix: always use a valid InvestmentType for reset, never undefined
    const resetTargetType = 
        isDedicatedDebtMode ? "Debt Instruments" :
        isDedicatedGoldMode ? "Gold" :
        isDedicatedCurrencyMode ? "Currencies" :
        isDedicatedRealEstateMode ? "Real Estate" :
        isPreSelectedStockMode ? "Stocks" :
        "Stocks"; // fallback to Stocks if undefined

    // Fix: Only use a single type for reset values, never a union or undefined
    const resetValues: AddInvestmentFormValues = initialFormValuesByType[resetTargetType as InvestmentType];
    form.reset(resetValues);

    if (isPreSelectedStockMode && preSelectedSecurityDetails && preSelectedSecurityId) {
        form.setValue("purchasePricePerShare", preSelectedSecurityDetails.price);
    } else if (!resetTargetType && !preSelectedInvestmentTypeQueryParam) {
        router.replace('/investments/add');
    }
    
    if (finalInvestmentType !== "Currencies") {
       setAiAnalysisResult(null);
    }
  }

  let pageTitle = "Add New Investment";
  let submitButtonText = `Add Investment`;

  // Custom: Edit Real Estate mode title and button
  if (mode === "edit" && effectiveSelectedType === "Real Estate" && initialValues?.name) {
    pageTitle = `Edit Real Estate: ${initialValues.name}`;
    submitButtonText = "Save Changes";
  } else if (mode === "edit" && effectiveSelectedType === "Real Estate") {
    pageTitle = `Edit Real Estate`;
    submitButtonText = "Save Changes";
  } else if (isDedicatedGoldMode) {
    pageTitle = "Add Gold Investment";
    submitButtonText = "Add Gold";
  } else if (isDedicatedDebtMode) {
    pageTitle = "Buy Debt Instrument";
    submitButtonText = "Buy Debt Instrument";
  } else if (isDedicatedCurrencyMode) {
    pageTitle = "Add Currency Holding";
    submitButtonText = "Add Currency";
  } else if (isDedicatedRealEstateMode) {
    pageTitle = "Add Real Estate";
    submitButtonText = "Add Real Estate";
  } else if (isPreSelectedStockMode && preSelectedSecurityDetails) {
    pageTitle = `Buy: ${preSelectedSecurityDetails.name} (${preSelectedSecurityDetails.securityType === 'Fund' ? preSelectedSecurityDetails.fundType || 'Fund' : preSelectedSecurityDetails.symbol})`;
    submitButtonText = `Buy ${preSelectedSecurityDetails.securityType === 'Fund' ? 'Units' : 'Securities'}`;
  } else if (preSelectedInvestmentTypeQueryParam && !isDedicatedGoldMode && !isDedicatedDebtMode && !isDedicatedCurrencyMode && !isDedicatedRealEstateMode && !isPreSelectedStockMode) {
    pageTitle = `Add New ${preSelectedInvestmentTypeQueryParam}`;
    submitButtonText = `Add ${preSelectedInvestmentTypeQueryParam}`;
  } else if (effectiveSelectedType && !isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isDedicatedRealEstateMode && !isPreSelectedStockMode) {
     submitButtonText = `Add ${effectiveSelectedType}`;
  }

  const handleSecuritySelect = useCallback((selectedValue: string) => {
    const security = listedSecurities.find(s => s.id === selectedValue);
    setPreSelectedSecurityDetails(security || null);
    if (security) {
        form.setValue("purchasePricePerShare", security.price);
    }
  }, [listedSecurities, form, setPreSelectedSecurityDetails]);

  const hideInvestmentTypeDropdown = (mode === "edit" && effectiveSelectedType === "Real Estate");
  const hideGeneralFields = (mode === "edit" && effectiveSelectedType === "Real Estate");

  const RenderGeneralFields = React.memo(() => (
    <>
      {(!isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isDedicatedRealEstateMode && !isPreSelectedStockMode && !(mode === "edit" && effectiveSelectedType === "Real Estate")) && (
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
                      ...initialFormValuesByType[value as InvestmentType],
                      type: value as InvestmentType,
                      purchaseDate: currentValues.purchaseDate || getCurrentDate(), 
                    } as AddInvestmentFormValues);
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

      {(!isDedicatedDebtMode && !isDedicatedGoldMode && !isDedicatedCurrencyMode && !isDedicatedRealEstateMode && effectiveSelectedType && effectiveSelectedType !== 'Stocks' && effectiveSelectedType !== 'Debt Instruments' && !(mode === "edit" && effectiveSelectedType === "Real Estate")) && (
        <div className="space-y-6 md:col-span-2 mt-6 p-6 border rounded-md">
            <h3 className="text-lg font-medium text-primary">{effectiveSelectedType} Details</h3>
           <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name / Description (Optional)</FormLabel><FormControl><Input placeholder="e.g., Savings Goal, Vacation Fund" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
          <FormField control={form.control} name="amountInvested" render={({ field }) => (
            <FormItem><FormLabel>Total Amount Invested (Cost)</FormLabel><FormControl>
                <NumericInput
                    placeholder="e.g., 1000.00"
                    value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                    onChange={val => field.onChange(val === undefined || val === null ? '' : String(val))}
                    allowDecimal={true}
                />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || getCurrentDate()} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
      )}
    </>
  ));
  RenderGeneralFields.displayName = 'RenderGeneralFields';

  const BackArrowIcon = language === 'ar' ? ArrowRight : ArrowLeft;
  
  // Log values right before rendering the main form structure
  console.log("AddInvestmentForm - Rendering - isDedicatedDebtMode:", isDedicatedDebtMode);
  console.log("AddInvestmentForm - Rendering - isDedicatedGoldMode:", isDedicatedGoldMode);
  console.log("AddInvestmentForm - Rendering - isDedicatedCurrencyMode:", isDedicatedCurrencyMode);
  console.log("AddInvestmentForm - Rendering - isDedicatedRealEstateMode:", isDedicatedRealEstateMode);
  console.log("AddInvestmentForm - Rendering - isPreSelectedStockMode:", isPreSelectedStockMode);
  console.log("AddInvestmentForm - Rendering - effectiveSelectedType:", effectiveSelectedType);


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {(isPreSelectedStockMode && isLoadingListedSecurities && !preSelectedSecurityDetails) ? <Loader2 className="inline-block mr-2 h-5 w-5 animate-spin" /> : null}
          {pageTitle}
        </h2>
        {mode === "edit" && effectiveSelectedType === "Real Estate" && (
          <div className="mt-2">
            <Link href="/investments/real-estate" passHref>
              <Button variant="outline" size="sm" className="text-sm">
                <BackArrowIcon className={language === 'ar' ? "ml-1 h-3.5 w-3.5" : "mr-1 h-3.5 w-3.5"} />
                Back to Real Estate
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className="space-y-4">


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            { isDedicatedDebtMode || effectiveSelectedType === "Debt Instruments" ? (
              <MemoizedRenderDebtFields control={form.control} setValue={form.setValue} watch={form.watch} />
            ) : isDedicatedGoldMode ? <MemoizedRenderGoldFieldsSection control={form.control} isDedicatedGoldMode={true}/> :
              isDedicatedCurrencyMode ? <MemoizedRenderCurrencyFields control={form.control} isDedicatedCurrencyMode={true} /> :
              isDedicatedRealEstateMode ? <MemoizedRenderRealEstateFields control={form.control} /> :
              isPreSelectedStockMode && preSelectedSecurityDetails ? (
                <MemoizedRenderStockFields
                  control={form.control}
                  preSelectedSecurityDetails={preSelectedSecurityDetails}
                  listedSecurities={listedSecurities}
                  isLoadingListedSecurities={isLoadingListedSecurities}
                  listedSecuritiesError={listedSecuritiesError}
                  onSecuritySelect={handleSecuritySelect}
                  isPreSelectedStockMode={true}
                />
              ) : ( 
                <>
                  <RenderGeneralFields />
                  {effectiveSelectedType === "Stocks" && (
                    <MemoizedRenderStockFields
                      control={form.control}
                      preSelectedSecurityDetails={preSelectedSecurityDetails} 
                      listedSecurities={listedSecurities}
                      isLoadingListedSecurities={isLoadingListedSecurities}
                      listedSecuritiesError={listedSecuritiesError}
                      onSecuritySelect={handleSecuritySelect}
                      isPreSelectedStockMode={false} 
                    />
                  )}
                  {effectiveSelectedType === "Gold" && <MemoizedRenderGoldFieldsSection control={form.control} isDedicatedGoldMode={false} />}
                  {effectiveSelectedType === "Currencies" && <MemoizedRenderCurrencyFields control={form.control} isDedicatedCurrencyMode={false}/>}
                  {effectiveSelectedType === "Real Estate" && <MemoizedRenderRealEstateFields control={form.control} />}
                  {/* Debt Instruments specific fields are only shown in dedicated mode now */}
                </>
              )
            }

            {isLoadingAi && (
              <div className="flex items-center justify-center p-4 my-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Performing currency analysis...
              </div>
            )}

            {aiAnalysisResult && ( 
              <CurrencyAnalysisDisplay result={aiAnalysisResult} />
            )}
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={
                form.formState.isSubmitting || isLoadingAi ||
                (effectiveSelectedType === "Stocks" && !isPreSelectedStockMode && (isLoadingListedSecurities || !!listedSecuritiesError || !form.getValues("selectedSecurityId"))) ||
                (isPreSelectedStockMode && (!preSelectedSecurityDetails || isLoadingListedSecurities))
              }
            >
              {(form.formState.isSubmitting || isLoadingAi) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitButtonText}
            </Button>
            {effectiveSelectedType === "Real Estate" && Object.keys(form.formState.errors).length > 0 && (
              <div className="mt-2 text-red-500 text-sm">
                Please fix the errors above and try again.
              </div>
            )}
          </form>
        </Form>
      {/* End of main form rendering */}
      {/* Debug: show current form values and errors */}
      {/* Debug output removed for Real Estate edit mode as requested */}
      </div>
    </div>
  );
}
