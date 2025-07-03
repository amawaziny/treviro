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
import { SellStockSchema, type SellStockFormValues } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import type { ListedSecurity, SecurityInvestment } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface SellSecurityFormProps {
  securityId: string;
}

export function SellStockForm({
  securityId: securityId,
}: SellSecurityFormProps) {
  const { t: t } = useLanguage();
  const {
    recordSellStockTransaction,
    investments,
    isLoading: isLoadingInvestmentsContext,
  } = useInvestments();
  const { getListedSecurityById, isLoading: isLoadingListedSecurities } =
    useListedSecurities();
  const { toast } = useToast();
  const router = useRouter();

  const [securityBeingSold, setSecurityBeingSold] =
    useState<ListedSecurity | null>(null);
  const [maxSharesToSell, setMaxSharesToSell] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<SellStockFormValues>({
    resolver: zodResolver(SellStockSchema),
    defaultValues: {
      securityId: securityId,
      numberOfSharesToSell: "", // Keep as string
      sellPricePerShare: "", // Keep as string
      sellDate: getCurrentDate(),
      fees: "", // Keep as string
    },
  });

  useEffect(() => {
    setIsLoading(true);
    async function fetchData() {
      const listedSecurityData = await getListedSecurityById(securityId);
      setSecurityBeingSold(listedSecurityData || null);

      if (listedSecurityData) {
        const userOwnedForThisSymbol = investments.filter(
          (inv) =>
            inv.type === "Stocks" &&
            inv.tickerSymbol === listedSecurityData.symbol,
        ) as SecurityInvestment[];

        const totalOwned = userOwnedForThisSymbol.reduce(
          (sum, inv) => sum + (inv.numberOfShares || 0),
          0,
        );
        setMaxSharesToSell(totalOwned);
        if (
          listedSecurityData.price &&
          form.getValues("sellPricePerShare") === ""
        ) {
          form.setValue("sellPricePerShare", String(listedSecurityData.price));
        }
      }
      setIsLoading(false);
    }
    if (securityId && !isLoadingInvestmentsContext) {
      fetchData();
    } else if (!isLoadingInvestmentsContext) {
      setIsLoading(false);
    }
  }, [
    securityId,
    getListedSecurityById,
    investments,
    isLoadingInvestmentsContext,
    form,
  ]);

  async function onSubmit(values: SellStockFormValues) {
    if (!securityBeingSold) {
      toast({
        title: t("error"),
        description: t("security_details_not_found"),
        variant: "destructive",
      });
      return;
    }

    const numberOfSharesToSellNum = values.numberOfSharesToSell;

    if (numberOfSharesToSellNum > maxSharesToSell) {
      form.setError("numberOfSharesToSell", {
        type: "manual",
        message: `${t("you_only_own")} ${maxSharesToSell} ${securityLabel}.`,
      });
      return;
    }

    try {
      await recordSellStockTransaction(
        securityId,
        securityBeingSold.symbol,
        numberOfSharesToSellNum,
        values.sellPricePerShare,
        values.sellDate,
        values.fees ?? 0, // Zod default ensures this is 0 if undefined
      );
      toast({
        title: t("sale_recorded"),
        description: `${t("Successfully recorded sale of")} ${values.numberOfSharesToSell} ${securityLabel} ${t("of")} ${securityBeingSold.name}.`,
      });
      router.push(`/securities/details/${securityId}`);
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

  if (isLoading || isLoadingListedSecurities || isLoadingInvestmentsContext) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("loading_sale_information")}
      </div>
    );
  }

  if (!securityBeingSold) {
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
    securityBeingSold.securityType === "Fund"
      ? [t("units"), t("unit")]
      : [t("shares"), t("share")];

  if (maxSharesToSell === 0 && !isLoading) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("no_holdings_to_sell")}</AlertTitle>
        <AlertDescription>
          {t("you_do_not_currently_own_any_holdings_of")}
          {securityBeingSold.name} ({securityBeingSold.symbol}){t("to_sell")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 border rounded-md bg-muted/50">
          <h3 className="text-lg font-medium">
            {`${t("selling")} ${securityBeingSold.name} (${securityBeingSold.symbol})`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {`${t("you_currently_own")} ${maxSharesToSell} ${securityLabel[0]}.`}
          </p>
          <p className="text-sm text-muted-foreground">
            {`${t("current_market_price")} ${securityBeingSold.price.toLocaleString(
              undefined,
              {
                style: "currency",
                currency: securityBeingSold.currency,
              },
            )}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="numberOfSharesToSell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {`${t("number_of")} ${securityLabel[0]} ${t("to_sell")}`}
                </FormLabel>
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
            name="sellPricePerShare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {`${t("sell_price_per")} ${securityLabel[1]}`}
                </FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 160.25"
                    value={field.value?.toString() || ""}
                    onChange={(value) => field.onChange(Number(value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("sell_date")}</FormLabel>
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
                    value={field.value?.toString() || ""}
                    onChange={(value) => field.onChange(Number(value))}
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
          {t("record_sale")}
        </Button>
      </form>
    </Form>
  );
}
