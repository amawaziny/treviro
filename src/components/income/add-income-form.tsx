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
import type { IncomeRecord } from "@/lib/types";
import { getCurrentDate } from "@/lib/utils";

const initialFormValues: AddIncomeFormValues = {
  type: "Profit Share",
  source: "",
  //@ts-expect-error
  amount: "",
  date: getCurrentDate(),
  description: "",
};

type AddIncomeFormProps = {
  initialValues?: Partial<AddIncomeFormValues>;
  onSubmit?: (values: AddIncomeFormValues) => void | Promise<void>;
  isEditMode?: boolean;
};

export function AddIncomeForm({
  initialValues,
  onSubmit,
  isEditMode = false,
}: AddIncomeFormProps) {
  const { t } = useLanguage();
  const { addIncomeRecord } = useInvestments();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AddIncomeFormValues>({
    resolver: zodResolver(AddIncomeSchema),
    defaultValues: initialValues ?? initialFormValues,
  });

  async function internalOnSubmit(values: AddIncomeFormValues) {
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
        title: t("income_record_added"),
        description: `${values.type} ${t("of")} ${values.amount} EGP ${t("recorded successfully")}.`,
      });
      form.reset(initialFormValues);
      router.push("/income");
    } catch (error: any) {
      console.error(t("error_adding_income_record"), error);
      toast({
        title: t("failed_to_add_income"),
        description: error.message || t("could_not_save_the_income_record"),
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit ? onSubmit : internalOnSubmit)}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("income_type")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select income type")} />
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
                <FormLabel>{t("source_optional")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("e.g., Company XYZ, Project ABC")}
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
                <FormLabel>{t("amount_egp")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 5000.00"
                    value={field.value?.toString() ?? ""}
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
                <FormLabel>{t("Date")}</FormLabel>
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
                      "e.g., Q3 Profit Share, Freelance Project X",
                    )}
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
          {isEditMode ? t("update_income_record") : t("add_income_record")}
        </Button>
      </form>
    </Form>
  );
}
