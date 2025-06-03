"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { formatNumberWithSuffix } from "@/lib/utils";
import { Loader2, ArrowLeft, Plus, Calendar as CalendarIcon } from "lucide-react";
import { InstallmentTable } from "@/components/investments/installment-table";
import { generateInstallmentSchedule } from "@/lib/installment-utils";
import type { Installment } from "@/components/investments/installment-table";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { investments, isLoading } = useInvestments();
  const { language } = useLanguage();
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstallment, setNewInstallment] = useState({
    dueDate: new Date(),
    amount: 0,
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

  const { updateRealEstateInvestment } = useInvestments();
  const today = useMemo(() => new Date(), []);

  // Initialize installments from investment data
  const [installments, setInstallments] = useState<Installment[]>([]);

  // Update installments when investment data changes
  useEffect(() => {
    if (investment) {
      // If we have installments in the investment, use them directly
      if (investment.installments && investment.installments.length > 0) {
        console.log('Using installments from investment:', investment.installments);
        setInstallments(investment.installments);
      } 
      // Fallback to generating installments if none exist yet (for backward compatibility)
      else if (investment.paidInstallments) {
        console.log('Generating installments from paidInstallments');
        const generatedInstallments = generateInstallmentSchedule(
          investment,
          investment.paidInstallments,
          today
        );
        setInstallments(generatedInstallments);
      }
    }
  }, [investment, today]);

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
        toast({
          title: "Error",
          description: "Investment not found",
          variant: "destructive",
        });
        return;
      }

      // Remove the installment from the installments array
      const updatedInstallments = installments.filter(
        (inst) => inst.number !== installmentNumber
      );

      // Create a clean installments array without undefined values
      const cleanInstallments = updatedInstallments.map(inst => {
        const cleanInst: any = {
          number: inst.number,
          dueDate: inst.dueDate,
          amount: inst.amount,
          status: inst.status
        };
        
        // Only include chequeNumber if it exists
        if (inst.chequeNumber) {
          cleanInst.chequeNumber = inst.chequeNumber;
        }
        
        return cleanInst;
      });

      await updateRealEstateInvestment(investment.id, {
        installments: cleanInstallments,
      });

      // Update local state
      setInstallments(updatedInstallments);

      toast({
        title: "Success",
        description: "Installment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting installment:", error);
      toast({
        title: "Error",
        description: "Failed to delete installment",
        variant: "destructive",
      });
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
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Installment Schedule</h3>
              <Button onClick={() => setShowAddInstallment(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Future Installment
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
          <Dialog open={showAddInstallment} onOpenChange={setShowAddInstallment}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Future Installment</DialogTitle>
                <DialogDescription>
                  Add a new future installment to the payment schedule.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-right">
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
                          {newInstallment.dueDate ? (
                            format(newInstallment.dueDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newInstallment.dueDate}
                          onSelect={(date) => {
                            if (date) {
                              setNewInstallment({...newInstallment, dueDate: date});
                              setDatePickerOpen(false);
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    className="col-span-3"
                    value={newInstallment.amount || ''}
                    onChange={(e) =>
                      setNewInstallment({
                        ...newInstallment,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddInstallment(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || !newInstallment.amount || !newInstallment.dueDate}
                  onClick={async () => {
                    if (!investment) return;
                    
                    try {
                      setIsSubmitting(true);
                      
                      const nextNumber = Math.max(0, ...installments.map(i => i.number)) + 1;
                      
                      // Create the new installment object
                      const newInstallmentObj: Installment = {
                        number: nextNumber,
                        dueDate: newInstallment.dueDate.toISOString(),
                        amount: Number(newInstallment.amount) || 0,
                        status: 'Unpaid',
                      };
                      
                      // Update the installments list to include the new installment
                      const updatedInstallments = [...(investment.installments || []), newInstallmentObj];
                      
                      // Create a clean installments array without undefined values
                      const cleanInstallments = updatedInstallments.map(inst => {
                        const cleanInst: any = {
                          number: inst.number,
                          dueDate: inst.dueDate,
                          amount: inst.amount,
                          status: inst.status
                        };
                        
                        // Only include chequeNumber if it exists
                        if (inst.chequeNumber) {
                          cleanInst.chequeNumber = inst.chequeNumber;
                        }
                        
                        return cleanInst;
                      });
                      
                      // Save to the database
                      await updateRealEstateInvestment(investment.id, {
                        installments: cleanInstallments
                      });
                      
                      // Update local state
                      setInstallments(updatedInstallments);
                      
                      toast({
                        title: "Success",
                        description: `Installment #${nextNumber} has been added successfully.`,
                      });
                      
                      setNewInstallment({ dueDate: new Date(), amount: 0 });
                      setShowAddInstallment(false);
                    } catch (error) {
                      console.error('Error adding installment:', error);
                      toast({
                        title: "Error",
                        description: "Failed to add installment. Please try again.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Installment'
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
