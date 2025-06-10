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
import {
  AddIncomeSchema,
  type AddIncomeFormValues,
  incomeTypes,
} from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments"; // To access addIncomeRecord
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { IncomeRecord } from "@/lib/types";

const getCurrentDate = () => {
  return format(new Date(), "yyyy-MM-dd");
};

const initialFormValues: AddIncomeFormValues = {
  type: undefined,
  source: "",
  amount: "",
  date: getCurrentDate(),
  description: "",
};

export function AddIncomeForm() {
  const { addIncomeRecord } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AddIncomeFormValues>({
    resolver: zodResolver(AddIncomeSchema),
    defaultValues: initialFormValues,
  });

  async function onSubmit(values: AddIncomeFormValues) {
    try {
      const incomeDataToSave: Omit<
        IncomeRecord,
        "id" | "createdAt" | "userId"
      > = {
        type: values.type!, // Zod ensures type is valid and present
        amount: values.amount, // Zod has coerced this to number
        date: values.date, // Zod ensures date is valid
      };

      if (values.source && values.source.trim() !== "") {
        incomeDataToSave.source = values.source;
      }
      if (values.description && values.description.trim() !== "") {
        incomeDataToSave.description = values.description;
      }

      await addIncomeRecord(incomeDataToSave);
      toast({
        title: "Income Record Added",
        description: `${values.type} of ${values.amount} EGP recorded successfully.`,
      });
      form.reset(initialFormValues);
      router.push("/income");
    } catch (error: any) {
      console.error("Error adding income record:", error);
      toast({
        title: "Failed to Add Income",
        description: error.message || "Could not save the income record.",
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
                <FormLabel>Income Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select income type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {incomeTypes.map(
                      (
                        type, // incomeTypes from schema no longer contains 'Salary'
                      ) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Company XYZ, Project ABC"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
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
                    placeholder="e.g., 5000.00"
                    value={field.value}
                    onChange={field.onChange}
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
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Q3 Profit Share, Freelance Project X"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Add Income Record
        </Button>
      </form>
    </Form>
  );
}
