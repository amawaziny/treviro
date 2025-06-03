import { addMonths, addQuarters, addYears, isBefore, isEqual, parseISO } from "date-fns";
import { RealEstateInvestment } from "@/lib/types";
import { Installment } from "@/components/investments/installment-table";

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

interface PaidInstallment {
  number: number;
  chequeNumber?: string;
  amount?: number;
  dueDate?: string;
}

export function generateInstallmentSchedule(
  investment: RealEstateInvestment,
  paidInstallments: PaidInstallment[] = [],
  today: Date = new Date()
): Installment[] {
  console.log('=== generateInstallmentSchedule ===');
  console.log('Paid installments:', paidInstallments);
  if (!investment.installmentAmount || !investment.installmentFrequency || !investment.purchaseDate) {
    return [];
  }
  
  const result: Installment[] = [];
  const endDate = investment.installmentEndDate ? new Date(investment.installmentEndDate) : null;
  
  // Generate scheduled installments up to endDate (if exists)
  if (endDate) {
    let currentDate = new Date(investment.purchaseDate);
    let number = 1;
    
    while (isBefore(currentDate, addDays(endDate, 1))) {
      const paid = paidInstallments.find((p) => p.number === number);
      result.push({
        number,
        dueDate: currentDate.toISOString(),
        amount: investment.installmentAmount,
        status: paid ? "Paid" : "Unpaid",
        chequeNumber: paid?.chequeNumber,
      });
      
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
          break;
      }
      number++;
      if (isBefore(endDate, currentDate)) break;
    }
  }
  
  // Create a map of all paid installments by their due date for quick lookup
  const paidInstallmentsMap = new Map<string, typeof paidInstallments[0]>();
  paidInstallments.forEach(paid => {
    if (paid.dueDate) {
      paidInstallmentsMap.set(paid.dueDate, paid);
    }
  });

  // Update regular installments with paid status
  const updatedRegularInstallments = result.map(inst => {
    const paidInstallment = Array.from(paidInstallmentsMap.values()).find(paid => 
      paid.dueDate && safeDateCompare(paid.dueDate, inst.dueDate)
    );

    if (paidInstallment) {
      return {
        ...inst,
        status: 'Paid' as const,
        chequeNumber: paidInstallment.chequeNumber || inst.chequeNumber || "",
        amount: paidInstallment.amount ?? inst.amount
      };
    }
    return inst;
  });

  // Clear and repopulate result with updated regular installments
  result.length = 0;
  result.push(...updatedRegularInstallments);

  // Include any manual installments from the investment
  const manualInstallments = (investment.installments || []).filter(inst => 
    inst && typeof inst === 'object' && 
    'number' in inst && 
    'dueDate' in inst &&
    'amount' in inst
  ) as Installment[];

  // Add manual installments to the result if they don't already exist
  manualInstallments.forEach(manualInst => {
    const exists = result.some(inst => 
      inst.number === manualInst.number && 
      safeDateCompare(inst.dueDate, manualInst.dueDate)
    );
    
    if (!exists) {
      result.push({
        ...manualInst,
        status: manualInst.status || 'Unpaid',
        chequeNumber: manualInst.chequeNumber || ''
      });
    }
  });

  // Sort all installments by due date
  result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Add display numbers for UI
  result.forEach((inst, index) => {
    inst.displayNumber = index + 1;
  });

  console.log('Generated installments:', result);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
