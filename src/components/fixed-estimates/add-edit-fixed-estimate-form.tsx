
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
import { FixedEstimateSchema, type FixedEstimateFormValues, fixedEstimateTypes, fixedEstimatePeriods } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { FixedEstimateRecord, FixedEstimateType } from "@/lib/types";
import React, { useEffect } from "react";

interface AddEditFixedEstimateFormProps {
  mode: 'add' | 'edit';
  estimate?: FixedEstimateRecord; // Provided in 'edit' mode
}

const initialFormValues: FixedEstimateFormValues = {
  type: undefined,
  name: "",
  amount: "",
  period: 'Monthly',
  isExpense: undefined,
};

export function AddEditFixedEstimateForm({ mode, estimate }: AddEditFixedEstimateFormProps) {
  const { addFixedEstimate } = useInvestments(); // Add updateFixedEstimate later
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FixedEstimateFormValues>({
    resolver: zodResolver(FixedEstimateSchema),
    defaultValues: mode === 'edit' && estimate ? 
      {
        type: estimate.type,
        name: estimate.name ?? "",
        amount: estimate.amount.toString(),
        period: estimate.period,
        isExpense: estimate.isExpense,
      } : 
      initialFormValues,
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    if (watchedType && watchedType !== 'Other') {
      form.setValue('name', ''); // Clear name if type is not 'Other'
      if (watchedType === 'Salary') {
        form.setValue('isExpense', false);
      } else if (watchedType === 'Zakat' || watchedType === 'Charity') {
        form.setValue('isExpense', true);
      }
    } else if (watchedType === 'Other' && form.getValues('isExpense') === undefined) {
        // For 'Other', don't automatically set isExpense, let user choose
    }
  }, [watchedType, form]);

  async function onSubmit(values: FixedEstimateFormValues) {
    try {
      const dataToSave: Omit<FixedEstimateRecord, 'id' | 'createdAt' | 'userId' | 'updatedAt'> = {
        type: values.type!,
        amount: parseFloat(values.amount),
        period: values.period!,
        isExpense: values.type === 'Salary' ? false : values.type === 'Zakat' || values.type === 'Charity' ? true : values.isExpense!,
      };

      if (values.type === 'Other' && values.name) {
        dataToSave.name = values.name;
      } else if (values.type !== 'Other') {
        dataToSave.name = values.type; // Use type as name for Salary, Zakat, Charity
      }


      if (mode === 'add') {
        await addFixedEstimate(dataToSave);
        toast({
          title: "Fixed Estimate Added",
          description: `${dataToSave.name || dataToSave.type} estimate recorded successfully.`,
        });
      } else if (mode === 'edit' && estimate) {
        // await updateFixedEstimate(estimate.id, dataToSave); // To be implemented
        toast({
          title: "Fixed Estimate Updated",
          description: `${dataToSave.name || dataToSave.type} estimate updated successfully.`,
        });
      }
      form.reset(initialFormValues);
      router.push("/fixed-estimates");
    } catch (error: any) {
      console.error("Error saving fixed estimate:", error);
      toast({
        title: `Failed to ${mode === 'add' ? 'Add' : 'Update'} Estimate`,
        description: error.message || "Could not save the estimate.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimate Type</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value as FixedEstimateType)}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select estimate type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fixedEstimateTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
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
                <FormLabel>Amount (EGP)</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 15000"
                    value={field.value}
                    onChange={field.onChange}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {watchedType === 'Other' && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name for 'Other'</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rental Income, Club Membership" {...field} value={field.value ?? ''} />
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
                <FormLabel>Period</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || "Monthly"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fixedEstimatePeriods.map(period => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedType === 'Other' && (
             <FormField
              control={form.control}
              name="isExpense"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Is this an Expense?
                    </FormLabel>
                    <FormDescription>
                      Check if this 'Other' item is an expense. Uncheck if it's income.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'add' ? 'Add Estimate' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
