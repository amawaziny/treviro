import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isSameMonth,
} from "date-fns";
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
  Transaction,
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
  // Income
  totalIncome: number;
  monthlySalary: number;
  otherFixedIncomeMonthly: number;
  totalManualIncomeThisMonth: number;
  totalProjectedCertificateInterestThisMonth: number;
  currentMonthIncome: number;

  // Expenses
  totalExpensesOnly: number;
  livingExpensesMonthly: number;
  zakatFixedMonthly: number;
  charityFixedMonthly: number;
  otherFixedExpensesMonthly: number;
  realEstateInstallmentsMonthly: number;
  totalItemizedExpensesThisMonth: number;

  // Investments
  totalInvestmentsThisMonth: number;
  totalStockInvestmentThisMonth: number;
  totalDebtInvestmentThisMonth: number;
  totalGoldInvestmentThisMonth: number;
  totalCurrencyInvestmentThisMonth: number;
  totalInvestmentsOnly: number;

  // Summary
  netCashFlowThisMonth: number;
  netCurrentMonthCashFlow: number;
}

export function calculateCashFlowDetails({
  incomeRecords = [],
  expenseRecords = [],
  investments = [],
  fixedEstimates = [],
  transactions = [],
  month = new Date(),
}: CashFlowSummaryArgs & {
  transactions?: Transaction[];
}): CashFlowSummaryResult {
  const summary = calculateMonthlyCashFlowSummary({
    incomeRecords,
    expenseRecords,
    investments,
    fixedEstimates,
    month,
  });

  const currentMonthStart = startOfMonth(month);
  const currentMonthEnd = endOfMonth(month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate current month income based on payout dates
  let currentMonthIncome = 0;

  // Process manual income records
  incomeRecords.forEach((income) => {
    const incomeDate = parseDateString(income.date);
    if (incomeDate) {
      const isInCurrentMonth = isWithinInterval(incomeDate, {
        start: currentMonthStart,
        end: currentMonthEnd,
      });

      if (isInCurrentMonth && incomeDate <= today) {
        currentMonthIncome += income.amount;
      }
    }
  });

  // Process dividend transactions
  transactions.forEach((tx) => {
    if (tx.type === "dividend") {
      const txDate = parseDateString(tx.date);
      if (txDate) {
        const isInCurrentMonth = isWithinInterval(txDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        });

        if (isInCurrentMonth && txDate <= today) {
          currentMonthIncome += tx.amount ?? tx.totalAmount ?? 0;
        }
      }
    }
  });

  // Process fixed estimates (salary and other fixed income)
  fixedEstimates.forEach((fe) => {
    if (fe.type === "Salary" || !fe.isExpense) {
      let monthlyAmount = fe.amount;
      if (fe.period === "Yearly") monthlyAmount /= 12;
      else if (fe.period === "Quarterly") monthlyAmount /= 3;

      // If we're in the current month, add fixed income to current month income
      if (isSameMonth(today, month) && today.getDate() >= 1) {
        currentMonthIncome += monthlyAmount;
      }
    }
  });

  // Process certificate interest for current month
  const directDebtInvestments = investments.filter(
    (inv) => inv.type === "Debt Instruments",
  ) as DebtInstrumentInvestment[];

  directDebtInvestments.forEach((debt) => {
    if (debt.interestRate && debt.amountInvested) {
      const annualInterest = (debt.amountInvested * debt.interestRate) / 100;
      const monthlyInterest = annualInterest / 12;

      // Add interest to current month income if it's past the payout date
      if (debt.maturityDate) {
        const paymentDate = new Date(debt.maturityDate);
        if (paymentDate <= today && isSameMonth(paymentDate, month)) {
          currentMonthIncome += monthlyInterest;
        }
      }
    }
  });

  // Calculate net current month cash flow
  const netCurrentMonthCashFlow =
    currentMonthIncome -
    (summary.livingExpensesMonthly +
      summary.zakatFixedMonthly +
      summary.charityFixedMonthly +
      summary.otherFixedExpensesMonthly +
      summary.totalItemizedExpensesThisMonth);

  return {
    ...summary,
    currentMonthIncome,
    netCurrentMonthCashFlow,
  };
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

  // Calculate current month's income (sum of all income components)
  const currentMonthIncome =
    monthlySalary +
    otherFixedIncomeMonthly +
    totalManualIncomeThisMonth +
    totalProjectedCertificateInterestThisMonth;

  return {
    totalIncome,
    monthlySalary,
    otherFixedIncomeMonthly,
    totalManualIncomeThisMonth,
    totalProjectedCertificateInterestThisMonth,
    currentMonthIncome,
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
    netCurrentMonthCashFlow: netCashFlowThisMonth, // Alias for consistency with interface
  };
}
