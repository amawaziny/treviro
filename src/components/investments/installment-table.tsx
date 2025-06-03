import React, { useState, useEffect, useMemo } from "react";
import { format, isBefore, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { RealEstateInvestment } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Unpaid';
  chequeNumber?: string;
  description?: string; // Added description field
  displayNumber?: number;
}

export interface InstallmentTableProps {
  installments: Installment[];
  investmentId: string;
  investment: RealEstateInvestment;
  updateRealEstateInvestment: (investmentId: string, dataToUpdate: Partial<RealEstateInvestment>) => Promise<void>;
  onDeleteInstallment?: (installmentNumber: number) => Promise<void>;
}

export const InstallmentTable: React.FC<InstallmentTableProps> = ({ 
  installments, 
  investmentId, 
  investment, 
  updateRealEstateInvestment,
  onDeleteInstallment 
}) => {
  const [showSheet, setShowSheet] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [chequeNumber, setChequeNumber] = useState("");
  const [localInstallments, setLocalInstallments] = useState<Installment[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [showUnpaidDialog, setShowUnpaidDialog] = useState<number | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);

  const sortedInstallments = useMemo(() => {
    return [...installments].sort((a, b) => {
      try {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateA - dateB;
      } catch {
        return 0;
      }
    });
  }, [installments]);

  useEffect(() => {
    setLocalInstallments(sortedInstallments);
  }, [sortedInstallments]);

  const totalPaidAmount = useMemo(() => {
    return localInstallments
      .filter(i => i.status === 'Paid')
      .reduce((sum, installment) => sum + (installment.amount || 0), 0);
  }, [localInstallments]);

  const remainingAmount = useMemo(() => {
    return (investment.totalInstallmentPrice || 0) - totalPaidAmount;
  }, [investment.totalInstallmentPrice, totalPaidAmount]);

  const totalAmount = useMemo(() => {
    return investment.totalInstallmentPrice || 0;
  }, [investment.totalInstallmentPrice]);

  const displayInstallments = localInstallments;
  const unpaidInstallments = displayInstallments.filter(i => i.status === "Unpaid");

  const handleOpenSheet = () => {
    setShowSheet(true);
    setSelectedNumber(unpaidInstallments[0]?.number || null);
    setChequeNumber("");
  };

  const handleStatusChange = async (markAsPaid: boolean) => {
    if (selectedNumber == null) {
      return;
    }

    const installmentToUpdate = localInstallments.find(inst => inst.number === selectedNumber);
    if (!installmentToUpdate) {
      return;
    }

    const newStatus = markAsPaid ? 'Paid' : 'Unpaid';
    const amountChange = markAsPaid ? installmentToUpdate.amount : -installmentToUpdate.amount;
    const newAmountInvested = (investment.amountInvested || 0) + amountChange;

    try {
      const cleanInstallments = localInstallments.map(inst => {
        const isMatchingInstallment = inst.number === selectedNumber;
        
        const baseInstClean: any = {
          number: inst.number,
          dueDate: inst.dueDate,
          amount: inst.amount,
          status: isMatchingInstallment ? newStatus : inst.status,
        };

        if (isMatchingInstallment) {
          if (markAsPaid) {
             if (chequeNumber) baseInstClean.chequeNumber = chequeNumber;
             if (inst.description) baseInstClean.description = inst.description; // Preserve existing description
          } else {
            // When marking as unpaid, we might want to clear chequeNumber or keep description
            if (inst.description) baseInstClean.description = inst.description;
          }
        } else {
          if (inst.chequeNumber) baseInstClean.chequeNumber = inst.chequeNumber;
          if (inst.description) baseInstClean.description = inst.description;
        }
        return baseInstClean;
      });
      
      await updateRealEstateInvestment(investmentId, {
        installments: cleanInstallments,
        amountInvested: newAmountInvested
      });
      
      const updatedLocalInstallments = localInstallments.map(inst => {
        const isMatchingInstallment = inst.number === selectedNumber;
        return isMatchingInstallment
          ? { 
              ...inst, 
              status: newStatus as 'Paid' | 'Unpaid',
              ...(markAsPaid ? { chequeNumber: chequeNumber || inst.chequeNumber } : { chequeNumber: undefined })
            }
          : inst;
      });
      
      setLocalInstallments(updatedLocalInstallments);
      setShowSheet(false);
      setShowUnpaidDialog(null);
    } catch {
      setLocalInstallments(localInstallments);
      setErrorMessage('Failed to save installment payment. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleRowClick = (installment: Installment) => {
    if (installment.status === 'Unpaid') {
      setSelectedNumber(installment.number);
      setChequeNumber(installment.chequeNumber || '');
      setShowSheet(true);
    } else if (installment.status === 'Paid') {
      setSelectedNumber(installment.number);
      setSelectedInstallment(installment);
      setShowUnpaidDialog(installment.number);
    }
  };

  const handleDeleteInstallment = async (installmentNumber: number) => {
    if (onDeleteInstallment) {
      await onDeleteInstallment(installmentNumber);
      setShowDeleteDialog(null);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="bg-white dark:bg-[#23255a] p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
            <p className="text-sm text-muted-foreground dark:text-green-200">Total Paid</p>
            <p className="text-2xl font-bold text-foreground">EGP {totalPaidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
            <p className="text-sm text-muted-foreground dark:text-blue-200">Remaining</p>
            <p className="text-2xl font-bold text-foreground">
              EGP {remainingAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded">
            <p className="text-sm text-muted-foreground dark:text-amber-200">Total Amount</p>
            <p className="text-2xl font-bold text-foreground">
              EGP {totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm bg-white dark:bg-[#23255a] dark:text-white">
          <thead>
            <tr className="bg-muted dark:bg-[#181c2a] dark:text-white">
              <th className="px-3 py-2 border">#</th>
              <th className="px-3 py-2 border">Due Date</th>
              <th className="px-3 py-2 border">Amount</th>
              <th className="px-3 py-2 border">Description</th>
              <th className="px-3 py-2 border">Status</th>
              <th className="px-3 py-2 border">Cheque Number</th>
              <th className="px-3 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localInstallments.map((inst) => (
              <tr
                key={`${inst.number}-${inst.dueDate}`}
                onClick={() => handleRowClick(inst)}
                className={
                  inst.status === "Paid"
                    ? "bg-green-50 dark:bg-green-900/30"
                    : isBefore(new Date(inst.dueDate), new Date()) && inst.status === "Unpaid"
                    ? "bg-red-50 dark:bg-red-900/30"
                    : "bg-white dark:bg-[#23255a] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30"
                }
              >
                <td className="px-3 py-2 border text-center">{inst.number}</td>
                <td className="px-3 py-2 border text-center">{format(new Date(inst.dueDate), "dd-MM-yyyy")}</td>
                <td className="px-3 py-2 border text-center">EGP {inst.amount.toLocaleString()}</td>
                <td className="px-3 py-2 border text-center max-w-[200px] truncate" title={inst.description}>{inst.description || '-'}</td>
                <td className={`px-3 py-2 border text-center font-semibold ${
                  inst.status === 'Paid' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {inst.status}
                </td>
                <td className="px-3 py-2 border text-center">{inst.chequeNumber || '-'}</td>
                <td className="px-3 py-2 border text-center">
                  <AlertDialog open={showDeleteDialog === inst.number} onOpenChange={(open) => setShowDeleteDialog(open ? inst.number : null)}>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(inst.number);
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded"
                        title="Delete Installment"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently remove installment #{inst.number} from the schedule. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleDeleteInstallment(inst.number);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Sheet open={showUnpaidDialog === inst.number} onOpenChange={(open) => {
                    if (!open) {
                      setShowUnpaidDialog(null);
                    }
                  }}>
                    <SheetContent 
                      side="bottom" 
                      className="max-w-lg w-full bottom-0 left-0 right-0 fixed rounded-t-lg bg-white dark:bg-[#181c2a] text-[#23255a] dark:text-white"
                      style={{ top: 'auto' }}
                      onInteractOutside={(e) => {
                        e.preventDefault();
                        setShowUnpaidDialog(null);
                      }}
                    >
                      <SheetHeader className="text-left">
                        <SheetTitle className="text-xl font-bold">Mark as Unpaid?</SheetTitle>
                        <p className="text-muted-foreground">
                          Are you sure you want to mark installment #{inst.number} as unpaid? This will remove the payment record.
                        </p>
                      </SheetHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex gap-4 mt-4">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUnpaidDialog(null);
                              setSelectedNumber(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive"
                            className="w-full"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (selectedNumber !== null) {
                                await handleStatusChange(false);
                                setShowUnpaidDialog(null);
                                setSelectedNumber(null);
                                setSelectedInstallment(null);
                              }
                            }}
                          >
                            Mark as Unpaid
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent
          side="bottom"
          className="max-w-lg w-full bottom-0 left-0 right-0 fixed rounded-t-lg bg-white dark:bg-[#181c2a] text-[#23255a] dark:text-white"
          style={{ top: 'auto' }}
        >
          <SheetHeader>
            <SheetTitle>Mark Installment as Paid</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <label className="block mb-2 font-medium">Installment Number</label>
            <input
              className="w-full border rounded px-3 py-2 mb-4 bg-white dark:bg-[#23255a] text-[#23255a] dark:text-white"
              type="text"
              value={selectedNumber ?? ''}
              disabled
            />
            <label className="block mb-2 font-medium">Cheque Number (optional)</label>
            <input
              className="w-full border rounded px-3 py-2 mb-4 bg-white dark:bg-[#23255a] text-[#23255a] dark:text-white"
              type="text"
              value={chequeNumber}
              onChange={e => setChequeNumber(e.target.value)}
              placeholder="Enter cheque number"
            />
          </div>
          <SheetFooter>
            <Button 
              onClick={() => handleStatusChange(true)} 
              disabled={selectedNumber == null} 
              className="w-full"
            >
              Mark as Paid
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
);
};
