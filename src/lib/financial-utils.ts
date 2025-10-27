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
  SecurityInvestment,
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
  transactions: Transaction[];
  month?: Date; // Defaults to current month if not provided
}

export interface CashFlowMonthlySummary {
  totalIncome: number;//total income that already occurred and will be received this month
  salary: number;//TODO: remove this
  totalFixedIncome: number;
  totalManualIncome: number;
  totalProjectedDebtInterest: number;
  incomeTillNow: number;

  // Expenses
  totalExpenses: number;
  livingExpenses: number; //TODO: remove this
  zakat: number;//TODO: remove this
  charity: number;//TODO: remove this
  totalFixedExpenses: number;
  totalRealEstateInstallments: number;
  totalItemizedExpenses: number; // For regular expenses, check if they occurred in the current month

  // Investments
  totalInvestments: number;
  totalSecuritiesInvestments: number;
  totalDebtInvestments: number;
  totalGoldInvestments: number;
  totalCurrencyInvestments: number;
  totalInvestmentsOnly: number;//TODO: remove this
  totalSecuritiesDividend: number;

  // Summary
  netCashFlow: number;
  netTillNowCashFlow: number;
}

/*
  TODO: Refactor this function to calculate monthly cashflow from transactions
  1.totalIncome: number; total income that already occurred and will be received this month (totalFixedIncome+totalProjectedDebtInterest+incomeTillNow)
  2.totalFixedIncome: number; get all fixed estimates records of type income and sum up their amounts
  3.totalProjectedDebtInterest: number; get all debt instruments investments and sum up their interest rates based on their first purchase date and frequency
  4.incomeTillNow: number; to calculate totalIncome loop through all transactions and sum up the amount of transactions that occurred in this month and transaction of type INTEREST, DIVIDEND, INCOME, sell, matured debt

  // Expenses
  5.totalExpenses: total of all expenses records occurred in this month and will be paid this month (totalFixedExpenses+totalRealEstateInstallments+totalItemizedExpenses)
  6.totalFixedExpenses: get all fixed estimates records of type expense and sum up their amounts;
  7.totalItemizedExpenses: number; // get all expenses records and with type credit card and isInstallment true and sum up their amounts if current month is within the installment period

  // Investments
  8.totalInvestments: number; sum up totalStockInvestments+totalDebtInvestments+totalGoldInvestments+totalCurrencyInvestments
  9.totalSecuritiesInvestments: number; get all transactions of type buy and sourceType investment and has securityId and metadata.sourceSubType = "Securities" and sum up their amounts
  10.totalDebtInvestments: number; get all transactions of type buy and sourceType investment and metadata.sourceSubType = "Debt Instruments" and sum up their amounts
  11.totalGoldInvestments: number; get all transactions of type buy and sourceType investment and metadata.sourceSubType = "Gold" and sum up their amounts
  12.totalCurrencyInvestments: number; get all transactions of type buy and sourceType investment and metadata.sourceSubType = "Currencies" and sum up their amounts
  13.totalRealEstateInstallments: get all real estate investments and sum up their installments based on their dueDate and installmentFrequency if it is quarterly distribute on 3 months

  // Summary
  15.netCashFlow: number; totalIncome - totalExpenses - totalInvestments
  16.netTillNowCashFlow: number; incomeTillNow - totalExpenses - totalInvestments
*/
export function calculateCashFlowMonthlySummary({
  incomeRecords = [],
  expenseRecords = [],
  investments = [],
  fixedEstimates = [],
  transactions = [],
  month = new Date(),
}: CashFlowSummaryArgs): CashFlowMonthlySummary {
  const currentMonthStart = startOfMonth(month);
  const currentMonthEnd = endOfMonth(month);
  const today = new Date();

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

  // Projected certificate interest (from all debt instruments)
  let totalProjectedCertificateInterestThisMonth = 0;
  (investments || []).forEach((inv) => {
    if (inv.type === "Debt Instruments") {
      const debtInv = inv as DebtInstrumentInvestment;

      // Calculate monthly interest based on amount and rate
      if (
        debtInv.interestRate &&
        debtInv.totalInvested &&
        debtInv.firstPurchaseDate
      ) {
        const purchaseDate = parseDateString(debtInv.firstPurchaseDate);
        const maturityDate = debtInv.maturityDate
          ? parseDateString(debtInv.maturityDate)
          : null;

        if (purchaseDate && maturityDate) {
          // Only include interest if current month is between purchase and maturity dates
          const currentMonthStart = startOfMonth(month);
          const currentMonthEnd = endOfMonth(month);

          // Check if current month overlaps with the investment period
          if (
            currentMonthStart <= maturityDate &&
            currentMonthEnd >= purchaseDate
          ) {
            const annualInterest =
              (debtInv.totalInvested * debtInv.interestRate) / 100;
            const monthlyInterest = annualInterest / 12;
            totalProjectedCertificateInterestThisMonth += monthlyInterest;
          }
        }
      }
    }
  });

  // Expenses breakdown
  let totalItemizedExpensesThisMonth = 0;
  (expenseRecords || []).forEach((record) => {
    const date = parseDateString(record.date);

    // Check if this is a credit card installment
    if (
      record.type === "Credit Card" &&
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
      if (inv.type === "Securities")
        totalStockInvestmentThisMonth +=
          (inv as SecurityInvestment).amountInvested || 0;
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

  // Process dividend transactions
  let stockDividendThisMonth = 0;
  transactions.forEach((tx) => {
    if (tx.type === "dividend") {
      const txDate = parseDateString(tx.date);
      if (txDate) {
        const isInCurrentMonth = isWithinInterval(txDate, {
          start: currentMonthStart,
          end: currentMonthEnd,
        });

        if (isInCurrentMonth && txDate <= today) {
          stockDividendThisMonth += tx.amount ?? tx.totalAmount ?? 0;
        }
      }
    }
  });

  // Totals
  const totalIncome =
    monthlySalary +
    otherFixedIncomeMonthly +
    totalManualIncomeThisMonth +
    totalProjectedCertificateInterestThisMonth +
    stockDividendThisMonth;
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
  let proratedCertificateInterest = 0;

  if (isSameMonth(today, month)) {
    const currentDay = today.getDate();

    // Calculate interest for certificates with day <= currentDay
    (investments || []).forEach((inv) => {
      if (inv.type === "Debt Instruments") {
        const debtInv = inv as DebtInstrumentInvestment;

        // Only include certificates with day <= currentDay
        if (
          debtInv.interestRate &&
          debtInv.amountInvested &&
          !debtInv.isMatured
        ) {
          const maturityDate = debtInv.maturityDate
            ? parseDateString(debtInv.maturityDate)
            : null;

          // If purchase date exists and is in the current month, check the day
          if (maturityDate && maturityDate.getDate() <= currentDay) {
            const monthlyInterest =
              (debtInv.amountInvested * debtInv.interestRate) / 100 / 12;
            proratedCertificateInterest += monthlyInterest;
          }
        }
      }
    });
  } else {
    // For past months, use the full projected interest
    proratedCertificateInterest = totalProjectedCertificateInterestThisMonth;
  }

  const currentMonthIncome =
    monthlySalary +
    otherFixedIncomeMonthly +
    totalManualIncomeThisMonth +
    proratedCertificateInterest;

  return {
    totalIncome,
    salary: monthlySalary,
    totalFixedIncome: otherFixedIncomeMonthly,
    totalManualIncome: totalManualIncomeThisMonth,
    totalProjectedDebtInterest: totalProjectedCertificateInterestThisMonth,
    incomeTillNow: currentMonthIncome,
    totalExpenses: totalExpensesOnly,
    livingExpenses: livingExpensesMonthly,
    zakat: zakatFixedMonthly,
    charity: charityFixedMonthly,
    totalFixedExpenses: otherFixedExpensesMonthly,
    totalRealEstateInstallments: realEstateInstallmentsMonthly,
    totalItemizedExpenses: totalItemizedExpensesThisMonth,
    totalInvestments: totalInvestmentsThisMonth,
    totalSecuritiesInvestments: totalStockInvestmentThisMonth,
    totalDebtInvestments: totalDebtInvestmentThisMonth,
    totalGoldInvestments: totalGoldInvestmentThisMonth,
    totalCurrencyInvestments: totalCurrencyInvestmentThisMonth,
    totalInvestmentsOnly,
    netCashFlow: netCashFlowThisMonth,
    totalSecuritiesDividend: stockDividendThisMonth,
    netTillNowCashFlow: netCashFlowThisMonth, // Alias for consistency with interface
  };
}

export function calcProfit(
  invNumberOfShares: number,
  invPurchasePricePerShare: number,
  securityPrice: number,
) {
  let profitLoss = 0;
  let profitLossPercent = 0;
  let isProfitable = false;
  let totalCost = invPurchasePricePerShare * invNumberOfShares;
  let totalCurrentValue = 0;

  if (securityPrice !== undefined && invNumberOfShares > 0) {
    totalCurrentValue = securityPrice * invNumberOfShares;
    profitLoss = totalCurrentValue - totalCost;

    if (totalCost > 0) {
      profitLossPercent = (profitLoss / totalCost) * 100;
    } else if (totalCurrentValue > 0) {
      profitLossPercent = Infinity; // All profit if cost was 0
    }

    isProfitable = profitLoss >= 0;
  }
  return {
    isProfitable,
    profitLoss,
    totalCost,
    profitLossPercent,
    totalCurrentValue,
  };
}
