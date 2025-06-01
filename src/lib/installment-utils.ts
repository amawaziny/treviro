import { addMonths, addQuarters, addYears, isBefore, isEqual } from "date-fns";
import { RealEstateInvestment } from "@/lib/types";
import { Installment } from "@/components/investments/installment-table";

export function generateInstallmentSchedule(
  investment: RealEstateInvestment,
  paidInstallments: { number: number; chequeNumber?: string }[] = [],
  today: Date = new Date()
): Installment[] {
  if (!investment.installmentAmount || !investment.installmentFrequency || !investment.purchaseDate || !investment.installmentEndDate) {
    return [];
  }
  const result: Installment[] = [];
  let currentDate = new Date(investment.purchaseDate);
  const endDate = new Date(investment.installmentEndDate);
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
        return result;
    }
    number++;
    if (isBefore(endDate, currentDate)) break;
  }
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
