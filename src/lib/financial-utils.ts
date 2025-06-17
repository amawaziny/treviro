import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type {
  IncomeRecord,
  ExpenseRecord,
  Investment,
  FixedEstimateRecord,
  DebtInstrumentInvestment,
  StockInvestment,
  GoldInvestment,
  RealEstateInvestment,
  CurrencyInvestment,
} from "@/lib/types";
import { parseDateString } from "./utils";

export interface CashFlowSummaryArgs {
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  investments: Investment[];
  fixedEstimates: FixedEstimateRecord[];
  month?: Date; // Defaults to current month if not provided
}

export interface CashFlowSummaryResult {
  totalIncome: number;
  monthlySalary: number;
  otherFixedIncomeMonthly: number;
  totalManualIncomeThisMonth: number;
  totalProjectedCertificateInterestThisMonth: number;
  totalExpensesOnly: number;
  livingExpensesMonthly: number;
  zakatFixedMonthly: number;
  charityFixedMonthly: number;
  otherFixedExpensesMonthly: number;
  realEstateInstallmentsMonthly: number;
  totalItemizedExpensesThisMonth: number;
  totalInvestmentsThisMonth: number;
  totalStockInvestmentThisMonth: number;
  totalDebtInvestmentThisMonth: number;
  totalGoldInvestmentThisMonth: number;
  totalCurrencyInvestmentThisMonth: number;
  totalInvestmentsOnly: number;
  netCashFlowThisMonth: number;
}

