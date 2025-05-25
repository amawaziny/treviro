
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
import { AddExpenseSchema, type AddExpenseFormValues, expenseCategories } from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const getCurrentDate = () => {
  return format(new Date(), "yyyy-MM-dd");
};

const initialFormValues: AddExpenseFormValues = {
  category: undefined,
  description: "",
  amount: "",
  date: getCurrentDate(),
};

export function AddExpenseForm() {
  const { addExpenseRecord } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(AddExpenseSchema),
    defaultValues: initialFormValues,
  });

  async function onSubmit(values: AddExpenseFormValues) {
    try {
      const expenseDataToSave = {
        ...values,
        amount: parseFloat(values.amount), // Schema coerces string to number
      };

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
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  required
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
                    placeholder="e.g., 500.00"
                    value={field.value} // field.value is string from react-hook-form
                    onChange={field.onChange} // field.onChange expects string
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Monthly electricity bill, Netflix subscription" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Expense Record
        </Button>
      </form>
    </Form>
  );
}
