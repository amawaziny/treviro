"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm as useReactHookForm,
  useFormContext as useReactHookFormContext,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  InvestmentSchema,
  type InvestmentFormValues,
  goldTypes,
  debtSubTypes,
  propertyTypes,
} from "@/lib/schemas";
import React from "react";
import { Loader2 } from "lucide-react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type {
  CurrencyInvestment,
  DebtInstrumentInvestment,
  GoldInvestment,
  InvestmentType,
  RealEstateInvestment,
  SecurityInvestment,
} from "@/lib/types";
import { useLanguage } from "@/contexts/language-context";
import { MemoizedRenderGoldFieldsSection } from "./gold-fields-form";
import { MemoizedRenderCurrencyFields } from "./currency-fields-form";
import { MemoizedRenderStockFields } from "./stock-fields-form";
import { MemoizedRenderDebtFields } from "./debt-fields-form";
import { MemoizedRenderRealEstateFields } from "./real-estate-fields-form";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { getCurrentDate, removeUndefinedFieldsDeep } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useInvestments } from "@/hooks/use-investments";

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
  Securities: {
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
    interestFrequency: "Monthly",
    amountInvested: 0,
    purchaseDate: getCurrentDate(),
    name: "",
  },
};

// Helper to get initial values for a type
function getInitialFormValues(type: InvestmentType): InvestmentFormValues {
  return { ...initialFormValuesByType[type] };
}

interface InvestmentFormProps {
  mode?: "add" | "edit";
  initialValues?: Partial<InvestmentFormValues>;
  initialType?: string;
  securityId?: string;
}

