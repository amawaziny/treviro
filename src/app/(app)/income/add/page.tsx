"use client";

import { AddIncomeForm } from "@/components/income/add-income-form";
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

export default function AddIncomePage() {
  const { language } = useLanguage();
  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/income">
          <BackArrowIcon
            className={language === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"}
          />
          Back to Income Records
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Add New Income Record</CardTitle>
          <CardDescription>
            Log your salary, profit shares, or other cash inflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddIncomeForm />
        </CardContent>
      </Card>
    </div>
  );
}
