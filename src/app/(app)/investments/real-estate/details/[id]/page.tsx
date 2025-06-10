
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { useForm } from "@/contexts/form-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { formatNumberWithSuffix } from "@/lib/utils";
import { Loader2, ArrowLeft, Plus, Calendar as CalendarIcon } from "lucide-react";
import { InstallmentTable } from "@/components/investments/real-estate/installment-table";
import { generateInstallmentSchedule } from "@/lib/installment-utils";
import type { Installment } from "@/components/investments/real-estate/installment-table";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

export default function RealEstateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { setHeaderProps } = useForm();
  const { investments, isLoading, updateRealEstateInvestment } = useInvestments();
  const { language } = useLanguage();
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({
    dueDate: new Date(),
    amount: 0,
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { toast } = useToast();

  const investment = useMemo(() => {
    if (!params?.id) return null;
    return investments.find(
      (inv) => inv.type === "Real Estate" && inv.id === params.id
    ) as import('@/lib/types').RealEstateInvestment | undefined;
  }, [params?.id, investments]);

  useEffect(() => {
    if (investment) {
      const title = language === 'ar' ? investment.name : investment.name;
      setHeaderProps({
        showBackButton: true,
        backHref: '/investments/real-estate',
        title: title,
        showNavControls: false
      });
    }
  }, [investment, language, setHeaderProps]);

  const today = useMemo(() => new Date(), []);
  const [installments, setInstallments] = useState<Installment[]>([]);

  useEffect(() => {
    if (!investment) return;

    let currentInstallments: Installment[] = [];

    if (investment.installments && investment.installments.length > 0) {
        currentInstallments = investment.installments.map(inst => ({
            ...inst,
            description: inst.description || '',
            isMaintenance: inst.isMaintenance || (inst.description === 'Maintenance' && inst.dueDate === investment.maintenancePaymentDate),
        }));
    } else if (investment.paidInstallments) { // Legacy or auto-generation path
        const generatedInstallments = generateInstallmentSchedule(
            investment,
            investment.paidInstallments,
            today
        );
        currentInstallments = generatedInstallments.map(inst => ({
            ...inst,
            description: inst.description || '',
            isMaintenance: false, 
        }));
    }
    
    // Check for and add the main maintenance payment if defined on the investment
    if (investment.maintenanceAmount && investment.maintenanceAmount > 0 && investment.maintenancePaymentDate) {
        const maintenanceDateStr = investment.maintenancePaymentDate;
        // Check if a maintenance payment for this specific date and amount (and description) already exists
        const alreadyHasThisMaintenance = currentInstallments.some(
            inst => inst.isMaintenance && inst.dueDate === maintenanceDateStr && inst.amount === investment.maintenanceAmount
        );

        if (!alreadyHasThisMaintenance) {
            const maxNumber = currentInstallments.length > 0 
                ? Math.max(...currentInstallments.map(i => i.number), 0) 
                : 0;
            
            currentInstallments.push({
                number: maxNumber + 1,
                dueDate: maintenanceDateStr,
                amount: investment.maintenanceAmount,
                status: 'Unpaid', 
                description: 'Maintenance',
                isMaintenance: true,
            });
        }
    }
    
    currentInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setInstallments(currentInstallments);

    const totalPaidPurchaseInstallments = currentInstallments
        .filter(inst => inst.status === 'Paid' && !inst.isMaintenance)
        .reduce((sum, inst) => sum + (inst.amount || 0), 0);
    
    const currentAmountInvested = investment.amountInvested || 0;
    const hasMeaningfulDifference = Math.abs(totalPaidPurchaseInstallments - currentAmountInvested) > 0.01;

    if (hasMeaningfulDifference && currentInstallments.some(inst => !inst.isMaintenance)) {
        const syncAmountInvested = async () => {
            try {
                await updateRealEstateInvestment(investment.id, { amountInvested: totalPaidPurchaseInstallments });
            } catch (error) {
                console.error("Failed to sync amountInvested based on paid purchase installments:", error);
            }
        };
        syncAmountInvested();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investment?.id, JSON.stringify(investment?.installments), JSON.stringify(investment?.paidInstallments), investment?.amountInvested, investment?.maintenanceAmount, investment?.maintenancePaymentDate, today]);


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

  const handleDeleteInstallment = async (installmentNumber: number) => {
    try {
      if (!investment) {
        toast({ title: "Error", description: "Investment not found", variant: "destructive" });
        return;
      }

      const updatedInstallments = installments.filter(inst => inst.number !== installmentNumber);
      const cleanInstallments = updatedInstallments.map(inst => {
        return { ...inst, isMaintenance: inst.isMaintenance || false };
      });

      await updateRealEstateInvestment(investment.id, { installments: cleanInstallments });
      // setInstallments(updatedInstallments); // Local state will be updated by useEffect
      toast({ title: "Success", description: "Payment deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast({ title: "Error", description: "Failed to delete payment", variant: "destructive" });
    }
  };

  const handleAddPayment = async () => {
    if (!investment) return;
    try {
      setIsSubmitting(true);
      const maxExistingNumber = installments.length > 0 ? Math.max(...installments.map(i => i.number), 0) : 0;
      const nextNumber = maxExistingNumber + 1;
      
      const newPaymentObj: Installment = {
        number: nextNumber,
        dueDate: newPayment.dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        amount: Number(newPayment.amount) || 0,
        status: 'Unpaid',
        description: newPayment.description.trim() || undefined,
        isMaintenance: newPayment.description.toLowerCase().includes('maintenance'), // Basic heuristic
      };
      
      const updatedInstallments = [...(investment.installments || []), newPaymentObj];
      const cleanInstallments = updatedInstallments.map(inst => {
        return { ...inst, isMaintenance: inst.isMaintenance || false }; // Ensure isMaintenance is boolean
      });
      
      await updateRealEstateInvestment(investment.id, { installments: cleanInstallments });
      
      toast({ title: "Success", description: `Payment #${nextNumber} has been added.` });
      setNewPayment({ dueDate: new Date(), amount: 0, description: "" });
      setShowAddPaymentDialog(false);
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({ title: "Error", description: "Failed to add payment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


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
      <Card className="w-full mt-10">
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

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{investment.name || investment.propertyAddress}</CardTitle>
          <CardDescription>{investment.propertyType || "N/A"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium text-muted-foreground">Address:</div>
            <div>{investment.propertyAddress || "N/A"}</div>
            <div className="font-medium text-muted-foreground">Paid Towards Purchase:</div>
            <div>EGP {formatNumberWithSuffix(investment.amountInvested)}</div>
            <div className="font-medium text-muted-foreground">Installment Amount:</div>
            <div>{investment.installmentAmount ? `EGP ${formatNumberWithSuffix(investment.installmentAmount)}` : 'N/A'}</div>
            <div className="font-medium text-muted-foreground">Installment Frequency:</div>
            <div>{investment.installmentFrequency || 'N/A'}</div>
            <div className="font-medium text-muted-foreground">Total Price at End:</div>
            <div>{investment.totalInstallmentPrice ? `EGP ${formatNumberWithSuffix(investment.totalInstallmentPrice)}` : 'N/A'}</div>
            <div className="font-medium text-muted-foreground">Installment End Date:</div>
            <div>{formatDateDisplay(investment.installmentEndDate)}</div>
            {investment.maintenanceAmount && investment.maintenancePaymentDate && (
              <>
                <div className="font-medium text-muted-foreground">Maintenance Payment:</div>
                <div>EGP {formatNumberWithSuffix(investment.maintenanceAmount)} on {formatDateDisplay(investment.maintenancePaymentDate)}</div>
              </>
            )}
          </div>
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Payment Schedule</h3>
              <Button onClick={() => setShowAddPaymentDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Payment
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
          <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Payment</DialogTitle>
                <DialogDescription>
                  Add a new future payment to the schedule.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-end">
                    Due Date
                  </Label>
                  <div className="col-span-3">
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newPayment.dueDate ? (
                            format(newPayment.dueDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newPayment.dueDate}
                          onSelect={(date) => {
                            if (date) {
                              setNewPayment({...newPayment, dueDate: date});
                              setDatePickerOpen(false);
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-end">
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    className="col-span-3"
                    value={newPayment.amount || ''}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-end pt-2">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    className="col-span-3"
                    placeholder="Optional: e.g., Q4 payment, Final finishing payment, Maintenance"
                    value={newPayment.description}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddPaymentDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSubmitting || !newPayment.amount || !newPayment.dueDate}
                  onClick={handleAddPayment}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Payment'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

    
