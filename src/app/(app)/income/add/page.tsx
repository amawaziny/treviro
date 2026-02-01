"use client";
import { useLanguage } from "@/contexts/language-context";

import { IncomeForm } from "@/components/income/income-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useMemo } from "react";
import { useForm } from "@/contexts/form-context";
import { IncomeFormValues } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { IncomeRecord } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useFinancialRecords } from "@/hooks/use-financial-records";
import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { getCurrentDate } from "@/lib/utils";

const initialFormValues: IncomeFormValues = {
  type: "Profit Share",
  source: "",
  amount: 0,
  date: getCurrentDate(),
  description: "",
};

export default function AddIncomePage() {
  const { t } = useLanguage();
  const { setHeaderProps, openForm, closeForm } = useForm();

  const { addIncome } = useFinancialRecords();
  const { toast } = useToast();
  const router = useRouter();

  async function onSubmit(values: IncomeFormValues) {
    try {
      const incomeDataToSave: Omit<
        IncomeRecord,
        "id" | "createdAt" | "recordType"
      > = {
        type: values.type!, // Zod ensures type is valid and present
        amount: values.amount, // Zod has coerced this to number
        date: new Date(values.date), // Zod ensures date is valid
      };

      if (values.source && values.source.trim() !== "") {
        incomeDataToSave.source = values.source;
      }
      if (values.description && values.description.trim() !== "") {
        incomeDataToSave.description = values.description;
      }

      await addIncome(incomeDataToSave);
      toast({
        title: t("income_record_added"),
        description: `${t(values.type)} ${t("of")} ${values.amount} EGP ${t("recorded successfully")}.`,
      });
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

  useEffect(() => {
    openForm();
    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: t("add_income"),
      backHref: "/income",
      backLabel: t("back_to_income_records"),
    });
    return () => {
      closeForm();
    };
  }, [setHeaderProps, openForm, closeForm]);

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("add_new_income_record")}</CardTitle>
          <CardDescription>
            {t("log_your_salary_profit_shares_or_other_cash_inflows")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeForm onSubmit={onSubmit} initialValues={initialFormValues} />
        </CardContent>
      </Card>
    </div>
  );
}
