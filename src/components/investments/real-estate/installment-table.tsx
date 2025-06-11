import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDateDisplay, formatNumberWithSuffix } from "@/lib/utils";
import { RealEstateInvestment } from "@/lib/types";

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: "Paid" | "Unpaid";
  chequeNumber?: string;
  description?: string;
  isMaintenance?: boolean;
}

interface InstallmentTableProps {
  installments: Installment[];
  investmentId: string;
  investment: RealEstateInvestment;
  updateRealEstateInvestment: (
    investmentId: string,
    dataToUpdate: Partial<RealEstateInvestment>,
  ) => Promise<void>;
  onDeleteInstallment?: (installmentNumber: number) => Promise<void>;
}

export const InstallmentTable: React.FC<InstallmentTableProps> = ({
  installments,
  investmentId,
  investment,
  updateRealEstateInvestment,
  onDeleteInstallment,
}) => {
  const [showSheet, setShowSheet] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const [chequeNumber, setChequeNumber] = useState("");
  const [localInstallments, setLocalInstallments] = useState<Installment[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLocalInstallments(installments);
  }, [installments]);

  const handleRowClick = (installment: Installment) => {
    setSelectedNumber(installment.number);
    setSelectedInstallment(installment);
    setChequeNumber(installment.chequeNumber || "");
    setShowSheet(true);
  };

  const sortedInstallments = useMemo(() => {
    return [...installments].sort((a, b) => {
      try {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } catch (error) {
        return 0;
      }
    });
  }, [installments]);

  const totalPaidAmount = useMemo(() => {
    return sortedInstallments
      .filter((inst) => inst.status === "Paid")
      .reduce((sum, inst) => sum + inst.amount, 0);
  }, [sortedInstallments]);

  const totalAmount = useMemo(() => {
    return sortedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  }, [sortedInstallments]);

  const remainingAmount = useMemo(() => {
    return totalAmount - totalPaidAmount;
  }, [totalAmount, totalPaidAmount]);

  const displayInstallments = useMemo(() => {
    return sortedInstallments.map((installment, index) => ({
      ...installment,
      isMaintenance: installment.description
        ?.toLowerCase()
        .includes("maintenance"),
    }));
  }, [sortedInstallments]);

  const handleDeleteInstallment = async (installmentNumber: number) => {
    if (onDeleteInstallment) {
      await onDeleteInstallment(installmentNumber);
      setLocalInstallments((prev) =>
        prev.filter((inst) => inst.number !== installmentNumber),
      );
      setShowDeleteDialog(null);
    }
  };

  const handleStatusChange = async (markAsPaid: boolean) => {
    if (selectedNumber == null) {
      return;
    }

    const installmentToUpdate = localInstallments.find(
      (inst) => inst.number === selectedNumber,
    );
    if (!installmentToUpdate) {
      return;
    }

    const newStatus = markAsPaid ? "Paid" : "Unpaid";
    let newAmountInvested = investment.amountInvested || 0;

    if (!installmentToUpdate.isMaintenance) {
      const amountChange = markAsPaid
        ? installmentToUpdate.amount
        : -installmentToUpdate.amount;
      newAmountInvested += amountChange;
    }

    try {
      const updatedInstallments = localInstallments.map((inst) => {
        const isMatchingInstallment = inst.number === selectedNumber;

        const baseInstClean: any = {
          number: inst.number,
          dueDate: inst.dueDate,
          amount: inst.amount,
          status: isMatchingInstallment ? newStatus : inst.status,
          isMaintenance: inst.isMaintenance || false, // Ensure flag is preserved
        };
        return baseInstClean;
      });

      await updateRealEstateInvestment(investmentId, {
        installments: updatedInstallments,
      });

      setLocalInstallments(updatedInstallments);
      setShowSheet(false);
      setSelectedNumber(null);
      setChequeNumber("");
      setSelectedInstallment(null);
    } catch (error) {
      setErrorMessage("Failed to update installment status");
      setShowErrorDialog(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg shadow">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold">
              Payment Summary
            </CardTitle>
            <CardDescription className="text-sm">
              (Purchase Installments)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
                <p className="text-sm text-muted-foreground dark:text-green-200">
                  Total Paid (Purchase)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  EGP {totalPaidAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-gray-800/50 p-4 rounded">
                <p className="text-sm text-muted-foreground dark:text-yellow-200">
                  Remaining Amount
                </p>
                <p className="text-2xl font-bold text-foreground">
                  EGP {remainingAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                <p className="text-sm text-muted-foreground dark:text-blue-200">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-foreground">
                  EGP {totalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {displayInstallments.map((installment, index) => (
                <Card
                  key={installment.number}
                  className="border-b border-gray-200 dark:border-gray-800"
                >
                  <div
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#181c2a] cursor-pointer"
                    onClick={() => handleRowClick(installment)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          #{installment.number}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateDisplay(installment.dueDate)}
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-1">
                        {formatNumberWithSuffix(installment.amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {installment.status === "Paid" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          installment.status === "Paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {installment.status}
                      </span>
                      {installment.chequeNumber && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          #{installment.chequeNumber}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(installment.number);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Sheet open={showSheet} onOpenChange={setShowSheet}>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>
                    {selectedInstallment?.status === "Paid"
                      ? "Mark as Unpaid"
                      : "Mark as Paid"}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedInstallment?.status === "Paid"
                      ? "Are you sure you want to mark this installment as unpaid? This will remove the payment record."
                      : "Enter the cheque number to mark this installment as paid."}
                  </SheetDescription>
                </SheetHeader>

                {selectedInstallment?.status !== "Paid" && (
                  <div className="py-4">
                    <div className="space-y-2">
                      <Label htmlFor="chequeNumber">Cheque Number</Label>
                      <Input
                        id="chequeNumber"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Enter cheque number"
                      />
                    </div>
                  </div>
                )}

                <SheetFooter>
                  <div className="flex flex-row-reverse gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSheet(false);
                        setSelectedNumber(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedInstallment?.status === "Paid") {
                          handleStatusChange(false);
                        } else {
                          handleStatusChange(true);
                        }
                      }}
                    >
                      {selectedInstallment?.status === "Paid"
                        ? "Mark as Unpaid"
                        : "Mark as Paid"}
                    </Button>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {showDeleteDialog !== null && (
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete installment #
                      {showDeleteDialog}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteInstallment(showDeleteDialog)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {showErrorDialog && (
              <AlertDialog
                open={showErrorDialog}
                onOpenChange={setShowErrorDialog}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Error</AlertDialogTitle>
                    <AlertDialogDescription>
                      {errorMessage}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>OK</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
