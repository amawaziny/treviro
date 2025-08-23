import { useLanguage } from "@/contexts/language-context";
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
import { CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn, formatDateDisplay, formatNumberForMobile } from "@/lib/utils";
import { Installment, RealEstateInvestment } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

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
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showSheet, setShowSheet] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const [chequeNumber, setChequeNumber] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDeleteInstallment = async (installmentNumber: number) => {
    if (onDeleteInstallment) {
      await onDeleteInstallment(installmentNumber);
      setShowDeleteDialog(null);
    }
  };

  const handleStatusChange = async (markAsPaid: boolean) => {
    if (selectedNumber == null || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);

    const newStatus = markAsPaid ? "Paid" : "Unpaid";
    let newAmountInvested = investment.amountInvested || 0;

    if (selectedInstallment) {
      const amountChange = markAsPaid
        ? selectedInstallment.amount
        : -selectedInstallment.amount;
      newAmountInvested += amountChange;
    }

    try {
      const updatedInstallments = installments.map((inst) => {
        const isMatchingInstallment = inst.number === selectedNumber;
        return {
          ...inst,
          status: isMatchingInstallment ? newStatus : inst.status,
        };
      });

      await updateRealEstateInvestment(investmentId, {
        installments: updatedInstallments,
        amountInvested: newAmountInvested,
      });

      setShowSheet(false);
      setSelectedNumber(null);
      setChequeNumber("");
      setSelectedInstallment(null);
    } catch (error) {
      console.error("Error updating installment status:", error);
      setErrorMessage(t("failed_to_update_installment_status"));
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg shadow">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold">
              {t("payment_summary")}
            </CardTitle>
            <CardDescription className="text-sm">
              {t("purchase_installments")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
                <p className="text-sm text-muted-foreground dark:text-green-200">
                  {t("total_paid_purchase")}
                </p>
                <p className="text-xl font-bold text-foreground">
                  EGP {totalPaidAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-gray-800/50 p-4 rounded">
                <p className="text-sm text-muted-foreground dark:text-yellow-200">
                  {t("remaining_amount")}
                </p>
                <p className="text-xl font-bold text-foreground">
                  EGP {remainingAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                <p className="text-sm text-muted-foreground dark:text-blue-200">
                  {t("total_amount")}
                </p>
                <p className="text-xl font-bold text-foreground">
                  EGP {totalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {sortedInstallments.map((installment, index) => (
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
                        <span className="text-xs flex items-center gap-2">
                          {(installment.isDownPayment ||
                            installment.isMaintenance) && (
                            <Badge variant="default">
                              {t(
                                installment.isDownPayment
                                  ? "down_payment"
                                  : "maintenance",
                              )}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            {formatDateDisplay(installment.dueDate)}
                          </span>
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-1">
                        <p>
                          {formatNumberForMobile(isMobile, installment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {installment.description}
                        </p>
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
                      ? t("mark_as_unpaid")
                      : t("mark_as_paid")}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedInstallment?.status === "Paid"
                      ? t(
                          "are_you_sure_you_want_to_mark_this_installment_as_unpaid_this_will_remove_the_payment_record",
                        )
                      : t(
                          "enter_the_cheque_number_to_mark_this_installment_as_paid",
                        )}
                  </SheetDescription>
                </SheetHeader>

                {selectedInstallment?.status !== "Paid" && (
                  <div className="py-4">
                    <div className="space-y-2">
                      <Label htmlFor="chequeNumber">{t("cheque_number")}</Label>
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
                      {t("Cancel")}
                    </Button>
                    <Button
                      onClick={() =>
                        handleStatusChange(
                          selectedInstallment?.status !== "Paid",
                        )
                      }
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {selectedInstallment?.status === "Paid"
                        ? t("mark_as_unpaid")
                        : t("mark_as_paid")}
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
                    <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("this_will_permanently_delete_installment")}
                      {showDeleteDialog}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteInstallment(showDeleteDialog)}
                    >
                      {t("delete")}
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
                    <AlertDialogTitle>{t("error")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {errorMessage}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("OK")}</AlertDialogCancel>
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
