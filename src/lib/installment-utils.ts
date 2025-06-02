import { addMonths, addQuarters, addYears, isBefore, isEqual } from "date-fns";
import { RealEstateInvestment } from "@/lib/types";
import { Installment } from "@/components/investments/installment-table";

export function generateInstallmentSchedule(
  investment: RealEstateInvestment,
  paidInstallments: { number: number; chequeNumber?: string }[] = [],
  today: Date = new Date()
): Installment[] {
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
  
  // Add any paid installments that might be outside the regular schedule
  paidInstallments.forEach((paid: { number: number; chequeNumber?: string; amount?: number }) => {
    // Only mark as paid if it has a cheque number (meaning it was actually paid)
    const isPaid = !!paid.chequeNumber;
    
    // For future installments, we want to use the amount that was specified when creating them
    // For regular installments that were paid, use the installment amount from the investment
    const amount = paid.amount !== undefined ? paid.amount : (investment.installmentAmount || 0);
    
    // Check if this installment already exists in the result
    const existingIndex = result.findIndex(inst => inst.number === paid.number);
    
    if (existingIndex === -1) {
      // If it doesn't exist, add it as a new installment
      result.push({
        number: paid.number,
        dueDate: new Date().toISOString(), // This should be set from the form
        amount: amount,
        status: isPaid ? "Paid" : "Unpaid",
        chequeNumber: paid.chequeNumber || "",
      });
    } else {
      // If it exists, update its status and amount
      result[existingIndex] = {
        ...result[existingIndex],
        amount: amount,
        status: isPaid ? "Paid" : result[existingIndex].status,
        chequeNumber: paid.chequeNumber || result[existingIndex].chequeNumber || "",
      };
    }
  });
  
  // Sort by due date
  return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
