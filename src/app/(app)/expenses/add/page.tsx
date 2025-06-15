"use client";

import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export default function AddExpensePage() {
  const { t: t } = useLanguage();
  const { language } = useLanguage();
  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("add_new_expense_record")}</CardTitle>
          <CardDescription>
            {t(
              "log_your_expenses_like_installments_credit_card_payments_subscriptions_or_other_spending",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddExpenseForm />
        </CardContent>
      </Card>
    </div>
  );
}
