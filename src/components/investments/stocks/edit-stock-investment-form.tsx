"use client";
import { useLanguage } from "@/contexts/language-context";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  EditStockInvestmentSchema,
  type EditStockInvestmentFormValues,
} from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { SecurityInvestment } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EditStockInvestmentFormProps {
  investment: SecurityInvestment;
}

export function EditStockInvestmentForm({
  investment,
}: EditStockInvestmentFormProps) {
  const { t } = useLanguage();
  const { updateStockInvestment, isLoading: isLoadingContext } =
    useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [oldAmountInvested, setOldAmountInvested] = useState<number | null>(
    null,
  );

  const form = useForm<EditStockInvestmentFormValues>({
    resolver: zodResolver(EditStockInvestmentSchema),
    defaultValues: {
      purchaseDate: "",
      //@ts-expect-error
      numberOfShares: "", // Keep as string
      //@ts-expect-error
      purchasePricePerShare: "", // Keep as string
      //@ts-expect-error
      purchaseFees: "", // Keep as string
    },
  });

  useEffect(() => {
    setIsLoadingData(true);
    if (investment) {
      setOldAmountInvested(investment.amountInvested);
      form.reset({
        purchaseDate: investment?.purchaseDate?.split("T")[0] ?? "",
        //@ts-expect-error
        numberOfShares: String(investment?.numberOfShares ?? ""),
        //@ts-expect-error
        purchasePricePerShare: String(investment?.purchasePricePerShare ?? ""),
        //@ts-expect-error
        purchaseFees: String(investment?.purchaseFees ?? "0"),
      });
    } else if (!isLoadingContext) {
      toast({
        title: t("error"),
        description: t("investment_not_found_or_not_editable"),
        variant: "destructive",
      });
      router.back();
    }
    setIsLoadingData(false);
  }, [investment, form, toast, router, isLoadingContext]);

  const onSubmit: import("react-hook-form").SubmitHandler<
    EditStockInvestmentFormValues
  > = async (values) => {
    if (!investment || oldAmountInvested === null) {
      toast({
        title: t("error"),
        description: t(
          "cannot_save_investment_data_missing_or_original_amount_not_loaded",
        ),

        variant: "destructive",
      });
      return;
    }

    try {
      const dataToUpdate = {
        purchaseDate: values.purchaseDate,
        numberOfShares: values.numberOfShares,
        purchasePricePerShare: values.purchasePricePerShare,
        purchaseFees: values.purchaseFees ?? 0, // Zod default ensures this is 0
      };

      await updateStockInvestment(
        investment.id,
        dataToUpdate,
        oldAmountInvested,
      );

      toast({
        title: t("investment_updated"),
        description: `${investment.tickerSymbol} ${t("purchase details updated")}.`,
      });
      router.push(`/securities/details/${investment.tickerSymbol}`);
    } catch (error: any) {
      console.error(t("error_updating_investment"), error);
      toast({
        title: t("update_failed"),
        description: error.message || t("could_not_update_investment_details"),
        variant: "destructive",
      });
    }
  };

  if (isLoadingData || isLoadingContext) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("loading_investment_details")}
      </div>
    );
  }

  if (!investment && !isLoadingData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error")}</AlertTitle>
        <AlertDescription>
          {t("investment_not_found_it_might_have_been_removed")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${t("Edit Purchase")}: ${investment?.tickerSymbol}`}</CardTitle>
        <CardDescription>
          {t("modify_the_details_of_this_stock_purchase")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("purchase_date")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfShares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("number_of_securities")}</FormLabel>
                    <FormControl>
                      <NumericInput
                        placeholder="e.g., 100"
                        value={
                          field.value !== undefined && field.value !== null
                            ? String(field.value)
                            : ""
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
                name="purchasePricePerShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("purchase_price_per_security")}</FormLabel>
                    <FormControl>
                      <NumericInput
                        placeholder="e.g., 150.50"
                        value={
                          field.value !== undefined && field.value !== null
                            ? String(field.value)
                            : ""
                        }
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("purchase_fees_optional")}</FormLabel>
                    <FormControl>
                      <NumericInput
                        placeholder="e.g., 5.00"
                        value={
                          field.value !== undefined && field.value !== null
                            ? String(field.value)
                            : ""
                        }
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("save_changes")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