export function calculateMonthlyCashFlowSummary({
  incomeRecords = [],
  expenseRecords = [],
  investments = [],
  fixedEstimates = [],
  month = new Date(),
}: CashFlowSummaryArgs): CashFlowSummaryResult {
  const currentMonthStart = startOfMonth(month);
  const currentMonthEnd = endOfMonth(month);

  // Fixed income breakdown
  let monthlySalary = 0,
    otherFixedIncomeMonthly = 0,
    zakatFixedMonthly = 0,
    charityFixedMonthly = 0,
    otherFixedExpensesMonthly = 0,
    livingExpensesMonthly = 0;
  (fixedEstimates || []).forEach((fe) => {
    let monthlyAmount = fe.amount;
    if (fe.period === "Yearly") monthlyAmount /= 12;
    if (fe.type === "Salary") monthlySalary += monthlyAmount;
    else if (fe.type === "Other" && fe.isExpense === false)
      otherFixedIncomeMonthly += monthlyAmount;
    else if (fe.type === "Zakat") zakatFixedMonthly += monthlyAmount;
    else if (fe.type === "Charity") charityFixedMonthly += monthlyAmount;
    else if (fe.type === "Living Expenses")
      livingExpensesMonthly += monthlyAmount;
    else if (fe.type === "Other" && fe.isExpense === true)
      otherFixedExpensesMonthly += monthlyAmount;
  });

  // Manual income (income records)
  let totalManualIncomeThisMonth = 0;
  (incomeRecords || []).forEach((record) => {
    const date = parseDateString(record.date);
    if (
      date &&
      isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd })
    ) {
      totalManualIncomeThisMonth += record.amount;
    }
  });

  // Projected certificate interest (from investments)
  let totalProjectedCertificateInterestThisMonth = 0;
  (investments || []).forEach((inv) => {
    if (inv.type === "Debt Instruments") {
      const debtInv = inv as DebtInstrumentInvestment;
      const date = parseDateString(debtInv.purchaseDate);
      if (
        date &&
        isWithinInterval(date, {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
      ) {
        totalProjectedCertificateInterestThisMonth +=
          debtInv.interestAmount || 0;
      }
    }
  });

  // Expenses breakdown
  let totalItemizedExpensesThisMonth = 0;
  (expenseRecords || []).forEach((record) => {
    const date = parseDateString(record.date);

    // Check if this is a credit card installment
    if (
      record.category === "Credit Card" &&
      record.isInstallment &&
      record.numberOfInstallments
    ) {
      const startDate = new Date(record.date);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const currentMonth = currentMonthStart.getMonth();
      const currentYear = currentMonthStart.getFullYear();

      // Calculate how many months have passed since the start date
      const monthsSinceStart =
        (currentYear - startYear) * 12 + (currentMonth - startMonth);

      // If current month is within the installment period, include the monthly installment
      if (
        monthsSinceStart >= 0 &&
        monthsSinceStart < record.numberOfInstallments
      ) {
        const monthlyAmount = record.amount / record.numberOfInstallments;
        totalItemizedExpensesThisMonth += monthlyAmount;
      }
    }
    // For regular expenses, check if they occurred in the current month
    else if (
      date &&
      isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd })
    ) {
      totalItemizedExpensesThisMonth += record.amount;
    }
  });

  // Real estate installments (sum only PAID installments due this month)
  let realEstateInstallmentsMonthly = 0;
  (investments || []).forEach((inv) => {
    if (inv.type === "Real Estate") {
      const reInv = inv as RealEstateInvestment;
      if (Array.isArray(reInv.installments)) {
        reInv.installments.forEach((inst) => {
          const dueDate = parseDateString(inst.dueDate);
          if (
            inst.status === "Paid" &&
            dueDate &&
            isWithinInterval(dueDate, {
              start: currentMonthStart,
              end: currentMonthEnd,
            })
          ) {
            realEstateInstallmentsMonthly += inst.amount || 0;
          }
        });
      }
    }
  });

  // Investments breakdown
  let totalStockInvestmentThisMonth = 0,
    totalDebtInvestmentThisMonth = 0,
    totalGoldInvestmentThisMonth = 0,
    totalCurrencyInvestmentThisMonth = 0;
  (investments || []).forEach((inv) => {
    const date = parseDateString((inv as any).purchaseDate);
    if (
      date &&
      isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd })
    ) {
      if (inv.type === "Stocks")
        totalStockInvestmentThisMonth +=
          (inv as StockInvestment).amountInvested || 0;
      else if (inv.type === "Debt Instruments")
        totalDebtInvestmentThisMonth +=
          (inv as DebtInstrumentInvestment).amountInvested || 0;
      else if (inv.type === "Gold")
        totalGoldInvestmentThisMonth +=
          (inv as GoldInvestment).amountInvested || 0;
      else if (inv.type === "Currencies")
        totalCurrencyInvestmentThisMonth +=
          (inv as CurrencyInvestment).amountInvested || 0;
    }
  });

  // Totals
  const totalIncome =
    monthlySalary +
    otherFixedIncomeMonthly +
    totalManualIncomeThisMonth +
    totalProjectedCertificateInterestThisMonth;
  const totalExpensesOnly =
    zakatFixedMonthly +
    charityFixedMonthly +
    livingExpensesMonthly +
    otherFixedExpensesMonthly +
    totalItemizedExpensesThisMonth;
  const totalInvestmentsOnly =
    totalStockInvestmentThisMonth +
    totalDebtInvestmentThisMonth +
    totalGoldInvestmentThisMonth +
    realEstateInstallmentsMonthly;
  const totalInvestmentsThisMonth = totalInvestmentsOnly;
  const netCashFlowThisMonth =
    totalIncome - totalExpensesOnly - totalInvestmentsOnly;

  return {
    totalIncome,
    monthlySalary,
    otherFixedIncomeMonthly,
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    totalExpensesOnly,
    livingExpensesMonthly,
    zakatFixedMonthly,
    charityFixedMonthly,
    otherFixedExpensesMonthly,
    realEstateInstallmentsMonthly,
    totalItemizedExpensesThisMonth,
    totalInvestmentsThisMonth,
    totalStockInvestmentThisMonth,
    totalDebtInvestmentThisMonth,
    totalGoldInvestmentThisMonth,
    totalCurrencyInvestmentThisMonth,
    totalInvestmentsOnly,
    netCashFlowThisMonth,
  };
}
