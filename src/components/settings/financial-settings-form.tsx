
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
  FormDescription
} from "@/components/ui/form";
import { NumericInput } from "@/components/ui/numeric-input";
import { MonthlySettingsSchema, type MonthlySettingsFormValues } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export function FinancialSettingsForm() {
  const { monthlySettings, updateMonthlySettings, isLoading: isLoadingContext } = useInvestments();
  const { toast } = useToast();

  const form = useForm<MonthlySettingsFormValues>({
    resolver: zodResolver(MonthlySettingsSchema),
    defaultValues: {
      estimatedLivingExpenses: "",
      estimatedZakat: "",
      estimatedCharity: "",
    },
  });

  useEffect(() => {
    if (monthlySettings && !isLoadingContext) {
      form.reset({
        estimatedLivingExpenses: String(monthlySettings.estimatedLivingExpenses ?? ""),
        estimatedZakat: String(monthlySettings.estimatedZakat ?? ""),
        estimatedCharity: String(monthlySettings.estimatedCharity ?? ""),
      });
    }
  }, [monthlySettings, isLoadingContext, form]);

  async function onSubmit(values: MonthlySettingsFormValues) {
    try {
      const newSettings = {
        estimatedLivingExpenses: parseFloat(values.estimatedLivingExpenses),
        estimatedZakat: values.estimatedZakat ? parseFloat(values.estimatedZakat) : undefined,
        estimatedCharity: values.estimatedCharity ? parseFloat(values.estimatedCharity) : undefined,
      };
      await updateMonthlySettings(newSettings);
      toast({
        title: "Settings Updated",
        description: "Your financial settings have been saved.",
      });
    } catch (error: any) {
      console.error("Error updating financial settings:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not save financial settings.",
        variant: "destructive",
      });
    }
  }

  if (isLoadingContext && !monthlySettings) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading settings...
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormField
          control={form.control}
          name="estimatedLivingExpenses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Estimated Monthly Living Expenses (EGP)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 15000.00"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                Estimate your typical monthly spending on essentials like rent, utilities, groceries, transport, etc.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimatedZakat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Monthly Zakat (EGP - Optional)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 200.00"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                If you set aside a monthly amount for Zakat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimatedCharity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Monthly Charity (EGP - Optional)</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 100.00"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                Any regular monthly charitable contributions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </form>
    </Form>
  );
}
