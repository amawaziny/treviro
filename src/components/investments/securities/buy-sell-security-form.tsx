"use client";
import { useLanguage } from "@/contexts/language-context";

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
  BuySellSecuritySchema,
  type BuySellSecurityFormValues,
} from "@/lib/schemas";
import { useInvestments } from "@/contexts/investment-context";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import type {
  InvestmentType,
  ListedSecurity,
  SecurityInvestment,
} from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentDate } from "@/lib/utils";

interface BuySellSecurityFormProps {
  security: ListedSecurity;
  securityInvestment: SecurityInvestment;
  mode: "buy" | "sell";
  submitTrx: (
    investmentId: string,
    securityId: string,
    investmentType: InvestmentType,
    quantity: number,
    pricePerUnit: number,
    fees: number,
    date: Date,
  ) => Promise<void>;
}

export function BuySellSecurityForm({
  security,
  securityInvestment,
  mode,
  submitTrx,
}: BuySellSecurityFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

  const maxSharesToSell = securityInvestment?.totalShares || 0;

  const form = useForm<BuySellSecurityFormValues>({
    resolver: zodResolver(BuySellSecuritySchema),
    defaultValues: {
      securityId: security.id,
      numberOfShares: 0,
      pricePerShare: 0,
      date: getCurrentDate(),
      fees: 0,
    },
  });

  useEffect(() => {
    if (security && securityInvestment) {
      if (security.price && form.getValues("pricePerShare") === 0) {
        form.setValue("pricePerShare", security.price);
      }
    }
  }, [security, form]);

  async function onSubmit(values: BuySellSecurityFormValues) {
    if (!security) {
      toast({
        title: t("error"),
        description: t("security_details_not_found"),
        variant: "destructive",
      });
      return;
    }

    const numberOfShares = values.numberOfShares;

    if (mode === "sell" && numberOfShares > maxSharesToSell) {
      form.setError("numberOfShares", {
        type: "manual",
        message: `${t("you_only_own")} ${maxSharesToSell} ${securityLabel}.`,
      });
      return;
    }

    await submitTrx(
      securityInvestment!.id,
      security.id,
      "Securities",
      numberOfShares,
      values.pricePerShare,
      values.fees ?? 0,
      new Date(values.date),
    );

    try {
      if (mode === "sell") {
        toast({
          title: t("sale_recorded"),
          description: `${t("Successfully recorded sale of")} ${values.numberOfShares} ${securityLabel} ${t("of")} ${security[language === "ar" ? "name_ar" : "name"]}.`,
        });
      } else {
        toast({
          title: t("purchase_recorded"),
          description: `${t("Successfully recorded purchase of")} ${values.numberOfShares} ${securityLabel} ${t("of")} ${security[language === "ar" ? "name_ar" : "name"]}.`,
        });
      }

      router.push(`/securities/${security.id}`);
    } catch (error: any) {
      console.error(t("error_recording_sale"), error);
      toast({
        title: t("sale_recording_failed"),
        description:
          error.message || t("could_not_record_the_sale_please_try_again"),
        variant: "destructive",
      });
    }
  }

  if (!security) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error")}</AlertTitle>
        <AlertDescription>
          {t(
            "could_not_load_security_details_to_sell_please_go_back_and_try_again",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const securityLabel =
    security.securityType === "Fund"
      ? [t("units"), t("unit")]
      : [t("shares"), t("share")];

  if (mode === "sell" && maxSharesToSell === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("no_holdings_to_sell")}</AlertTitle>
        <AlertDescription>
          {t("you_do_not_currently_own_any_holdings_of")}
          {security.name} ({security.symbol}){t("to_sell")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 border rounded-md bg-muted/50">
          <h3 className="text-lg font-medium">
            {`${mode === "buy" ? t("buying") : t("selling")} ${security[language === "ar" ? "name_ar" : "name"]} (${security.symbol})`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {`${t("you_currently_own")} ${maxSharesToSell} ${securityLabel[0]}.`}
          </p>
          <p className="text-sm text-muted-foreground">
            {`${t("current_market_price")} ${security.price.toLocaleString(
              undefined,
              {
                style: "currency",
                currency: security.currency,
              },
            )}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="numberOfShares"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`${t("number_of")} ${securityLabel[0]}`}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder={`e.g., 50 or 10`}
                    value={field.value?.toString() || ""}
                    onChange={(value) => field.onChange(Number(value))}
                    allowDecimal={false}
                  />
                </FormControl>
                <FormDescription>
                  {t("max")}
                  {maxSharesToSell}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerShare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`${t("price_per")} ${securityLabel[1]}`}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 160.25"
                    value={
                      field.value === undefined || field.value === null
                        ? ""
                        : String(field.value)
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
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("date")}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value || getCurrentDate()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fees_if_any")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 5.00"
                    value={
                      field.value === undefined || field.value === null
                        ? ""
                        : String(field.value)
                    } // ensure value is always a string
                    onChange={field.onChange} // RHF onChange expects string or number
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>
                  {t("total_fees_for_this_transaction")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={form.formState.isSubmitting || maxSharesToSell === 0}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {mode === "buy" ? t("record_purchase") : t("record_sale")}
        </Button>
      </form>
    </Form>
  );
}
