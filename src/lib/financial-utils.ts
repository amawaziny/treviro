import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isSameMonth,
  addMonths,
  differenceInMonths,
  parseISO,
} from "date-fns";
import {
  type IncomeRecord,
  type ExpenseRecord,
  type Investment,
  type FixedEstimateRecord,
  type DebtInstrumentInvestment,
  type SecurityInvestment,
  type GoldInvestment,
  type RealEstateInvestment,
  type CurrencyInvestment,
  type Transaction,
  isRealEstateInvestment,
} from "@/lib/types";
import { parseDateString } from "./utils";

export interface CashFlowSummaryArgs {
  expenseRecords: ExpenseRecord[];
  investments: Investment[];
  fixedEstimates: FixedEstimateRecord[];
  transactions: Transaction[];
  month?: Date; // Defaults to current month if not provided
}

export interface CashFlowMonthlySummary {
  // Income
  totalIncome: number; // total income that already occurred and will be received this month (totalFixedIncome + totalProjectedDebtInterest + incomeTillNow)
  totalFixedIncome: number; // get all fixed estimates records of type income and sum up their amounts
  totalProjectedDebtInterest: number; // get all debt instruments investments and sum up their interest rates
  incomeTillNow: number; // sum of transactions that occurred this month of type INTEREST, DIVIDEND, INCOME, sell, matured debt

  // Expenses
  totalExpenses: number; // total of all expenses records occurred in this month and will be paid this month
  totalFixedExpenses: number; // get all fixed estimates records of type expense and sum up their amounts
  totalItemizedExpenses: number; // sum of credit card installments for current month
  totalRealEstateInstallments: number; // sum of real estate installments for current month

  // Investments
  totalInvestments: number; // sum of all investment types
  totalSecuritiesInvestments: number; // sum of buy transactions for securities
  totalDebtInvestments: number; // sum of buy transactions for debt instruments
  totalGoldInvestments: number; // sum of buy transactions for gold
  totalCurrencyInvestments: number; // sum of buy transactions for currencies

  // Summary
  netCashFlow: number; // totalIncome - totalExpenses - totalInvestments
  netTillNowCashFlow: number; // incomeTillNow - totalExpenses - totalInvestments
}

/**
 * @param expenseRecords calculate expenses of type credit card and has installments and sum up their amounts if month param is within the installment period
 * @param investments calculate projected debt interest and sum up their amounts if not matured and real estate installments based on their dueDate and installmentFrequency if it is quarterly distribute on 3 months
 * @param fixedEstimates calculate fixed estimates of type expense and income and sum up their amounts
 * @param transactions transactions date occurred in the same month param
 * @param month base month for the cashflow summary
 * @returns
 */
