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
  ExpenseFormSchema,
  type ExpenseFormValues as ExpenseFormValues,
  expenseCategories,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getCurrentDate } from "@/lib/utils";
import { useEffect } from "react";

const initialFormValues: ExpenseFormValues = {
  category: "Other",
  description: "",
  //@ts-expect-error
  amount: "",
  date: getCurrentDate(),
  isInstallment: false,
  //@ts-expect-error
  numberOfInstallments: "",
};

export interface ExpenseFormProps {
  initialValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  isEditMode?: boolean;
}

export function ExpenseForm({
  initialValues,
  onSubmit,
  isEditMode,
}: ExpenseFormProps) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const { setHeaderProps, openForm, closeForm } = useForm();

  const form = useReactHookForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormSchema),
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

  const handleInternalSubmit = async (values: ExpenseFormValues) => {
    try {
      await onSubmit(values);

      toast({
        title: t("expense_record_saved"),
        description: `${values.category} ${t("expense of")} ${values.amount} EGP ${t("recorded successfully")}.`,
        testId: isEditMode ? "edit-success-toast" : "success-toast",
      });

      form.reset(initialFormValues);
      router.push("/expenses");
    } catch (error: any) {
      toast({
        title: t("failed_to_save_expense"),
        description: error.message || t("could_not_save_the_expense_record"),
        variant: "destructive",
        testId: isEditMode ? "edit-error-toast" : "error-toast",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        data-testid="expense-form"
        onSubmit={form.handleSubmit(handleInternalSubmit)}
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
                  dir={dir}
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
                    <SelectTrigger data-testid="category-select">
                      <SelectValue
                        placeholder={t("select_expense_category")}
                        data-testid="category-value"
                      />
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
                    data-testid="amount-input"
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
                    min={1}
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
                    data-testid="date-input"
                    value={field.value || ""}
                    onChange={field.onChange}
                    max={getCurrentDate()}
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
                    data-testid="description-input"
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
                        id="isInstallment"
                        data-testid="installment-checkbox"
                        checked={field.value}
                        onCheckedChange={field.onChange}
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
                          data-testid="installments-input"
                          placeholder="e.g., 3, 6, 12"
                          value={
                            field.value === undefined || field.value === null
                              ? ""
                              : String(field.value)
                          }
                          onChange={field.onChange}
                          allowDecimal={false}
                          min={1}
                        />
                      </FormControl>
                      <FormMessage data-testid="installments-error" />
                    </FormItem>
                  )}
                />
              )}
            </>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
          data-testid="submit-button"
        >
          {form.formState.isSubmitting && (
            <Loader2
              className="mr-2 h-4 w-4 animate-spin"
              data-testid="loading-spinner"
            />
          )}
          <span data-testid="submit-button-text">
            {isEditMode ? t("update_expense") : t("add_expense")}
          </span>
        </Button>
      </form>
    </Form>
  );
}
