import {
  addMonths,
  addQuarters,
  addYears,
  isBefore,
  parseISO,
  addDays,
} from "date-fns";
import { RealEstateInvestment, Installment } from "@/lib/types";

// Helper function to compare dates safely
const safeDateCompare = (date1: string | Date, date2: string | Date) => {
  try {
    const d1 = typeof date1 === "string" ? parseISO(date1) : new Date(date1);
    const d2 = typeof date2 === "string" ? parseISO(date2) : new Date(date2);
    return d1.getTime() === d2.getTime();
  } catch (e) {
    return false;
  }
};

interface PaidInstallment {
  number: number;
  chequeNumber?: string;
  amount?: number;
  dueDate?: string;
}

export function generateInstallmentSchedule(
  investment: RealEstateInvestment,
  paidInstallments: PaidInstallment[] = [],
  today: Date = new Date(),
): Installment[] {
  if (!investment.installmentAmount ||
      !investment.installmentFrequency ||
      !investment.purchaseDate ||
      !investment.installmentEndDate) {
    return [];
  }

  const installments: Installment[] = [];
  const endDate = investment.installmentEndDate ? parseISO(investment.installmentEndDate) : new Date();
  const startDate = investment.purchaseDate ? parseISO(investment.purchaseDate) : new Date();
  let currentDate = startDate;
  let number = 1;

  while (isBefore(currentDate, addDays(endDate, 1))) {
    const paid = paidInstallments.find((p) => p.number === number);
    installments.push({
      number,
      displayNumber: number,
      dueDate: currentDate.toISOString(),
      amount: investment.installmentAmount || 0,
      status: paid ? "paid" : "pending",
      chequeNumber: paid?.chequeNumber || ""
    } as Installment);

    // Move to next installment date
    switch (investment.installmentFrequency) {
      case "Monthly":
        currentDate = addMonths(currentDate, 1);
        break;
      case "Quarterly":
        currentDate = addQuarters(currentDate, 1);
        break;
      case "Yearly":
        currentDate = addYears(currentDate, 1);
        break;
      default:
        return [];
    }
    number++;
  }

  // Create a map of all paid installments by their due date for quick lookup
  const paidInstallmentsMap = new Map<string, PaidInstallment>();
  paidInstallments.forEach((paid) => {
    if (paid.dueDate) {
      paidInstallmentsMap.set(paid.dueDate, paid);
    }
  });

  // Update regular installments with paid status
  const updatedInstallments = installments.map((inst: Installment) => {
    const paidInstallment = Array.from(paidInstallmentsMap.values()).find(
      (paid) => paid.dueDate && safeDateCompare(paid.dueDate || '', inst.dueDate || ''),
    );

    if (paidInstallment) {
      return {
        ...inst,
        status: "paid" as const,
        chequeNumber: paidInstallment.chequeNumber || inst.chequeNumber || "",
        amount: paidInstallment.amount ?? inst.amount,
      };
    }
    return inst;
  });

  // Sort by due date and number
  const sortedInstallments = updatedInstallments.sort((a: Installment, b: Installment) => {
    const dateA = a.dueDate ? new Date(a.dueDate) : new Date();
    const dateB = b.dueDate ? new Date(b.dueDate) : new Date();
    
    if (a.dueDate === b.dueDate) {
      return a.number - b.number;
    }
    return dateA.getTime() - dateB.getTime();
  });

  // Include any manual installments from the investment
  const manualInstallments = (investment.installments || []).map((inst) => {
    if (!inst || typeof inst !== "object" || !inst.dueDate || !inst.amount) {
      return null;
    }
    return {
      number: inst.number || 0,
      displayNumber: inst.number || 0, // Use number as displayNumber if not provided
      dueDate: inst.dueDate || '',
      amount: inst.amount,
      status: (inst.status?.toLowerCase() === "paid" ? "paid" : "pending") as Installment["status"],
      chequeNumber: inst.chequeNumber || ""
    } as Installment;
  }).filter(Boolean) as Installment[];

  // Add manual installments to the result if they don't already exist
  const allInstallments = sortedInstallments.filter((inst) => {
    return !manualInstallments.some(manualInst => 
      manualInst.number === inst.number && 
      safeDateCompare(manualInst.dueDate || '', inst.dueDate || '')
    );
  }).concat(manualInstallments);

  // Sort all installments by due date and number
  return allInstallments.sort((a: Installment, b: Installment) => {
    const dateA = a.dueDate ? parseISO(a.dueDate) : new Date('');
    const dateB = b.dueDate ? parseISO(b.dueDate) : new Date('');
    
    if (a.dueDate === b.dueDate) {
      return a.number - b.number;
    }
    return dateA.getTime() - dateB.getTime();
  }).map((inst, index) => ({
    ...inst,
    displayNumber: index + 1
  }));
}


