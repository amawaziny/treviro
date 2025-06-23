"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { useForm } from "@/contexts/form-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrencyWithCommas, formatDateDisplay, formatNumberForMobile, formatNumberWithSuffix } from "@/lib/utils";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { InstallmentTable } from "@/components/investments/real-estate/installment-table";
import { generateInstallmentSchedule } from "@/lib/installment-utils";
import type { Installment } from "@/components/investments/real-estate/installment-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { RealEstateInvestment } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export default function RealEstateDetailPage() {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const router = useRouter();
  const params = useParams();
  const { setHeaderProps, closeForm, openForm } = useForm();
  const { investments, isLoading, updateRealEstateInvestment } =
    useInvestments();
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({
    dueDate: new Date(),
    amount: 0,
    description: "",
  } as { dueDate: Date | undefined; amount: number; description: string });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const investment = useMemo(() => {
    if (!params?.id) return null;
    return investments.find(
      (inv) => inv.type === "Real Estate" && inv.id === params.id,
    ) as RealEstateInvestment | undefined;
  }, [params?.id, investments]);

  useEffect(() => {
    // Open form when component mounts
    openForm();

    if (investment) {
      const title = investment.name;
      setHeaderProps({
        showBackButton: true,
        backHref: "/investments/real-estate",
        title: title,
        showNavControls: false,
      });
    }

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [investment, setHeaderProps, openForm, closeForm]);

  const [installments, setInstallments] = useState<Installment[]>([]);

  useEffect(() => {
    if (!investment) return;

    setInstallments(investment.installments || []);
  }, [investment]);

  const handleDeleteInstallment = async (installmentNumber: number) => {
    try {
      if (!investment) {
        toast({
          title: "Error",
          description: t("investment_not_found"),
          variant: "destructive",
        });
        return;
      }

      const updatedInstallments = installments.filter(
        (inst) => inst.number !== installmentNumber,
      );

      await updateRealEstateInvestment(investment.id, {
        installments: updatedInstallments,
      });
      // setInstallments(updatedInstallments); // Local state will be updated by useEffect
      toast({
        title: t("success"),
        description: t("payment_deleted_successfully"),
      });
    } catch (error) {
      console.error(t("error_deleting_payment"), error);
      toast({
        title: t("error"),
        description: t("failed_to_delete_payment"),
        variant: "destructive",
      });
    }
  };

  const handleAddPayment = async () => {
    if (!investment) return;
    try {
      setIsSubmitting(true);
      const maxExistingNumber =
        installments.length > 0
          ? Math.max(...installments.map((i) => i.number), 0)
          : 0;
      const nextNumber = maxExistingNumber + 1;

      const newPaymentObj: Installment = {
        number: nextNumber,
        dueDate: newPayment.dueDate?.toISOString().split("T")[0] || "", // Format as YYYY-MM-DD
        amount: Number(newPayment.amount) || 0,
        status: "Unpaid",
        description: newPayment.description.trim() || undefined,
        isMaintenance: newPayment.description
          .toLowerCase()
          .includes("maintenance"), // Basic heuristic
      };

      const updatedInstallments = [
        ...(investment.installments || []),
        newPaymentObj,
      ];

      await updateRealEstateInvestment(investment.id, {
        installments: updatedInstallments,
      });

      toast({
        title: t("success"),
        description: `${t("payment")} #${nextNumber} ${t("has_been_added")}.`,
      });
      setNewPayment({ dueDate: new Date(), amount: 0, description: "" });
      setShowAddPaymentDialog(false);
    } catch (error) {
      console.error(t("error_adding_payment"), error);
      toast({
        title: t("error"),
        description: t("failed_to_add_payment"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        {t("loading_investment")}
      </div>
    );
  }

  if (!investment) {
    return (
      <Card className="w-full mt-10">
        <CardHeader>
          <CardTitle>{t("real_estate_not_found")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("no_real_estate_investment_found_for_this_id")}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("back")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {investment.name || investment.propertyAddress}
          </CardTitle>
          <CardDescription>
            {investment.propertyType || t("na")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium text-muted-foreground">
              {t("address")}
            </div>
            <div>{investment.propertyAddress || t("na")}</div>
            <div className="font-medium text-muted-foreground">
              {t("paid_towards_purchase")}
            </div>
            <div>{formatNumberForMobile(isMobile, investment.amountInvested)}</div>
            <div className="font-medium text-muted-foreground">
              {t("installment_amount")}
            </div>
            <div>
              {investment.installmentAmount
                ? formatNumberForMobile(isMobile, investment.installmentAmount)
                : t("na")}
            </div>
            <div className="font-medium text-muted-foreground">
              {t("installment_frequency")}
            </div>
            <div>{t(investment.installmentFrequency || "na")}</div>
            <div className="font-medium text-muted-foreground">
              {t("total_price_at_end")}
            </div>
            <div>
              {investment.totalInstallmentPrice
                ? formatNumberForMobile(isMobile, investment.totalInstallmentPrice)
                : t("na")}
            </div>
            <div className="font-medium text-muted-foreground">
              {t("installment_end_date")}
            </div>
            <div>{formatDateDisplay(investment.installmentEndDate)}</div>
            {investment.maintenanceAmount &&
              investment.maintenancePaymentDate && (
                <>
                  <div className="font-medium text-muted-foreground">
                    {t("maintenance_payment")}
                  </div>
                  <div>
                    {`${formatNumberForMobile(isMobile, investment.maintenanceAmount)} - ${formatDateDisplay(investment.maintenancePaymentDate)}`}
                  </div>
                </>
              )}
          </div>
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">{t("payment_schedule")}</h3>
              <Button onClick={() => setShowAddPaymentDialog(true)}>
                <Plus className="h-4 w-4" />
                {t("add_payment")}
              </Button>
            </div>
            <div className="mt-4">
              <InstallmentTable
                installments={installments}
                investmentId={investment.id}
                investment={investment}
                updateRealEstateInvestment={updateRealEstateInvestment}
                onDeleteInstallment={handleDeleteInstallment}
              />
            </div>
          </div>
          <Sheet
            open={showAddPaymentDialog}
            onOpenChange={setShowAddPaymentDialog}
          >
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{t("add_payment")}</SheetTitle>
                <SheetDescription>
                  {t("add_a_new_future_payment_to_the_schedule")}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-2 py-4">
                  <Label htmlFor="dueDate">
                    {t("due_date")}
                  </Label>
                  <div className="col-span-1">
                    <Input
                      id="dueDate"
                      type="date"
                      value={
                        newPayment.dueDate?.toISOString().split("T")[0] || ""
                      }
                      onChange={(e) => {
                        const date = e.target.value
                          ? new Date(e.target.value)
                          : undefined;
                        setNewPayment({ ...newPayment, dueDate: date });
                      }}
                    />
                  </div>
                  <Label htmlFor="amount">
                    {t("amount")}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newPayment.amount || ""}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <Label htmlFor="description" className="pt-2">
                    {t("description")}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t("Optional: e.g., Q4 payment, Final finishing payment, Maintenance")}
                    value={newPayment.description}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        description: e.target.value,
                      })
                    }
                  />
              </div>
              <SheetFooter>
                <div className="flex flex-row-reverse gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddPaymentDialog(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    disabled={
                      isSubmitting || !newPayment.amount || !newPayment.dueDate
                    }
                    onClick={handleAddPayment}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("adding")}
                      </>
                    ) : (
                      t("add_payment")
                    )}
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>
    </div>
  );
}
