import React, { useState, useEffect, useMemo } from "react";
import { format, isBefore, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

// Helper function to compare dates safely
const safeDateCompare = (date1: string | Date, date2: string | Date) => {
  try {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : new Date(date1);
    const d2 = typeof date2 === 'string' ? parseISO(date2) : new Date(date2);
    return d1.getTime() === d2.getTime();
  } catch (e) {
    return false;
  }
};
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
  const sortedInstallments = useMemo(() => {
    return [...installments].sort((a, b) => {
      try {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateA - dateB;
      } catch (e) {
        console.error('Error sorting installments:', e);
        return 0;
      }
    });
  }, [installments]);

  // Use local state for installments to allow for optimistic updates
  const [localInstallments, setLocalInstallments] = useState<Installment[]>(sortedInstallments);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [showUnpaidDialog, setShowUnpaidDialog] = useState<number | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);

  useEffect(() => {
    setLocalInstallments(sortedInstallments);
  }, [sortedInstallments]);

  // Use local state for display since it's updated immediately
  const displayInstallments = localInstallments;
  const unpaidInstallments = displayInstallments.filter(i => i.status === "Unpaid");

  const handleOpenSheet = () => {
    setShowSheet(true);
    setSelectedNumber(unpaidInstallments[0]?.number || null);
    setChequeNumber("");
  };

  const handleStatusChange = async (markAsPaid: boolean) => {
    console.log(`=== Marking installment as ${markAsPaid ? 'paid' : 'unpaid'} ===`);
    console.log('Selected number:', selectedNumber);
    
    if (selectedNumber == null) {
      console.error('No installment selected');
      return;
    }

    // Find the installment being updated
    const installmentToUpdate = localInstallments.find(inst => inst.number === selectedNumber);
    if (!installmentToUpdate) {
      console.error('Installment not found in localInstallments:', selectedNumber);
      console.log('Available installments:', localInstallments.map(i => i.number));
      return;
    }

    const newStatus = markAsPaid ? 'Paid' : 'Unpaid';
    console.log(`Marking installment as ${newStatus}:`, {
      number: installmentToUpdate.number,
      amount: installmentToUpdate.amount,
      dueDate: installmentToUpdate.dueDate,
      chequeNumber: markAsPaid ? (chequeNumber || '(none)') : 'N/A'
    });

    // Save to Firebase first
    try {
      // Create a clean installments array for Firebase
      const cleanInstallments = localInstallments.map(inst => {
        // Check if this is the installment we're updating
        const isMatchingInstallment = inst.number === selectedNumber && 
          (!inst.dueDate || !installmentToUpdate.dueDate || 
           safeDateCompare(inst.dueDate, installmentToUpdate.dueDate));
        
        if (isMatchingInstallment) {
          const updatedInst = {
            ...inst,
            status: newStatus as 'Paid' | 'Unpaid',
            ...(markAsPaid ? { chequeNumber: chequeNumber || inst.chequeNumber } : { chequeNumber: undefined })
          };
          
          const cleanInst: any = {
            number: updatedInst.number,
            dueDate: updatedInst.dueDate,
            amount: updatedInst.amount,
            status: updatedInst.status
          };
          
          if (updatedInst.chequeNumber) {
            cleanInst.chequeNumber = updatedInst.chequeNumber;
          }
          
          return cleanInst;
        }
        
        // For non-matching installments, just clean the data
        const cleanInst: any = {
          number: inst.number,
          dueDate: inst.dueDate,
          amount: inst.amount,
          status: inst.status
        };
        
        if (inst.chequeNumber) {
          cleanInst.chequeNumber = inst.chequeNumber;
        }
        
        return cleanInst;
      });
      
      console.log('Updated installments for Firebase:', cleanInstallments);
      
      // Update the investment with the cleaned installments
      const updatedInvestment: Partial<RealEstateInvestment> = {
        installments: cleanInstallments
      };
      
      console.log('Updating investment with:', updatedInvestment);
      
      // Update Firebase
      await updateRealEstateInvestment(investmentId, updatedInvestment);
      
      // Only update local state after successful Firebase update
      const updatedLocalInstallments = localInstallments.map(inst => {
        const isMatchingInstallment = inst.number === selectedNumber && 
          (!inst.dueDate || !installmentToUpdate.dueDate || 
           safeDateCompare(inst.dueDate, installmentToUpdate.dueDate));
        
        return isMatchingInstallment
          ? { 
              ...inst, 
              status: newStatus as 'Paid' | 'Unpaid',
              ...(markAsPaid ? { chequeNumber: chequeNumber || inst.chequeNumber } : { chequeNumber: undefined })
            }
          : inst;
      });
      
      setLocalInstallments(updatedLocalInstallments);
      console.log(`Successfully marked installment as ${newStatus}`);
      setShowSheet(false);
      setShowUnpaidDialog(null);
    } catch (error) {
      console.error('Error saving installment payment:', error);
      // Reset to previous state on error
      setLocalInstallments(localInstallments);
      alert('Failed to save installment payment. Please try again.');
    }
  };

  const handleRowClick = (installment: Installment) => {
    if (installment.status === 'Unpaid') {
      setShowSheet(true);
      setSelectedNumber(installment.number);
      setChequeNumber(installment.chequeNumber || '');
    } else if (installment.status === 'Paid') {
      setSelectedInstallment(installment);
      setShowUnpaidDialog(installment.number);
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

                {/* Unpaid Confirmation Bottom Sheet */}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowUnpaidDialog(null);
                          }}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          className="w-full"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedNumber(inst.number);
                            await handleStatusChange(false);
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
    </div>
  );
};
