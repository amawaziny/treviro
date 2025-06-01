import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: "Paid" | "Unpaid";
  chequeNumber?: string;
}

export interface InstallmentTableProps {
  installments: Installment[];
}

export const InstallmentTable: React.FC<InstallmentTableProps> = ({ installments }) => {
  const [showSheet, setShowSheet] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [chequeNumber, setChequeNumber] = useState("");
  const [localInstallments, setLocalInstallments] = useState(installments);

  const unpaidInstallments = localInstallments.filter(i => i.status === "Unpaid");

  const handleOpenSheet = () => {
    setShowSheet(true);
    setSelectedNumber(unpaidInstallments[0]?.number || null);
    setChequeNumber("");
  };

  const handleMarkPaid = () => {
    if (selectedNumber == null) return;
    setLocalInstallments(prev => prev.map(inst =>
      inst.number === selectedNumber
        ? { ...inst, status: "Paid", chequeNumber: chequeNumber || undefined }
        : inst
    ));
    setShowSheet(false);
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
          </tr>
        </thead>
        <tbody>
          {localInstallments.map((inst) => (
            <tr
              key={inst.number}
              className={
                (inst.status === "Paid"
                  ? "bg-green-50 dark:bg-green-900/30"
                  : "bg-white dark:bg-[#23255a] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30")
              }
              onClick={() => {
                if (inst.status === "Unpaid") {
                  setShowSheet(true);
                  setSelectedNumber(inst.number);
                  setChequeNumber(inst.chequeNumber || "");
                }
              }}
            >
              <td className="px-3 py-2 border text-center">{inst.number}</td>
              <td className="px-3 py-2 border text-center">{format(new Date(inst.dueDate), "dd-MM-yyyy")}</td>
              <td className="px-3 py-2 border text-center">EGP {inst.amount.toLocaleString()}</td>
              <td className={`px-3 py-2 border text-center font-semibold ${inst.status === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{inst.status}</td>
              <td className="px-3 py-2 border text-center">{inst.chequeNumber || '-'}</td>
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
