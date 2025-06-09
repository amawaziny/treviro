"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { EditStockInvestmentForm } from "@/components/investments/stocks/edit-stock-investment-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";

export default function EditStockInvestmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { investments, updateStockInvestment, isLoading } = useInvestments();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Find the investment by id
  const investmentToEdit = investments.find((inv) => inv.id === id && inv.type === "Stocks") as import('@/lib/types').StockInvestment | undefined;

  if (!investmentToEdit) {
    return notFound();
  }

  const pageTitle = `Edit Purchase: ${investmentToEdit?.name ?? investmentToEdit?.tickerSymbol ?? 'Stock'}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <CardDescription>Modify the details of this stock purchase.</CardDescription>
      </CardHeader>
      <CardContent>
        <EditStockInvestmentForm investmentId={investmentToEdit.id} />
      </CardContent>
    </Card>
  );
}