export function InvestmentForm({
  mode = "add",
  initialValues,
  initialType,
  securityId,
}: InvestmentFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const {
    addInvestment,
    updateRealEstateInvestment,
    updateDebtInstrumentInvestment,
  } = useInvestments();
  const form = useReactHookForm<InvestmentFormValues>({
    resolver: zodResolver(InvestmentSchema),
    defaultValues: (() => {
      if (mode === "edit" && initialValues) {
        return {
          ...getInitialFormValues(initialValues.type as InvestmentType),
          ...initialValues,
        };
      }

      const defaults = getInitialFormValues(
        (initialType as InvestmentType) || "Stocks",
      );

      // If securityId is provided, set it as the selectedSecurityId
      if (securityId) {
        return {
          ...defaults,
          selectedSecurityId: securityId,
        };
      }

      return defaults;
    })(),
  });
  const watchedType = form.watch("type");

  // Mode flags
  const isDedicatedDebtMode = watchedType === "Debt Instruments";
  const isDedicatedGoldMode = watchedType === "Gold";
  const isDedicatedCurrencyMode = watchedType === "Currencies";
  const isDedicatedRealEstateMode = watchedType === "Real Estate";
  const isPreSelectedStockMode = Boolean(
    initialType === "Stocks" ||
      watchedType === "Stocks" ||
      form.getValues("type") === "Stocks",
  );

  // Stock-specific logic
  const {
    listedSecurities,
    isLoading: isLoadingListedSecurities,
    error: listedSecuritiesError,
  } = useListedSecurities();
  const preSelectedSecurityId = form.watch("selectedSecurityId");
  const preSelectedSecurityDetails =
    listedSecurities.find((sec) => sec.id === preSelectedSecurityId) || null;

  // Button text
  const submitButtonText =
    mode === "edit" ? t("update_investment") : t("add_investment");

  // onSubmit handler
  async function onSubmit(values: InvestmentFormValues) {
    const now = new Date().toISOString();
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

    if (!watchedType) {
      toast({
        title: t("error"),
        description: t("investment_type_is_missing"),
        variant: "destructive",
      });
      return;
    }

    let newInvestmentBase = {
      id: investmentId,
      type: watchedType,
      firstPurchaseDate: values.purchaseDate || now,
      lastUpdated: now,
      currency: "EGP" as const,
    };

    let newInvestment:
      | DebtInstrumentInvestment
      | SecurityInvestment
      | GoldInvestment
      | CurrencyInvestment
      | RealEstateInvestment;

    // Remove all parsed* variables, use type narrowing instead
    if (isPreSelectedStockMode && values.type == "Stocks") {
      const securityToProcessId = preSelectedSecurityId;
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
      investmentName = `${selectedSecurity[language === "ar" ? "name_ar" : "name"]} ${t("Purchase")}`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        amountInvested: calculatedAmountInvested,
        tickerSymbol: selectedSecurity.symbol as string,
        securityId: selectedSecurity.id,
        numberOfShares: values.numberOfShares,
        purchasePricePerShare: values.purchasePricePerShare,
        purchaseFees: values.purchaseFees,
        type: selectedSecurity.fundType ?? "Stocks",
        fundType: selectedSecurity.fundType ? selectedSecurity.fundType : null,
      };
    } else if (isDedicatedDebtMode && values.type == "Debt Instruments") {
      investmentName = `${t(values.debtSubType)} - ${values.issuer}`;
      const annualInterest =
        (values.amountInvested * values.interestRate) / 100;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        totalShares: 1,
        averagePurchasePrice: values.amountInvested,
        totalInvested: values.amountInvested,
        issuer: values.issuer || "",
        interestRate: values.interestRate,
        maturityDate: values.maturityDate!,
        debtSubType: values.debtSubType!,
        type: "Debt Instruments",
        interestFrequency: values.interestFrequency || "Monthly",
        interestAmount:
          annualInterest /
          (values.interestFrequency === "Monthly"
            ? 12
            : values.interestFrequency === "Quarterly"
              ? 4
              : 1),
        monthlyInterestAmount: annualInterest / 12,
      };
    } else if (isDedicatedGoldMode && values.type == "Gold") {
      investmentName =
        values.name || `${t("gold")} (${values.goldType || t("na")})`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        totalInvested: values.amountInvested,
        goldType: values.goldType!,
        quantityInGrams: values.quantityInGrams,
        type: "Gold",
      };
    } else if (isDedicatedCurrencyMode && values.type == "Currencies") {
      investmentName =
        values.name || `${t("currency")} (${values.currencyCode || t("na")})`;
      const calculatedCost =
        values.foreignCurrencyAmount * values.exchangeRateAtPurchase;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        totalInvested: calculatedCost,
        currencyCode: values.currencyCode!,
        foreignCurrencyAmount: values.foreignCurrencyAmount,
        exchangeRateAtPurchase: values.exchangeRateAtPurchase,
        type: "Currencies",
      };
    } else if (isDedicatedRealEstateMode && values.type == "Real Estate") {
      investmentName =
        values.name ||
        `${t("real_estate")} (${values.propertyAddress || t("na")})`;
      newInvestment = removeUndefinedFieldsDeep({
        ...newInvestmentBase,
        name: investmentName,
        totalInvested: values.amountInvested,
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
      investmentName = values.name || `${watchedType} Investment`;
      newInvestment = {
        ...newInvestmentBase,
        name: investmentName,
        totalInvested: values.amountInvested,
        type: watchedType as any,
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
      } else if (values.type === "Debt Instruments") {
        await updateDebtInstrumentInvestment(
          initialValues["id"] as string,
          removeUndefinedFieldsDeep(values),
        );
        toast({
          title: t("investment_updated"),
          description: `${t(values.debtSubType)} - ${values.issuer} ${t("has_been_successfully_updated")}.`,
        });
        router.push("/investments/debt-instruments");
        return;
      }
      // Add more types here if you want to support editing other investment types
    } else {
      await addInvestment(newInvestment);
      toast({
        title: t("investment_added"),
        description: `${t(watchedType)}: ${newInvestment.name} ${t("has_been_successfully_added")}.`,
        testId: "investment-added-toast",
      });

      // Reset the form to initial state after successful submission
      form.reset(getInitialFormValues(watchedType as InvestmentType));

      // If it's a stock purchase, redirect to the stocks page
      if (watchedType === "Stocks") {
        router.push("/investments/stocks");
      }
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
    } else if (!resetTargetType && !watchedType) {
      router.replace("/investments/add");
    }
  }

  return (
    <div className="pt-2">
      <div className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {isDedicatedDebtMode ? (
              <MemoizedRenderDebtFields
                isEditMode={mode === "edit"}
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
              />
            ) : (
              <div>Cannot determine investment type</div>
            )}
            <Button
              type="submit"
              className="w-full md:w-auto"
              data-testid="submit-investment-button"
              disabled={
                form.formState.isSubmitting ||
                (isPreSelectedStockMode &&
                  (isLoadingListedSecurities ||
                    !!listedSecuritiesError ||
                    !form.getValues("selectedSecurityId") ||
                    !preSelectedSecurityDetails))
              }
            >
              {form.formState.isSubmitting && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
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
