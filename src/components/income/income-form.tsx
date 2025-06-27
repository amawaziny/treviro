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
  IncomeSchema,
  type IncomeFormValues,
  incomeTypes,
} from "@/lib/schemas";
import { Loader2 } from "lucide-react";
import { getCurrentDate } from "@/lib/utils";

const initialFormValues: IncomeFormValues = {
  type: "Profit Share",
  source: "",
  //@ts-expect-error
  amount: "",
  date: getCurrentDate(),
  description: "",
};

type IncomeFormProps = {
  initialValues?: Partial<IncomeFormValues>;
  onSubmit: (values: IncomeFormValues) => void | Promise<void>;
  isEditMode?: boolean;
};

export function IncomeForm({
  initialValues,
  onSubmit,
  isEditMode = false,
}: IncomeFormProps) {
  const { t, dir } = useLanguage();

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(IncomeSchema),
    defaultValues: initialValues ?? initialFormValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("income_type")}</FormLabel>
                <Select dir={dir}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select income type")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {incomeTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(type)}
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
