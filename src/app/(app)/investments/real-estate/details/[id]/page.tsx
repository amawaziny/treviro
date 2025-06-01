"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { formatNumberWithSuffix } from "@/lib/utils";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { InstallmentTable } from "@/components/investments/installment-table";

import { generateInstallmentSchedule } from "@/lib/installment-utils";
import type { Installment } from "@/components/investments/installment-table";

export default function RealEstateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { investments, isLoading } = useInvestments();
  const { language } = useLanguage();
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [showPayInstallment, setShowPayInstallment] = useState(false);

  const investment = useMemo(() => {
    if (!params?.id) return null;
    return investments.find(
      (inv) => inv.type === "Real Estate" && inv.id === params.id
    ) as import('@/lib/types').RealEstateInvestment | undefined;
  }, [params?.id, investments]);

  const { updateRealEstateInvestment } = useInvestments();
  const today = new Date(); // Use current date

  // Use the actual paid installments from the investment
  const paidInstallments = investment?.paidInstallments || [];
  const installments: Installment[] = investment ? generateInstallmentSchedule(investment, paidInstallments, today) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading investment...
      </div>
    );
  }

  if (!investment) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardHeader>
          <CardTitle>Real Estate Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No real estate investment found for this ID.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Helper to format date
  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'dd-MM-yyyy');
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="w-full max-w-[calc(100%-16rem)] mx-auto py-8">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{investment.name || investment.propertyAddress}</CardTitle>
          <CardDescription>{investment.propertyType || "N/A"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium text-muted-foreground">Address:</div>
            <div>{investment.propertyAddress || "N/A"}</div>
            <div className="font-medium text-muted-foreground">Amount Invested:</div>
            <div>EGP {formatNumberWithSuffix(investment.amountInvested)}</div>
            <div className="font-medium text-muted-foreground">Installment Amount:</div>
            <div>{investment.installmentAmount ? `EGP ${formatNumberWithSuffix(investment.installmentAmount)}` : 'N/A'}</div>
            <div className="font-medium text-muted-foreground">Installment Frequency:</div>
            <div>{investment.installmentFrequency || 'N/A'}</div>
            <div className="font-medium text-muted-foreground">Total Price at End:</div>
            <div>{investment.totalInstallmentPrice ? `EGP ${formatNumberWithSuffix(investment.totalInstallmentPrice)}` : 'N/A'}</div>
            <div className="font-medium text-muted-foreground">Installment End Date:</div>
            <div>{formatDateDisplay(investment.installmentEndDate)}</div>
          </div>
          {/* Installment Table */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Installment Schedule</h3>
            <InstallmentTable
              installments={installments}
              investmentId={params.id as string}
              investment={investment}
              updateRealEstateInvestment={updateRealEstateInvestment}
              paidInstallments={paidInstallments}
            />
          </div>
          {/* Future: List of installments, paid/unpaid, etc. */}
          <div className="mt-6 flex gap-4">
            <Button variant="outline" onClick={() => setShowAddInstallment(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Future Installment
            </Button>
            <Button variant="default" onClick={() => setShowPayInstallment(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Paid Installment
            </Button>
          </div>
          {/* TODO: Add dialogs/forms for adding installments */}
        </CardContent>
      </Card>
    </div>
  );
}
