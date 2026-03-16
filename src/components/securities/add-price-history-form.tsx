"use client";

import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm as useReactHookForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ListedSecurity } from "@/lib/types";
import { Loader2 } from "lucide-react";

// Zod schema for the form
const AddPriceHistorySchema = z.object({
  securityId: z.string().min(1, "Security is required"),
  price: z.string().min(1, "Price is required"),
});

type AddPriceHistoryFormValues = z.infer<typeof AddPriceHistorySchema>;

export interface AddPriceHistoryFormProps {
  onSubmit?: (values: AddPriceHistoryFormValues) => Promise<void>;
}

export function AddPriceHistoryForm({ onSubmit }: AddPriceHistoryFormProps) {
  const { t, dir } = useLanguage();
  const { setHeaderProps, openForm, closeForm } = useForm();
  const { listedSecurities } = useListedSecurities();

  // Get all funds
  const funds = listedSecurities.filter((security: ListedSecurity) => security.securityType === "Fund");

  const form = useReactHookForm<AddPriceHistoryFormValues>({
    resolver: zodResolver(AddPriceHistorySchema),
    defaultValues: {
      securityId: "",
      price: "",
    },
  });

  useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: t("add_price_history"),
      description: t("add_price_history_for_fund"),
      backLabel: t("back_to_securities"),
      backHref: "/securities",
    });

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [setHeaderProps, closeForm, openForm, t]);

  const handleSecurityChange = (value: string) => {
    form.setValue("securityId", value);
  };

  const handleInternalSubmit = async (values: AddPriceHistoryFormValues) => {
    if (onSubmit) {
      await onSubmit(values);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleInternalSubmit)}
        className="space-y-8"
      >

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="securityId"
            render={({ field }) => (
              <FormItem
                data-testid="security-select-form-item"
              >
                <FormLabel>{t("select_fund")}</FormLabel>
                <Select
                  dir={dir}
                  value={field.value}
                  onValueChange={handleSecurityChange}
                  disabled={form.formState.isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger data-testid="security-select">
                      <SelectValue placeholder={t("select_fund")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {funds.map((fund: ListedSecurity) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.symbol} - {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem data-testid="price-form-item">
                <FormLabel>{t("price")}</FormLabel>
                <FormControl>
                  <NumericInput
                    decimalScale={5}
                    data-testid="price-input"
                    placeholder={t("e.g., 100.50")}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Placeholder for submit button - to be implemented later */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            data-testid="submit-button"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Saving")}
              </>
            ) : (
              t("Save")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
