"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm as useReactHookForm } from "react-hook-form";
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
  InvestmentData,
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
import { getCurrentDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useInvestments } from "@/hooks/use-investments";

// Initial values for each investment type
const initialFormValuesByType: Record<InvestmentType, InvestmentFormValues> = {
  Securities: {
    type: "Securities",
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

//TODO:
// 1. modes buy, buyNew, edit, sell
// 2. check parameters for each mode .. current parameters are for buyNew and it could be used for edit and i think we could create a new form (transaction-form) for buy, sell, and edit transactions
interface InvestmentFormProps {
  mode?: "buyNew" | "edit";
  initialValues?: Partial<InvestmentFormValues>;
  initialType?: string;
  securityId?: string;
}

export function InvestmentForm({
  mode,
  initialValues,
  initialType,
  securityId,
}: InvestmentFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { buyNew, editInvestment } = useInvestments();
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
        (initialType as InvestmentType) || "Securities",
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
  const isDedicatedSecuritiesMode = Boolean(
    initialType === "Securities" ||
      watchedType === "Securities" ||
      form.getValues("type") === "Securities",
  );

  const { getSecurityById } = useListedSecurities();
  const preSelectedSecurityId = form.watch("selectedSecurityId");
  const selectedSecurity = getSecurityById(preSelectedSecurityId) || null;

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

    let investmentName = values.name || "";

    if (!watchedType) {
      toast({
        title: t("error"),
        description: t("investment_type_is_missing"),
        variant: "destructive",
      });
      return;
    }

    const newInvestmentBase = {
      type: watchedType,
      firstPurchaseDate: values.purchaseDate || now,
      currency: "EGP" as const,
    };

    let newInvestment: InvestmentData;

    if (isDedicatedSecuritiesMode && values.type == "Securities") {
      if (!selectedSecurity) {
        toast({
          title: t("error"),
          description: t("selected_security_details_not_found"),
          variant: "destructive",
        });
        return;
      }

      investmentName = `${selectedSecurity[language === "ar" ? "name_ar" : "name"]} ${t("Purchase")}`;

      const securityInvestment: InvestmentData<SecurityInvestment> = {
        ...newInvestmentBase,
        type: values.type,
        securityId: selectedSecurity.id,
        name: investmentName,
        quantity: values.numberOfShares,
        pricePerUnit: values.purchasePricePerShare,
        fees: values.purchaseFees,
        fundType: selectedSecurity.fundType,
      };

      newInvestment = securityInvestment;
    } else if (isDedicatedDebtMode && values.type == "Debt Instruments") {
      investmentName = `${t(values.debtSubType)} - ${values.issuer}`;
      const annualInterest =
        (values.amountInvested * values.interestRate) / 100;

      const debtInvestment: InvestmentData<DebtInstrumentInvestment> = {
        ...newInvestmentBase,
        type: values.type,
        name: investmentName,
        quantity: 1,
        pricePerUnit: values.amountInvested,
        issuer: values.issuer || "",
        interestRate: values.interestRate,
        maturityDate: values.maturityDate!,
        debtSubType: values.debtSubType!,
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

      newInvestment = debtInvestment;
    } else if (isDedicatedGoldMode && values.type == "Gold") {
      investmentName =
        values.name || `${t("gold")} (${values.goldType || t("na")})`;

      const goldInvestment: InvestmentData<GoldInvestment> = {
        ...newInvestmentBase,
        type: values.type,
        name: investmentName,
        quantity: values.quantityInGrams,
        pricePerUnit: values.amountInvested / values.quantityInGrams,
        goldType: values.goldType!,
      };

      newInvestment = goldInvestment;
    } else if (isDedicatedCurrencyMode && values.type == "Currencies") {
      investmentName =
        values.name || `${t("currency")} (${values.currencyCode || t("na")})`;

      const currencyInvestment: InvestmentData<CurrencyInvestment> = {
        ...newInvestmentBase,
        type: values.type,
        name: investmentName,
        quantity: values.foreignCurrencyAmount,
        pricePerUnit: values.exchangeRateAtPurchase,
        currencyCode: values.currencyCode!,
      };

      newInvestment = currencyInvestment;
    } else if (isDedicatedRealEstateMode && values.type == "Real Estate") {
      investmentName =
        values.name || `${t("real_estate")} (${values.propertyAddress || ""})`;

      const realEstateInvestment: InvestmentData<RealEstateInvestment> = {
        ...newInvestmentBase,
        type: values.type,
        name: investmentName,
        propertyType: values.propertyType,
        propertyAddress: values.propertyAddress,
        totalPrice: values.totalInstallmentPrice,
        builtUpArea: values.builtUpArea,
        hasGarden: values.hasGarden,
        downPayment: values.downPayment,
        maintenanceAmount: values.maintenanceAmount,
        maintenancePaymentDate: values.maintenancePaymentDate,
        installmentFrequency: values.installmentFrequency,
        installmentAmount: values.installmentAmount,
        firstInstallmentDate: values.installmentStartDate!,
        lastInstallmentDate: values.installmentEndDate!,
      };

      newInvestment = realEstateInvestment;
    } else {
      toast({
        title: t("error"),
        description: t("cannot_determine_investment_type"),
        variant: "destructive",
      });
      return;
    }

    if (
      mode === "edit" &&
      initialValues &&
      "id" in initialValues &&
      initialValues["id"]
    ) {
      await editInvestment(initialValues["id"] as string, newInvestment);
      toast({
        title: t("investment_edited"),
        description: `${t(watchedType)}: ${newInvestment.name} ${t("has_been_successfully_edited")}.`,
        testId: "investment-edited-toast",
      });
    } else {
      await buyNew(newInvestment);
      toast({
        title: t("investment_added"),
        description: `${t(watchedType)}: ${newInvestment.name} ${t("has_been_successfully_added")}.`,
        testId: "investment-added-toast",
      });
    }

    form.reset(getInitialFormValues(watchedType as InvestmentType));
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
            ) : isDedicatedSecuritiesMode && selectedSecurity ? (
              <MemoizedRenderStockFields
                control={form.control}
                preSelectedSecurityDetails={selectedSecurity}
              />
            ) : (
              <div>{t("cannot_determine_investment_type")}</div>
            )}
            <Button
              type="submit"
              className="w-full md:w-auto"
              data-testid="submit-investment-button"
              disabled={form.formState.isSubmitting}
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
