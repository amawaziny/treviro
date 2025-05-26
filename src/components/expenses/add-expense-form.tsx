
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AddExpenseSchema, type AddExpenseFormValues, expenseCategories } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseRecord } from "@/lib/types";

const getCurrentDate = () => {
  return format(new Date(), "yyyy-MM-dd");
};

const initialFormValues: AddExpenseFormValues = {
  category: undefined,
  description: "",
  amount: "",
  date: getCurrentDate(),
  isInstallment: false,
  numberOfInstallments: "",
};

export function AddExpenseForm() {
  const { addExpenseRecord } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(AddExpenseSchema),
    defaultValues: initialFormValues,
  });

  const watchedCategory = form.watch("category");
  const watchedIsInstallment = form.watch("isInstallment");

  async function onSubmit(values: AddExpenseFormValues) {
    try {
      // Zod schema already coerces amount and numberOfInstallments to numbers or undefined if empty.
      // It also ensures numberOfInstallments is a positive int if isInstallment is true.
      const expenseDataToSave: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'> = {
        category: values.category!,
        amount: values.amount, // Zod has coerced this to number
        date: values.date,
      };

      if (values.description && values.description.trim() !== "") {
        expenseDataToSave.description = values.description;
      }

      if (values.category === 'Credit Card') {
        expenseDataToSave.isInstallment = values.isInstallment;
        if (values.isInstallment && values.numberOfInstallments) {
          // Zod ensures values.numberOfInstallments is a number here if isInstallment is true
          expenseDataToSave.numberOfInstallments = values.numberOfInstallments;
        }
      }

      await addExpenseRecord(expenseDataToSave);
      toast({
        title: "Expense Record Added",
        description: `${values.category} expense of ${values.amount} EGP recorded successfully.`,
      });
      form.reset(initialFormValues);
      router.push("/expenses");
    } catch (error: any) {
      console.error("Error adding expense record:", error);
      toast({
        title: "Failed to Add Expense",
        description: error.message || "Could not save the expense record.",
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expense Category</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== 'Credit Card') {
                      form.setValue('isInstallment', false);
                      form.setValue('numberOfInstallments', '');
                    }
                  }}
                  value={field.value || ""}
                  // required // Zod schema handles required
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
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
                    placeholder="e.g., 500.00 or 3000.00 for total installment"
                    value={field.value} // field.value is string from RHF
                    onChange={field.onChange} // RHF onChange expects string or number
                    allowDecimal={true}
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
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || getCurrentDate()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Monthly electricity bill, New TV (installment)" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedCategory === 'Credit Card' && (
            <>
              <FormField
                control={form.control}
                name="isInstallment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                           field.onChange(checked);
                           if (!checked) {
                               form.setValue('numberOfInstallments', '');
                           }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Is this an installment plan?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {watchedIsInstallment && (
                <FormField
                  control={form.control}
                  name="numberOfInstallments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Months</FormLabel>
                      <FormControl>
                        <NumericInput
                          placeholder="e.g., 3, 6, 12"
                          value={field.value} // field.value is string from RHF
                          onChange={field.onChange} // RHF onChange expects string or number
                          allowDecimal={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </>
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Expense Record
        </Button>
      </form>
    </Form>
  );
}
