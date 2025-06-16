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
import {
  AddExpenseSchema,
  type AddExpenseFormValues,
  expenseCategories,
} from "@/lib/schemas";
import { useInvestments } from "@/hooks/use-investments";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseRecord } from "@/lib/types";
import { getCurrentDate } from "@/lib/utils";
import { useEffect } from "react";

const initialFormValues: AddExpenseFormValues = {
  category: "Other",
  description: "",
  //@ts-expect-error
  amount: "",
  date: getCurrentDate(),
  isInstallment: false,
  //@ts-expect-error
  numberOfInstallments: "",
};

export interface AddExpenseFormProps {
  initialValues?: Partial<AddExpenseFormValues>;
  onSubmit?: (values: AddExpenseFormValues) => Promise<void>;
  isEditMode?: boolean;
}

export function AddExpenseForm({
  initialValues,
  onSubmit,
  isEditMode,
}: AddExpenseFormProps) {
  const { t: t } = useLanguage();
  const { addExpenseRecord } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();
  const { setHeaderProps, openForm, closeForm } = useForm();

  const form = useReactHookForm<AddExpenseFormValues>({
    resolver: zodResolver(AddExpenseSchema),
    defaultValues: initialValues ?? initialFormValues,
  });

  useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: isEditMode
        ? t("edit_expense_record")
        : t("add_new_expense_record"),
      description: t(
        "log_your_expenses_like_installments_credit_card_payments_subscriptions_or_other_spending",
      ),
      backLabel: t("back_to_expenses"),
      backHref: "/expenses",
    });

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [setHeaderProps, closeForm, openForm, isEditMode, t]);

  const watchedCategory = form.watch("category");
  const watchedIsInstallment = form.watch("isInstallment");

  async function handleInternalSubmit(values: AddExpenseFormValues) {
    try {
      // Zod schema already coerces amount and numberOfInstallments to numbers or undefined if empty.
      // It also ensures numberOfInstallments is a positive int if isInstallment is true.
      const expenseDataToSave: Omit<
        ExpenseRecord,
        "id" | "createdAt" | "userId"
      > = {
        category: values.category!,
        amount: values.amount, // Zod has coerced this to number
        date: values.date,
      };

      if (values.description && values.description.trim() !== "") {
        expenseDataToSave.description = values.description;
      }

      if (values.category === "Credit Card") {
        expenseDataToSave.isInstallment = values.isInstallment;
        if (values.isInstallment && values.numberOfInstallments) {
          // Zod ensures values.numberOfInstallments is a number here if isInstallment is true
          expenseDataToSave.numberOfInstallments = values.numberOfInstallments;
        }
      }

      await addExpenseRecord(expenseDataToSave);
      toast({
        title: t("expense_record_added"),
        description: `${values.category} ${t("expense of")} ${values.amount} EGP ${t("recorded successfully")}.`,
      });
      form.reset(initialFormValues);
      router.push("/expenses");
    } catch (error: any) {
      console.error(t("error_adding_expense_record"), error);
      toast({
        title: t("failed_to_add_expense"),
        description: error.message || t("could_not_save_the_expense_record"),
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit ? onSubmit : handleInternalSubmit)}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("expense_category")}</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== "Credit Card") {
                      form.setValue("isInstallment", false);
                      form.setValue("numberOfInstallments", 0);
                    }
                  }}
                  value={field.value || ""}
                  // required // Zod schema handles required
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_expense_category")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expenseCategories.map((category) => (
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
                <FormLabel>{t("amount_egp")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder={t(
                      "e.g., 500.00 or 3000.00 for total installment",
                    )}
                    value={
                      field.value === undefined || field.value === null
                        ? ""
                        : String(field.value)
                    } // ensure value is always a string
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
                <FormLabel>{t("description_optional")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t(
                      "e.g., Monthly electricity bill, New TV (installment)",
                    )}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedCategory === "Credit Card" && (
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
                            form.setValue("numberOfInstallments", 0);
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("is_this_an_installment_plan")}</FormLabel>
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
                      <FormLabel>{t("number_of_months")}</FormLabel>
                      <FormControl>
                        <NumericInput
                          placeholder="e.g., 3, 6, 12"
                          value={
                            field.value !== undefined
                              ? field.value.toString()
                              : ""
                          } // always pass string to NumericInput
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
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEditMode ? t("update_expense_record") : t("add_expense_record")}
        </Button>
      </form>
    </Form>
  );
}