//TODO: move to cashflow service or hook
export function calculateCashFlowMonthlySummary({
  expenseRecords = [],
  investments = [],
  fixedEstimates = [],
  transactions = [],
  month = new Date(),
}: CashFlowSummaryArgs): CashFlowMonthlySummary {
  const currentMonthStart = startOfMonth(month);
  const currentMonthEnd = endOfMonth(month);

  // 1. Calculate totalFixedIncome (fixed estimates of type income)
  const totalFixedIncome = fixedEstimates
    .filter((fe) => !fe.isExpense)
    .reduce((sum, fe) => sum + fe.amount, 0);

  // 2. Calculate totalProjectedDebtInterest
  const totalProjectedDebtInterest = investments
    .filter(
      (inv): inv is DebtInstrumentInvestment => inv.type === "Debt Instruments",
    )
    .filter((inv) => !inv.isClosed)
    .reduce((sum, debtInv) => sum + debtInv.monthlyInterestAmount, 0);

  // 3. Calculate incomeTillNow (transactions in current month of specific types)
  const incomeTillNow = transactions
    .filter((tx) => {
      const isIncomeType = [
        "INTEREST",
        "DIVIDEND",
        "INCOME",
        "SELL",
        "MATURED_DEBT",
      ].includes(tx.type);
      return isIncomeType;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate transactions of type interest and income of type fixed estimate
  const totalInterestAndFixedIncome = transactions
    .filter(
      (tx) =>
        tx.type === "INTEREST" ||
        (tx.type === "INCOME" && tx.sourceType === "Fixed Estimate"),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  // 4. Calculate totalFixedExpenses (fixed estimates of type expense)
  const totalFixedExpenses = fixedEstimates
    .filter((fe) => fe.isExpense)
    .reduce((sum, fe) => sum + fe.amount, 0);

  // 5. Calculate totalItemizedExpenses (credit card installments for current month)
  const totalItemizedExpenses = expenseRecords
    .filter((record) => record.type === "Credit Card")
    .reduce((sum, record) => {
      const startDate = parseDateString(record.date);
      if (!startDate) return sum;

      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const currentMonth = currentMonthStart.getMonth();
      const currentYear = currentMonthStart.getFullYear();

      const monthsSinceStart =
        (currentYear - startYear) * 12 + (currentMonth - startMonth);

      record.numberOfInstallments = (record.numberOfInstallments ?? 0) || 1;

      if (
        monthsSinceStart >= 0 &&
        monthsSinceStart <= record.numberOfInstallments
      ) {
        return sum + record.amount / record.numberOfInstallments;
      }
      return sum;
    }, 0);

  // 6. Calculate totalRealEstateInstallments
  const totalRealEstateInstallments = investments
    .filter((inv): inv is RealEstateInvestment => {
      if (!isRealEstateInvestment(inv) || inv.isClosed) return false;
      return Boolean(
        differenceInMonths(
          parseDateString(inv.lastInstallmentDate)!,
          currentMonthStart,
        ) > 1 &&
          inv.installmentAmount &&
          inv.installmentFrequency,
      );
    })
    .reduce((sum, re) => {
      const startDate = parseDateString(re.firstInstallmentDate)!;
      const monthsDiff = differenceInMonths(currentMonthStart, startDate);
      let shouldIncludeInstallment = false;

      switch (re.installmentFrequency) {
        case "Monthly":
          shouldIncludeInstallment = monthsDiff < 1;
          break;
        case "Quarterly":
          shouldIncludeInstallment = monthsDiff < 3;
          break;
        case "Yearly":
          shouldIncludeInstallment = monthsDiff < 12;
          break;
      }

      if (shouldIncludeInstallment) {
        const installmentAmount = re.installmentAmount!;
        const monthlyInstallmentAmount =
          re.installmentFrequency === "Monthly"
            ? installmentAmount
            : re.installmentFrequency === "Quarterly"
              ? installmentAmount / 3
              : installmentAmount / 12;

        sum += monthlyInstallmentAmount;
      }

      // Add maintenance amount if applicable
      if (
        re.maintenanceAmount &&
        re.maintenanceAmount > 0 &&
        re.maintenancePaymentDate
      ) {
        const maintenanceDate = parseDateString(re.maintenancePaymentDate);
        if (
          maintenanceDate &&
          isWithinInterval(maintenanceDate, {
            start: currentMonthStart,
            end: currentMonthEnd,
          })
        ) {
          sum += re.maintenanceAmount;
        }
      }

      return sum;
    }, 0);

  // 7. Calculate investment totals
  const totalSecuritiesInvestments = transactions
    .filter(
      (tx) =>
        tx.type === "BUY" &&
        tx.sourceType === "Investment" &&
        tx.securityId &&
        tx.metadata.sourceSubType === "Securities",
    )
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalDebtInvestments = transactions
    .filter(
      (tx) =>
        tx.type === "BUY" &&
        tx.sourceType === "Investment" &&
        tx.metadata.sourceSubType === "Debt Instruments",
    )
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalGoldInvestments = transactions
    .filter(
      (tx) =>
        tx.type === "BUY" &&
        tx.sourceType === "Investment" &&
        tx.metadata.sourceSubType === "Gold",
    )
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalCurrencyInvestments = transactions
    .filter(
      (tx) =>
        tx.type === "BUY" &&
        tx.sourceType === "Investment" &&
        tx.metadata.sourceSubType === "Currencies",
    )
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalInvestments =
    totalSecuritiesInvestments +
    totalDebtInvestments +
    totalGoldInvestments +
    totalCurrencyInvestments +
    totalRealEstateInstallments;

  // Calculate totals
  const totalIncome =
    totalFixedIncome +
    totalProjectedDebtInterest +
    incomeTillNow -
    totalInterestAndFixedIncome;
  const totalExpenses = totalFixedExpenses + totalItemizedExpenses;
  const netCashFlow = totalIncome - totalExpenses - totalInvestments;
  const netTillNowCashFlow = incomeTillNow - totalExpenses - totalInvestments;
  return {
    // Income
    totalIncome,
    totalFixedIncome,
    totalProjectedDebtInterest,
    incomeTillNow,

    // Expenses
    totalExpenses,
    totalFixedExpenses,
    totalItemizedExpenses,
    totalRealEstateInstallments,

    // Investments
    totalInvestments,
    totalSecuritiesInvestments,
    totalDebtInvestments,
    totalGoldInvestments,
    totalCurrencyInvestments,

    // Summary
    netCashFlow,
    netTillNowCashFlow,
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
