
"use client";

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
import { NumericInput } from "@/components/ui/numeric-input";
import { MonthlySettingsSchema, type MonthlySettingsFormValues } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import React, { useEffect } from "react";
import type { MonthlySettings } from "@/lib/types";

interface FinancialSettingsFormProps {
  currentSettings: MonthlySettings | null;
  onSave?: () => void; // Optional callback after saving
}

export function FinancialSettingsForm({ currentSettings, onSave }: FinancialSettingsFormProps) {
  const { updateMonthlySettings } = useInvestments();
  const { toast } = useToast();

  const form = useForm<MonthlySettingsFormValues>({
    resolver: zodResolver(MonthlySettingsSchema),
    defaultValues: {
      estimatedLivingExpenses: currentSettings?.estimatedLivingExpenses?.toString() ?? "",
      estimatedZakat: currentSettings?.estimatedZakat?.toString() ?? "",
      estimatedCharity: currentSettings?.estimatedCharity?.toString() ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      estimatedLivingExpenses: currentSettings?.estimatedLivingExpenses?.toString() ?? "",
      estimatedZakat: currentSettings?.estimatedZakat?.toString() ?? "",
      estimatedCharity: currentSettings?.estimatedCharity?.toString() ?? "",
    });
  }, [currentSettings, form]);

  async function onSubmit(values: MonthlySettingsFormValues) {
    try {
      const settingsToSave: MonthlySettings = {
        estimatedLivingExpenses: values.estimatedLivingExpenses ? parseFloat(values.estimatedLivingExpenses) : undefined,
        estimatedZakat: values.estimatedZakat ? parseFloat(values.estimatedZakat) : undefined,
        estimatedCharity: values.estimatedCharity ? parseFloat(values.estimatedCharity) : undefined,
      };
      await updateMonthlySettings(settingsToSave);
      toast({
        title: "Settings Updated",
        description: "Your monthly estimates have been saved.",
      });
      onSave?.();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not save settings.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="estimatedLivingExpenses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Monthly Living Expenses (EGP)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 10000"
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>Your general recurring monthly household expenses.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimatedZakat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Monthly Zakat (EGP)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 200"
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>Your estimated monthly Zakat contribution.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimatedCharity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Monthly Charity (EGP)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 100"
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>Your estimated regular monthly charity contributions.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Estimates
        </Button>
      </form>
    </Form>
  );
}
