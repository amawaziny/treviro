import React, { useState } from "react";
import { format, isBefore } from "date-fns";
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
}

export interface InstallmentTableProps {
  installments: Installment[];
  investmentId: string;
  investment: RealEstateInvestment;
  updateRealEstateInvestment: (investmentId: string, dataToUpdate: Partial<RealEstateInvestment>) => Promise<void>;
  paidInstallments: { number: number; chequeNumber?: string }[];
  onDeleteInstallment?: (installmentNumber: number) => Promise<void>;
}

export const InstallmentTable: React.FC<InstallmentTableProps> = ({ 
  installments, 
  investmentId, 
  investment, 
  updateRealEstateInvestment, 
  paidInstallments,
  onDeleteInstallment 
}) => {
  const [showSheet, setShowSheet] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [chequeNumber, setChequeNumber] = useState("");
  const [localInstallments, setLocalInstallments] = useState<Installment[]>(installments || []);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);

  // Sync local installments with parent installments
  React.useEffect(() => {
    setLocalInstallments(installments || []);
  }, [installments]);

  // Use local state for display since it's updated immediately
  const displayInstallments = localInstallments;
  const unpaidInstallments = displayInstallments.filter(i => i.status === "Unpaid");

  const handleOpenSheet = () => {
    setShowSheet(true);
    setSelectedNumber(unpaidInstallments[0]?.number || null);
    setChequeNumber("");
  };

  const handleMarkPaid = async () => {
    if (selectedNumber == null) return;

    // Update local state first
    const updatedInstallments = localInstallments.map(inst =>
      inst.number === selectedNumber
        ? { ...inst, status: 'Paid' as const, chequeNumber: chequeNumber || undefined }
        : inst
    ) as Installment[];
    setLocalInstallments(updatedInstallments);

    // Save to Firebase
    try {
      const updatedInvestment: Partial<RealEstateInvestment> = {
        ...investment,
        paidInstallments: [...paidInstallments, { number: selectedNumber, chequeNumber }]
      };
      await updateRealEstateInvestment(investmentId, updatedInvestment);
      setShowSheet(false);
    } catch (error) {
      console.error('Error saving installment payment:', error);
      // Reset to previous state on error
      setLocalInstallments(localInstallments);
      alert('Failed to save installment payment. Please try again.');
    }
  };

  return (
    <div className="overflow-x-auto mt-8">
      <table className="min-w-full border text-sm bg-white dark:bg-[#23255a] dark:text-white">
        <thead>
          <tr className="bg-muted dark:bg-[#181c2a] dark:text-white">
            <th className="px-3 py-2 border">#</th>
            <th className="px-3 py-2 border">Due Date</th>
            <th className="px-3 py-2 border">Amount</th>
            <th className="px-3 py-2 border">Status</th>
            <th className="px-3 py-2 border">Cheque Number</th>
            <th className="px-3 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {localInstallments.map((inst) => (
            <tr
              key={inst.number}
              onClick={() => {
                if (inst.status === "Unpaid") {
                  setShowSheet(true);
                  setSelectedNumber(inst.number);
                  setChequeNumber(inst.chequeNumber || "");
                }
              }}
            className={`
              ${inst.status === "Paid"
                ? "bg-green-50 dark:bg-green-900/30"
                : "bg-white dark:bg-[#23255a] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30"
              }
              ${isBefore(new Date(inst.dueDate), new Date()) && inst.status === "Unpaid" ? "bg-red-50 dark:bg-red-900/30" : ""}
            `}
            >
              <td className="px-3 py-2 border text-center">{inst.number}</td>
              <td className="px-3 py-2 border text-center">{format(new Date(inst.dueDate), "dd-MM-yyyy")}</td>
              <td className="px-3 py-2 border text-center">EGP {inst.amount.toLocaleString()}</td>
              <td className={`px-3 py-2 border text-center font-semibold ${inst.status === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{inst.status}</td>
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                          if (onDeleteInstallment) {
                            await onDeleteInstallment(inst.number);
                          }
                          setShowDeleteDialog(null);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
            <Button onClick={handleMarkPaid} disabled={selectedNumber == null} className="w-full">Mark as Paid</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
