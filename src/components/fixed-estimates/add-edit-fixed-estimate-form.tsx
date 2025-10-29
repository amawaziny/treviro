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
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  FixedEstimateSchema,
  type FixedEstimateFormValues,
  fixedEstimateTypes,
  fixedEstimatePeriods,
} from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { FixedEstimateRecord, FixedEstimateType } from "@/lib/types";
import React, { useEffect } from "react";

interface AddEditFixedEstimateFormProps {
  mode: "add" | "edit";
  estimate?: FixedEstimateRecord; // Provided in 'edit' mode
}

const initialFormValues: FixedEstimateFormValues = {
  type: "Salary",
  name: "",
  amount: "",
  period: "Monthly",
  isExpense: false,
};

export function AddEditFixedEstimateForm({
  mode,
  estimate,
}: AddEditFixedEstimateFormProps) {
  const { t, dir } = useLanguage();
  const { addFixedEstimate, updateFixedEstimate } = useInvestments(); // Add updateFixedEstimate later
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FixedEstimateFormValues>({
    resolver: zodResolver(FixedEstimateSchema),
    defaultValues:
      mode === "edit" && estimate
        ? {
            type: estimate.type,
            name: estimate.name ?? "",
            amount: estimate.amount.toString(),
            period: estimate.period,
            isExpense: estimate.isExpense,
          }
        : initialFormValues,
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    if (watchedType && watchedType !== "Other") {
      form.setValue("name", ""); // Clear name if type is not 'Other'
      if (watchedType === "Salary") {
        form.setValue("isExpense", false);
      } else if (watchedType === "Zakat" || watchedType === "Charity") {
        form.setValue("isExpense", true);
      }
    } else if (
      watchedType === "Other" &&
      form.getValues("isExpense") === false
    ) {
      // For 'Other', don't automatically set isExpense, let user choose
    }
  }, [watchedType, form]);

  async function onSubmit(values: FixedEstimateFormValues) {
    try {
      const dataToSave: Omit<
        FixedEstimateRecord,
        "id" | "createdAt" | "userId" | "updatedAt"
      > = {
        type: values.type!,
        recordType: "Fixed Estimate",
        amount: parseFloat(values.amount),
        period: values.period!,
        isExpense:
          values.type === "Salary"
            ? false
            : values.type === "Zakat" || values.type === "Charity"
              ? true
              : values.isExpense!,
      };

      if (values.type === "Other" && values.name) {
        dataToSave.name = values.name;
      } else if (values.type !== "Other") {
        dataToSave.name = values.type; // Use type as name for Salary, Zakat, Charity
      }

      if (mode === "add") {
        await addFixedEstimate(dataToSave);
        toast({
          title: t("fixed_estimate_added"),
          description: `${t(dataToSave.name || dataToSave.type)} ${t("estimate recorded successfully")}.`,
          testId: "success-toast",
        });
      } else if (mode === "edit" && estimate) {
        await updateFixedEstimate(estimate.id, dataToSave); // To be implemented
        toast({
          title: t("fixed_estimate_updated"),
          description: `${t(dataToSave.name || dataToSave.type)} ${t("estimate updated successfully")}.`,
          testId: "edit-success-toast",
        });
      }
      form.reset(initialFormValues);
      router.push("/fixed-estimates");
    } catch (error: any) {
      console.error(t("error_saving_fixed_estimate"), error);
      toast({
        title: `${t("Failed to")} ${mode === "add" ? t("add") : t("Update")} ${t("Estimate")}`,
        description: error.message || t("could_not_save_the_estimate"),
        variant: "destructive",
        testId: "error-toast",
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        data-testid="fixed-estimate-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("estimate_type")}</FormLabel>
                <Select
                  dir={dir}
                  onValueChange={(value) =>
                    field.onChange(value as FixedEstimateType)
                  }
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger data-testid="type-select">
                      <SelectValue placeholder={t("Select estimate type")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fixedEstimateTypes.map((type) => (
                      <SelectItem
                        data-testid={`type-option-${type}`}
                        key={type}
                        value={type}
                      >
                        {t(type)}
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("amount_egp")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 15000"
                    value={field.value}
                    onChange={field.onChange}
                    allowDecimal={true}
                    data-testid="amount-input"
                  />
                </FormControl>
                <FormMessage data-testid="amount-error" />
              </FormItem>
            )}
          />

          {watchedType === "Other" && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name_for_other")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("e.g., Rental Income, Club Membership")}
                      {...field}
                      value={field.value ?? ""}
                      data-testid="name-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("period")}</FormLabel>
                <Select disabled
                  dir={dir}
                  onValueChange={field.onChange}
                  value={field.value || "Monthly"}
                >
                  <FormControl>
                    <SelectTrigger data-testid="period-select">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fixedEstimatePeriods.map((period) => (
                      <SelectItem
                        data-testid={`period-option-${period}`}
                        key={period}
                        value={period}
                      >
                        {t(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedType === "Other" && (
            <FormField
              control={form.control}
              name="isExpense"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="is-expense-checkbox"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("is_this_an_expense")}</FormLabel>
                    <FormDescription>
                      {t(
                        "check_if_this_other_item_is_an_expense_uncheck_if_its_income",
                      )}
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          data-testid="submit-button"
        >
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {mode === "add" ? t("add_estimate") : t("save_changes")}
        </Button>
      </form>
    </Form>
  );
}
