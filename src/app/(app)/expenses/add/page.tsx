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
  const { language } = useLanguage();
  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/expenses">
          <BackArrowIcon
            className={language === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"}
          />
          Back to Expenses
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Add New Expense Record</CardTitle>
          <CardDescription>
            Log your expenses like installments, credit card payments,
            subscriptions, or other spending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddExpenseForm />
        </CardContent>
      </Card>
    </div>
  );
}
