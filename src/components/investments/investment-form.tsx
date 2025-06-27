"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm as useReactHookForm,
  useFormContext as useReactHookFormContext,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import {
  InvestmentSchema,
  type InvestmentFormValues,
  investmentTypes,
  goldTypes,
  debtSubTypes,
  propertyTypes,
} from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type {
  ListedSecurity,
  InvestmentType,
  StockInvestment,
  GoldInvestment,
  CurrencyInvestment,
  RealEstateInvestment,
  DebtInstrumentInvestment,
} from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { RealEstateForm } from "./real-estate/real-estate-form";
import { formatCurrencyWithCommas, getCurrentDate } from "@/lib/utils";

// Initial values for each investment type
const initialFormValuesByType: Record<InvestmentType, InvestmentFormValues> = {
  Stocks: {
    type: "Stocks",
    selectedSecurityId: "",
    numberOfShares: 1, // must be number for Zod transform result
    purchasePricePerShare: 0,
    purchaseFees: 0,
    purchaseDate: getCurrentDate(),
    name: "",
  },
  Gold: {
    type: "Gold",
    goldType: goldTypes[0],
    quantityInGrams: 1,
    amountInvested: 0,
    purchaseDate: getCurrentDate(),
    name: "",
  },
  Currencies: {
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
    amountInvested: 0,
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
    amountInvested: 0,
    purchaseDate: getCurrentDate(),
    name: "",
  },
};

