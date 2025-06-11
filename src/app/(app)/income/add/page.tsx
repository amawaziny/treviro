"use client";

import { AddIncomeForm } from "@/components/income/add-income-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";
import { useForm } from "@/contexts/form-context";

export default function AddIncomePage() {
  const { setHeaderProps, openForm, closeForm } = useForm();

  useEffect(() => {
    openForm();
    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: "Add Income",
      backHref: "/income",
      backLabel: "Back to Income Records",
    });
    return () => {
      closeForm();
    };
  }, [setHeaderProps, openForm, closeForm]);

  return (
    <div className="container mx-auto py-4 space-y-6">
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