// Helper to get initial values for a type
function getInitialFormValues(type: InvestmentType): InvestmentFormValues {
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
  const { t, dir } = useLanguage();
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {t("gold_investment_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDedicatedGoldMode && (
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("name_description_optional")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("e.g., Gold Bar Q1 2024 or Wedding Gold")}
                    {...field}
                    value={field.value || ""}
                  />
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
              <FormLabel>{t("gold_type")}</FormLabel>
              <Select
                dir={dir}
                onValueChange={field.onChange}
                value={field.value || ""}
                required
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select gold type")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {goldTypes.map((gType) => (
                    <SelectItem key={gType} value={gType}>
                      {gType === "K24" && t("24_karat")}
                      {gType === "K21" && t("21_karat")}
                      {gType === "Pound" && t("gold_pound")}
                      {gType === "Ounce" && t("ounce")}
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
              <FormLabel>{t("quantity_units")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 50 or 2"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("grams_for_k21k24_units_for_poundounce")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="amountInvested"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("total_amount_invested_cost")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 10000.50"
                  value={field.value !== undefined ? String(field.value) : ""}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("total_cost_including_any_fees")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("purchase_date")}</FormLabel>
              <FormControl>
                <Input
                  dir={dir}
                  type="date"
                  {...field}
                  value={field.value || getCurrentDate()}
                />
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
  const { t, dir } = useLanguage();
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {t("currency_holding_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDedicatedCurrencyMode && (
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("name_description_optional")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("e.g., USD Savings or Trip to Europe Fund")}
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={control}
          name="currencyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("transaction_currency_code")}</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., USD, EUR"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="foreignCurrencyAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("foreign_currency_amount")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 1000.50"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("amount_of_the_foreign_currency_you_bought")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="exchangeRateAtPurchase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("exchange_rate_at_purchase_to_egp")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 30.85 (for USD to EGP)"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
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
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("purchase_date")}</FormLabel>
              <FormControl>
                <Input
                  dir={dir}
                  type="date"
                  {...field}
                  value={field.value || getCurrentDate()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
  isPreSelectedStockMode,
}) => {
  const { t, dir } = useLanguage();
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {preSelectedSecurityDetails?.securityType === "Fund"
          ? t("fund_purchase_details")
          : t("stock_purchase_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {!isPreSelectedStockMode && (
          <FormField
            control={control}
            name="selectedsecurityId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("select_security_stock_or_fund")}</FormLabel>
                <Select
                  dir={dir}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSecuritySelect(value);
                  }}
                  value={field.value || ""}
                  disabled={
                    isLoadingListedSecurities ||
                    !!listedSecuritiesError ||
                    listedSecurities.length === 0
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingListedSecurities
                            ? t("loading_securities")
                            : listedSecuritiesError
                              ? t("error_loading_securities")
                              : listedSecurities.length === 0
                                ? t("no_securities_available")
                                : t("select_a_security_from_the_list")
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {listedSecurities.map((security) => (
                      <SelectItem key={security.id} value={security.id}>
                        {security.name} ({security.symbol}) -{" "}
                        {security.securityType === "Fund"
                          ? security.fundType
                          : security.market}
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
            <p className="text-sm font-medium">
              {`${t("selected_security")}: ${preSelectedSecurityDetails.name} (${preSelectedSecurityDetails.symbol})`}
            </p>
            <p className="text-xs text-muted-foreground">
              {`${t("current_market_price")}: ${formatCurrencyWithCommas(preSelectedSecurityDetails.price)}`}
            </p>
            {preSelectedSecurityDetails.securityType === "Fund" &&
              preSelectedSecurityDetails.fundType && (
                <p className="text-xs text-muted-foreground">
                  {`${t("type")}: ${preSelectedSecurityDetails.fundType}`}
                </p>
              )}
          </div>
        )}
        <FormField
          control={control}
          name="numberOfShares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("number_of_securities")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 100"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
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
              <FormLabel>{t("purchase_price_per_security")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 150.50"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
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
              <FormLabel>{t("purchase_fees_optional")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 5.00"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("brokerage_or_transaction_fees_for_this_purchase")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("purchase_date")}</FormLabel>
              <FormControl>
                <Input
                  dir={dir}
                  type="date"
                  {...field}
                  value={field.value || getCurrentDate()}
                />
              </FormControl>
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
  const { t, dir } = useLanguage();
  const { control, setValue, watch } =
    useReactHookFormContext<InvestmentFormValues>();
  const watchedDebtSubType = watch("debtSubType");

  useEffect(() => {
    if (watchedDebtSubType === "Certificate") {
      setValue("purchaseDate", "");
    } else if (watchedDebtSubType && !watch("purchaseDate")) {
      setValue("purchaseDate", getCurrentDate());
    }
  }, [watchedDebtSubType, setValue, watch]);

  return (
    <div className="space-y-6 mt-0 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {t("debt_instrument_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="debtSubType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("specific_debt_type")}</FormLabel>
              <Select
                dir={dir}
                onValueChange={field.onChange}
                value={field.value || ""}
                required
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select the type of debt")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {debtSubTypes.map((dType) => (
                    <SelectItem key={dType} value={dType}>
                      {t(dType)}
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
          name="issuer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("issuer_institution")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("e.g., US Treasury, XYZ Corp")}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="interestRate"
          render={({ field }) => {
            // Convert value to string for the NumericInput component
            const value = field.value !== undefined ? String(field.value) : "";
            return (
              <FormItem>
                <FormLabel>{t("interest_rate")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 5.5"
                    value={value}
                    onChange={(val) => {
                      // Convert back to number when updating the form
                      field.onChange(val === "" ? undefined : Number(val));
                    }}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={control}
          name="maturityDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("maturity_date")}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  dir={dir}
                  {...field}
                  value={field.value || ""}
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
              <FormLabel>{t("total_amount_invested_cost")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 10000.75"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("total_cost_including_any_fees")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Certificate Interest Frequency Dropdown */}
        {watchedDebtSubType === "Certificate" && (
          <FormField
            control={control}
            name="certificateInterestFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("certificate_interest_frequency")}</FormLabel>
                <Select
                  dir={dir}
                  onValueChange={field.onChange}
                  value={field.value || "Monthly"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select frequency")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monthly">{t("Monthly")}</SelectItem>
                    <SelectItem value="Quarterly">{t("Quarterly")}</SelectItem>
                    <SelectItem value="Yearly">{t("Yearly")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("how_often_interest_is_paid_default_is_monthly")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {/* Only show purchase date for non-certificate debt types */}
        {watchedDebtSubType !== "Certificate" && (
          <FormField
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("purchase_date")}</FormLabel>
                <FormControl>
                  <Input
                    dir={dir}
                    type="date"
                    {...field}
                    value={field.value || getCurrentDate()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
};
const MemoizedRenderDebtFields = React.memo(RenderDebtFieldsComponent);

interface RenderRealEstateFieldsProps {
  control: any;
}
const RenderRealEstateFieldsComponent: React.FC<
  RenderRealEstateFieldsProps
> = ({ control }) => {
  return <RealEstateForm control={control} />;
};

export default RenderRealEstateFieldsComponent;
const MemoizedRenderRealEstateFields = React.memo(
  RenderRealEstateFieldsComponent,
);

// Recursively remove all undefined fields from an object (deep)
function removeUndefinedFieldsDeep(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFieldsDeep);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefinedFieldsDeep(v)]),
    );
  }
  return obj;
}

export function InvestmentForm({
  mode = "add",
  initialValues,
}: {
  mode?: "add" | "edit";
  initialValues?: Partial<InvestmentFormValues>;
}) {
  const { t } = useLanguage();

  // Use a state to track the current type for initial values
  const [currentType, setCurrentType] = useState<InvestmentType>(
    (initialValues?.type as InvestmentType) || "Stocks",
  );

  const form = useReactHookForm<InvestmentFormValues>({
    resolver: zodResolver(InvestmentSchema),
    defaultValues:
      mode === "edit" && initialValues
        ? {
            ...getInitialFormValues(initialValues.type as InvestmentType),
            ...initialValues,
          }
        : getInitialFormValues(currentType),
  });

  const { addInvestment, updateRealEstateInvestment } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSelectedSecurityId = searchParams.get("securityId");
  const preSelectedInvestmentType =
    (searchParams.get("type") as InvestmentType | null) || currentType;

  const {
    listedSecurities,
    isLoading: isLoadingListedSecurities,
    error: listedSecuritiesError,
    getListedSecurityById,
  } = useListedSecurities();
  const [preSelectedSecurityDetails, setPreSelectedSecurityDetails] =
    useState<ListedSecurity | null>(null);

  const isDedicatedGoldMode =
    preSelectedInvestmentType === "Gold" && !preSelectedSecurityId;
  const isDedicatedDebtMode =
    preSelectedInvestmentType === "Debt Instruments" && !preSelectedSecurityId;
  const isDedicatedCurrencyMode =
    preSelectedInvestmentType === "Currencies" && !preSelectedSecurityId;
  const isDedicatedRealEstateMode =
    preSelectedInvestmentType === "Real Estate" && !preSelectedSecurityId;
  const isPreSelectedStockMode = !!preSelectedSecurityId;

  useEffect(() => {
    let isMounted = true;
    if (mode === "edit" && initialValues) {
      // Only reset for the correct type
      const type = initialValues.type as InvestmentType;
      if (type) {
        // Patch: convert to string for real estate only if property exists
        const patchedInitialValues: any = { ...initialValues };
        if (type === "Real Estate") {
          if (
            Object.prototype.hasOwnProperty.call(
              patchedInitialValues,
              "amountInvested",
            ) &&
            typeof patchedInitialValues.amountInvested === "number"
          ) {
            patchedInitialValues.amountInvested = String(
              patchedInitialValues.amountInvested,
            );
          }
          if (
            Object.prototype.hasOwnProperty.call(
              patchedInitialValues,
              "installmentAmount",
            ) &&
            typeof patchedInitialValues.installmentAmount === "number"
          ) {
            patchedInitialValues.installmentAmount = String(
              patchedInitialValues.installmentAmount,
            );
          }
        }
        form.reset({
          ...getInitialFormValues(type),
          ...patchedInitialValues,
        } as any);
        setCurrentType(type);
      }
      return () => {
        isMounted = false;
      };
    }

    // Fix: resetFormWithType and form.reset must use correct type for discriminated union
    const resetFormWithType = (type: InvestmentType) => {
      setCurrentType(type);
      form.reset({
        ...initialFormValuesByType[type],
        type,
      } as InvestmentFormValues);
      setPreSelectedSecurityDetails(null);
    };

    if (isDedicatedGoldMode) {
      resetFormWithType("Gold");
    } else if (isDedicatedDebtMode) {
      resetFormWithType("Debt Instruments");
    } else if (isDedicatedCurrencyMode) {
      resetFormWithType("Currencies");
    } else if (isDedicatedRealEstateMode) {
      resetFormWithType("Real Estate");
    } else if (isPreSelectedStockMode) {
      resetFormWithType("Stocks");
      form.setValue("selectedSecurityId", preSelectedSecurityId);
      getListedSecurityById(preSelectedSecurityId).then((security) => {
        if (isMounted && security) {
          setPreSelectedSecurityDetails(security);
          form.setValue("purchasePricePerShare", security.price);
        } else if (isMounted) {
          toast({
            title: "Error",
            description: t("preselected_security_not_found"),
            variant: "destructive",
          });
          router.replace("/investments/add");
        }
      });
    } else if (preSelectedInvestmentType) {
      resetFormWithType(preSelectedInvestmentType);
    } else {
      resetFormWithType("Stocks"); // fallback to Stocks
    }
    return () => {
      isMounted = false;
    };
  }, [
    mode,
    initialValues,
    preSelectedSecurityId,
    preSelectedInvestmentType,
    form,
    getListedSecurityById,
    toast,
    router,
  ]);

  async function onSubmit(values: InvestmentFormValues) {
    if (
      form.formState.errors &&
      Object.keys(form.formState.errors).length > 0
    ) {
      toast({
        title: t("validation_error"),
        description: t("please_check_the_form_for_errors"),
        variant: "destructive",
      });
      return;
    }

    const investmentId = uuidv4();
    let investmentName = values.name || "";

    if (!preSelectedInvestmentType) {
      toast({
        title: t("error"),
        description: t("investment_type_is_missing"),
        variant: "destructive",
      });
      return;
    }

    let newInvestmentBase = {
      id: investmentId,
      type: preSelectedInvestmentType,
      purchaseDate: values.purchaseDate,
      amountInvested: 0,
      name: "",
    };

    let newInvestment:
      | DebtInstrumentInvestment
      | StockInvestment
      | GoldInvestment
      | CurrencyInvestment
      | RealEstateInvestment;

    // Remove all parsed* variables, use type narrowing instead
    if (preSelectedInvestmentType === "Stocks" && values.type === "Stocks") {
      const securityToProcessId =
        values.selectedSecurityId || preSelectedSecurityId;
      const selectedSecurity =
        listedSecurities.find((sec) => sec.id === securityToProcessId) ||
        preSelectedSecurityDetails;

      if (!selectedSecurity) {
        toast({
          title: t("error"),
          description: t("selected_security_details_not_found"),
          variant: "destructive",
        });
        return;
      }
      const calculatedAmountInvested =
        values.numberOfShares * values.purchasePricePerShare +
        values.purchaseFees;
      investmentName = `${selectedSecurity.name} ${t("Purchase")}`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: calculatedAmountInvested,
        tickerSymbol: selectedSecurity.symbol as string,
        stockLogoUrl: selectedSecurity.logoUrl,
        numberOfShares: values.numberOfShares,
        purchasePricePerShare: values.purchasePricePerShare,
        purchaseFees: values.purchaseFees,
        type: "Stocks",
      };
    } else if (
      preSelectedInvestmentType === "Debt Instruments" &&
      values.type === "Debt Instruments"
    ) {
      investmentName = `${t(values.debtSubType)} - ${values.issuer}`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: values.amountInvested,
        issuer: values.issuer || "",
        interestRate: values.interestRate,
        maturityDate: values.maturityDate!,
        debtSubType: values.debtSubType!,
        type: "Debt Instruments",
        certificateInterestFrequency:
          values.certificateInterestFrequency || "Monthly",
      };
    } else if (preSelectedInvestmentType === "Gold" && values.type === "Gold") {
      investmentName =
        values.name || `${t("gold")} (${values.goldType || t("na")})`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: values.amountInvested,
        goldType: values.goldType!,
        quantityInGrams: values.quantityInGrams,
        type: "Gold",
      };
    } else if (
      preSelectedInvestmentType === "Currencies" &&
      values.type === "Currencies"
    ) {
      investmentName =
        values.name || `${t("currency")} (${values.currencyCode || t("na")})`;
      const calculatedCost =
        values.foreignCurrencyAmount * values.exchangeRateAtPurchase;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: calculatedCost,
        currencyCode: values.currencyCode!,
        foreignCurrencyAmount: values.foreignCurrencyAmount,
        exchangeRateAtPurchase: values.exchangeRateAtPurchase,
        type: "Currencies",
      };
    } else if (
      preSelectedInvestmentType === "Real Estate" &&
      values.type === "Real Estate"
    ) {
      investmentName =
        values.name ||
        `${t("real_estate")} (${values.propertyAddress || t("na")})`;
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
        type: "Real Estate",
      });
    } else {
      investmentName = values.name || `${preSelectedInvestmentType} Investment`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: values.amountInvested,
        type: preSelectedInvestmentType as any,
      };
    }

    if (
      mode === "edit" &&
      initialValues &&
      "id" in initialValues &&
      initialValues["id"]
    ) {
      // Only update for Real Estate investments
      if (values.type === "Real Estate") {
        await updateRealEstateInvestment(
          initialValues["id"] as string,
          removeUndefinedFieldsDeep(values),
        );
        toast({
          title: t("investment_updated"),
          description: `${values.name || values.propertyAddress || t("real_estate")} ${t("has_been_successfully_updated")}.`,
        });
        router.push("/investments/real-estate");
        return;
      }
      // Add more types here if you want to support editing other investment types
    } else {
      await addInvestment(newInvestment);
      toast({
        title: t("investment_added"),
        description: `${t(preSelectedInvestmentType)}: ${newInvestment.name} ${t("has_been_successfully_added")}.`,
      });
    }

    // Fix: always use a valid InvestmentType for reset, never undefined
    const resetTargetType = isDedicatedDebtMode
      ? "Debt Instruments"
      : isDedicatedGoldMode
        ? "Gold"
        : isDedicatedCurrencyMode
          ? "Currencies"
          : isDedicatedRealEstateMode
            ? "Real Estate"
            : isPreSelectedStockMode
              ? "Stocks"
              : "Stocks"; // fallback to Stocks if undefined

    // Fix: Only use a single type for reset values, never a union or undefined
    const resetValues: InvestmentFormValues =
      initialFormValuesByType[resetTargetType as InvestmentType];
    form.reset(resetValues);

    if (
      isPreSelectedStockMode &&
      preSelectedSecurityDetails &&
      preSelectedSecurityId
    ) {
      form.setValue("purchasePricePerShare", preSelectedSecurityDetails.price);
    } else if (!resetTargetType && !preSelectedInvestmentType) {
      router.replace("/investments/add");
    }
  }

  let submitButtonText = t("add_investment");

  // Custom: Edit Real Estate mode title and button
  if (
    mode === "edit" &&
    preSelectedInvestmentType === "Real Estate" &&
    initialValues?.name
  ) {
    submitButtonText = t("save_changes");
  } else if (mode === "edit" && preSelectedInvestmentType === "Real Estate") {
    submitButtonText = t("save_changes");
  } else if (isDedicatedGoldMode) {
    submitButtonText = t("add_gold");
  } else if (isDedicatedDebtMode) {
    submitButtonText = t("buy_debt_instrument");
  } else if (isDedicatedCurrencyMode) {
    submitButtonText = t("add_currency");
  } else if (isDedicatedRealEstateMode) {
    submitButtonText = t("add_real_estate");
  } else if (isPreSelectedStockMode && preSelectedSecurityDetails) {
    submitButtonText = t("buy");
  } else if (
    preSelectedInvestmentType &&
    !isDedicatedGoldMode &&
    !isDedicatedDebtMode &&
    !isDedicatedCurrencyMode &&
    !isDedicatedRealEstateMode &&
    !isPreSelectedStockMode
  ) {
    submitButtonText = t("add") + " " + preSelectedInvestmentType;
  }

  const handleSecuritySelect = useCallback(
    (selectedValue: string) => {
      const security = listedSecurities.find((s) => s.id === selectedValue);
      setPreSelectedSecurityDetails(security || null);
      if (security) {
        form.setValue("purchasePricePerShare", security.price);
      }
    },
    [listedSecurities, form, setPreSelectedSecurityDetails],
  );

  return (
    <div className="pt-2">
      <div className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {isDedicatedDebtMode ? (
              <MemoizedRenderDebtFields
                control={form.control}
                setValue={form.setValue}
                watch={form.watch}
              />
            ) : isDedicatedGoldMode ? (
              <MemoizedRenderGoldFieldsSection
                control={form.control}
                isDedicatedGoldMode={true}
              />
            ) : isDedicatedCurrencyMode ? (
              <MemoizedRenderCurrencyFields
                control={form.control}
                isDedicatedCurrencyMode={true}
              />
            ) : isDedicatedRealEstateMode ? (
              <MemoizedRenderRealEstateFields control={form.control} />
            ) : isPreSelectedStockMode && preSelectedSecurityDetails ? (
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
              <div>Cannot determine investment type</div>
            )}

            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={
                form.formState.isSubmitting ||
                (preSelectedInvestmentType === "Stocks" &&
                  !isPreSelectedStockMode &&
                  (isLoadingListedSecurities ||
                    !!listedSecuritiesError ||
                    !form.getValues("selectedSecurityId"))) ||
                (isPreSelectedStockMode &&
                  (!preSelectedSecurityDetails || isLoadingListedSecurities))
              }
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitButtonText}
            </Button>
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="mt-2 text-red-500 text-sm">
                {t("please_fix_the_errors_above_and_try_again")}
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
