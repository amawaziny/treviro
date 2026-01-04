import { useCallback, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  differenceInMonths,
} from "date-fns";
import {
  type ExpenseRecord,
  type Investment,
  type FixedEstimateRecord,
  type DebtInstrumentInvestment,
  type RealEstateInvestment,
  type Transaction,
  isRealEstateInvestment,
  isDebtInstrumentInvestment,
  isStockInvestment,
  SecurityInvestment,
} from "@/lib/types";
import {
  isCurrencyRelatedFund,
  isDebtRelatedFund,
  isGoldRelatedFund,
  isStockRelatedFund,
  parseDateString,
} from "@/lib/utils";
import { useEffect, useState } from "react";
import { calcDebtMonthlyInterest as calcProjectedDebtMonthlyInterest } from "@/lib/financial-utils";

export interface CashFlowSummaryArgs {
  expensesManualCreditCard: ExpenseRecord[];
  investments: Investment[];
  fixedEstimates: FixedEstimateRecord[];
  transactions: Transaction[];
  month?: Date;
}

/**
 * @param expensesManualCreditCard calculate expenses of type credit card and has installments and sum up their amounts if month param is within the installment period
 * @param investments calculate projected debt interest and sum up their amounts if not matured and real estate installments based on their dueDate and installmentFrequency if it is quarterly distribute on 3 months
 * @param fixedEstimates calculate fixed estimates of type expense and income and sum up their amounts
 * @param transactions transactions occurred in the same month param
 * @param month base month for the cashflow summary
 * @returns
 */
export function useCashflow({
  expensesManualCreditCard = [],
  investments = [],
  fixedEstimates = [],
  transactions = [],
  month,
}: CashFlowSummaryArgs) {
  const [currentMonthStart, setCurrentMonthStart] = useState<Date>( );
  const [currentMonthEnd, setCurrentMonthEnd] = useState<Date>();
  const [investmentTrxs, setInvestmentTrxs] = useState<Transaction[]>([]);
  const [totalFixedIncome, setTotalFixedIncome] = useState<number>(0);
  const [
    totalProjectedDebtMonthlyInterest,
    setTotalProjectedDebtMonthlyInterest,
  ] = useState<number>(0);
  const [incomeTillNow, setIncomeTillNow] = useState<number>(0);
  const [totalInterestAndFixedIncome, setTotalInterestAndFixedIncome] =
    useState<number>(0);
  const [totalFixedExpenses, setTotalFixedExpenses] = useState<number>(0);
  const [totalExpensesManualOther, setTotalExpensesManualOther] =
    useState<number>(0);
  const [totalExpensesManualCreditCard, setTotalExpensesManualCreditCard] =
    useState<number>(0);
  const [totalRealEstateInstallments, setTotalRealEstateInstallments] =
    useState<number>(0);
  const [totalSecuritiesInvestments, setTotalSecuritiesInvestments] =
    useState<number>(0);
  const [totalStockInvestments, setTotalStockInvestments] = useState<number>(0);
  const [totalDebtInvestments, setTotalDebtInvestments] = useState<number>(0);
  const [totalGoldInvestments, setTotalGoldInvestments] = useState<number>(0);
  const [totalCurrencyInvestments, setTotalCurrencyInvestments] =
    useState<number>(0);
  const [totalInvestments, setTotalInvestments] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [netCashFlow, setNetCashFlow] = useState<number>(0);
  const [netTillNowCashFlow, setNetTillNowCashFlow] = useState<number>(0);
  const [incomesFixed, setIncomesFixed] = useState<FixedEstimateRecord[]>([]);
  const [debtInvestments, setDebtInvestments] = useState<
    DebtInstrumentInvestment[]
  >([]);
  const [incomeTypesTrxs, setIncomeTypesTrxs] = useState<Transaction[]>([]);
  const [incomeManualTrxs, setIncomeManualTrxs] = useState<Transaction[]>([]);
  const [dividendTrxs, setDividendTrxs] = useState<Transaction[]>([]);
  const [interestAndFixedIncomeTrxs, setInterestAndFixedIncomeTrxs] = useState<
    Transaction[]
  >([]);
  const [expensesFixed, setExpensesFixed] = useState<FixedEstimateRecord[]>([]);
  const [expensesManualOtherTrxs, setExpensesManualOtherTrxs] = useState<
    Transaction[]
  >([]);
  const [realEstateInvestments, setRealEstateInvestments] = useState<
    RealEstateInvestment[]
  >([]);
  const [securitiesInvestmentTrxs, setSecuritiesInvestmentTrxs] = useState<
    Transaction[]
  >([]);
  const [stockInvestmentTrxs, setStockInvestmentTrxs] = useState<Transaction[]>(
    [],
  );
  const [debtInvestmentTrxs, setDebtInvestmentTrxs] = useState<Transaction[]>(
    [],
  );
  const [goldInvestmentTrxs, setGoldInvestmentTrxs] = useState<Transaction[]>(
    [],
  );
  const [currencyInvestmentTrxs, setCurrencyInvestmentTrxs] = useState<
    Transaction[]
  >([]);

  useEffect(() => {
    if (!month) return;
    setCurrentMonthStart(startOfMonth(month));
    setCurrentMonthEnd(endOfMonth(month));
    fetchInvestmentTransactions();
    calculateTotalFixedIncome();
    calculateTotalProjectedDebtMonthlyInterest();
    calculateIncomeTillNow();
    calculateTotalInterestAndFixedIncome();
    calculateTotalFixedExpenses();
    calculateTotalExpensesManualOther();
    calculateTotalExpensesManualCreditCard();
    calculateTotalRealEstateInstallments();
    calculateTotalSecuritiesInvestments();
    calculateTotalStockInvestments();
    calculateTotalDebtInvestments();
    calculateTotalGoldInvestments();
    calculateTotalCurrencyInvestments();
    calculateTotalInvestments();
    calculateTotalIncome();
    calculateTotalExpenses();
    calculateNetCashFlow();
    calculateNetTillNowCashFlow();
  }, [month]);

  const fetchInvestmentTransactions = useCallback(async () => {
    const investmentTrxs = transactions.filter(
      (tx) => tx.type === "BUY" && tx.sourceType === "Investment",
    );
    setInvestmentTrxs(investmentTrxs);
  }, [transactions]);

  const calculateTotalFixedIncome = useCallback(() => {
    const fixedIncomes = fixedEstimates.filter((fe) => !fe.isExpense);
    setIncomesFixed(fixedIncomes);
    setTotalFixedIncome(fixedIncomes.reduce((sum, fe) => sum + fe.amount, 0));
  }, [fixedEstimates]);

  const calculateTotalProjectedDebtMonthlyInterest = useCallback(() => {
    const debtInvestments = investments.filter(isDebtInstrumentInvestment);
    setDebtInvestments(debtInvestments);
    setTotalProjectedDebtMonthlyInterest(
      calcProjectedDebtMonthlyInterest(...debtInvestments),
    );
  }, [investments]);

  const calculateIncomeTillNow = useCallback(() => {
    const incomeTypesTrxs = transactions.filter((tx) => {
      const isIncomeType = [
        "INTEREST",
        "DIVIDEND",
        "INCOME",
        "SELL",
        "MATURED_DEBT",
      ].includes(tx.type);
      return isIncomeType;
    });
    setIncomeTypesTrxs(incomeTypesTrxs);

    setIncomeManualTrxs(
      incomeTypesTrxs.filter((tx) => {
        return tx.type === "INCOME" && tx.sourceType !== "Fixed Estimate";
      }),
    );

    setDividendTrxs(incomeTypesTrxs.filter((tx) => tx.type === "DIVIDEND"));

    setIncomeTillNow(incomeTypesTrxs.reduce((sum, tx) => sum + tx.amount, 0));
  }, [transactions]);

  const calculateTotalInterestAndFixedIncome = useCallback(() => {
    const interestAndFixedIncomeTrxs = transactions.filter(
      (tx) =>
        tx.type === "INTEREST" ||
        (tx.type === "INCOME" && tx.sourceType === "Fixed Estimate"),
    );
    setInterestAndFixedIncomeTrxs(interestAndFixedIncomeTrxs);

    setTotalInterestAndFixedIncome(
      interestAndFixedIncomeTrxs.reduce((sum, tx) => sum + tx.amount, 0),
    );
  }, [transactions]);

  const calculateTotalFixedExpenses = useCallback(() => {
    const fixedExpenses = fixedEstimates.filter((fe) => fe.isExpense);
    setExpensesFixed(fixedExpenses);

    setTotalFixedExpenses(
      fixedExpenses.reduce((sum, fe) => sum + fe.amount, 0),
    );
  }, [fixedEstimates]);

  const calculateTotalExpensesManualOther = useCallback(() => {
    const expensesManualOther = transactions.filter(
      (tx) =>
        tx.type === "EXPENSE" &&
        tx.sourceType === "Expense" &&
        tx.metadata.sourceSubType === "Other",
    );
    setExpensesManualOtherTrxs(expensesManualOther);

    setTotalExpensesManualOther(
      expensesManualOther.reduce((sum, tx) => sum + tx.amount, 0),
    );
  }, [transactions]);

  const calculateTotalExpensesManualCreditCard = useCallback(() => {
    if (!currentMonthStart) return;
    setTotalExpensesManualCreditCard(
      expensesManualCreditCard.reduce((sum, record) => {
        const startDate = parseDateString(record.date);
        if (!startDate) return sum;

        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const currentMonth = currentMonthStart.getMonth();
        const currentYear = currentMonthStart.getFullYear();

        const monthsSinceStart =
          (currentYear - startYear) * 12 + (currentMonth - startMonth);

        const numberOfInstallments = (record.numberOfInstallments ?? 0) || 1;

        if (monthsSinceStart >= 0 && monthsSinceStart < numberOfInstallments) {
          return sum + record.amount / numberOfInstallments;
        }
        return sum;
      }, 0),
    );
  }, [expensesManualCreditCard, currentMonthStart]);

  const calculateTotalRealEstateInstallments = useCallback(() => {
    if (!currentMonthStart || !currentMonthEnd) return;
    const realEstateInvestments = new Map<string, RealEstateInvestment>();

    setTotalRealEstateInstallments(
      investments
        .filter((inv): inv is RealEstateInvestment => {
          return (
            isRealEstateInvestment(inv) &&
            Boolean(
              differenceInMonths(
                parseDateString(inv.lastInstallmentDate)!,
                currentMonthStart,
              ) > 1 &&
                inv.installmentAmount &&
                inv.installmentFrequency,
            )
          );
        })
        .reduce((sum, reInv) => {
          const startDate = parseDateString(reInv.firstInstallmentDate)!;
          const monthsDiff = differenceInMonths(currentMonthStart, startDate);
          let shouldIncludeInstallment = false;

          switch (reInv.installmentFrequency) {
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
            const installmentAmount = reInv.installmentAmount!;
            const monthlyInstallmentAmount =
              reInv.installmentFrequency === "Monthly"
                ? installmentAmount
                : reInv.installmentFrequency === "Quarterly"
                  ? installmentAmount / 3
                  : installmentAmount / 12;

            sum += monthlyInstallmentAmount;
            if (!realEstateInvestments.has(reInv.id)) {
              realEstateInvestments.set(reInv.id, reInv);
            }
          }

          // Add maintenance amount if applicable
          if (
            reInv.maintenanceAmount &&
            reInv.maintenanceAmount > 0 &&
            reInv.maintenancePaymentDate
          ) {
            const maintenanceDate = parseDateString(
              reInv.maintenancePaymentDate,
            );
            if (
              maintenanceDate &&
              isWithinInterval(maintenanceDate, {
                start: currentMonthStart,
                end: currentMonthEnd,
              })
            ) {
              sum += reInv.maintenanceAmount;
              if (!realEstateInvestments.has(reInv.id)) {
                realEstateInvestments.set(reInv.id, reInv);
              }
            }
          }

          return sum;
        }, 0),
    );
    setRealEstateInvestments(Array.from(realEstateInvestments.values()));
  }, [investments, currentMonthStart, currentMonthEnd]);

  const calculateTotalSecuritiesInvestments = useCallback(() => {
    const securitiesInvestments = investmentTrxs.filter(
      (tx) => tx.securityId && tx.metadata.sourceSubType === "Securities",
    );
    setSecuritiesInvestmentTrxs(securitiesInvestments);

    setTotalSecuritiesInvestments(
      securitiesInvestments.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    );
  }, [investmentTrxs]);

  const calculateTotalStockInvestments = useCallback(() => {
    const stockInvestmentTrxs = investmentTrxs.filter(
      (tx) =>
        tx.securityId &&
        isStockInvestment(tx.metadata as unknown as SecurityInvestment),
    );
    setStockInvestmentTrxs(stockInvestmentTrxs);

    setTotalStockInvestments(
      stockInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    );
  }, [investmentTrxs]);

  const calculateTotalDebtInvestments = useCallback(() => {
    const debtInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Debt Instruments" ||
        isDebtRelatedFund(metadata.fundType),
    );
    setDebtInvestmentTrxs(debtInvestmentTrxs);

    setTotalDebtInvestments(
      debtInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    );
  }, [investmentTrxs]);

  const calculateTotalGoldInvestments = useCallback(() => {
    const goldInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Gold" ||
        isGoldRelatedFund(metadata.fundType),
    );
    setGoldInvestmentTrxs(goldInvestmentTrxs);

    setTotalGoldInvestments(
      goldInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    );
  }, [investmentTrxs]);

  const calculateTotalCurrencyInvestments = useCallback(() => {
    const currencyInvestmentTrxs = investmentTrxs.filter(
      ({ metadata }) =>
        metadata.sourceSubType === "Currencies" ||
        isCurrencyRelatedFund(metadata.fundType),
    );
    setCurrencyInvestmentTrxs(currencyInvestmentTrxs);

    setTotalCurrencyInvestments(
      currencyInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    );
  }, [investmentTrxs]);

  const calculateTotalInvestments = useCallback(() => {
    setTotalInvestments(
      totalSecuritiesInvestments +
        totalDebtInvestments +
        totalGoldInvestments +
        totalCurrencyInvestments +
        totalRealEstateInstallments,
    );
  }, [
    totalSecuritiesInvestments,
    totalDebtInvestments,
    totalGoldInvestments,
    totalCurrencyInvestments,
    totalRealEstateInstallments,
  ]);

  const calculateTotalIncome = useCallback(() => {
    setTotalIncome(
      totalFixedIncome +
        totalProjectedDebtMonthlyInterest +
        incomeTillNow -
        totalInterestAndFixedIncome,
    );
  }, [
    totalFixedIncome,
    totalProjectedDebtMonthlyInterest,
    incomeTillNow,
    totalInterestAndFixedIncome,
  ]);

  const calculateTotalExpenses = useCallback(() => {
    setTotalExpenses(
      totalFixedExpenses +
        totalExpensesManualCreditCard +
        totalExpensesManualOther,
    );
  }, [
    totalFixedExpenses,
    totalExpensesManualCreditCard,
    totalExpensesManualOther,
  ]);

  const calculateNetCashFlow = useCallback(() => {
    setNetCashFlow(totalIncome - totalExpenses - totalInvestments);
  }, [totalIncome, totalExpenses, totalInvestments]);

  const calculateNetTillNowCashFlow = useCallback(() => {
    setNetTillNowCashFlow(incomeTillNow - totalExpenses - totalInvestments);
  }, [incomeTillNow, totalExpenses, totalInvestments]);

  return {
    // Income
    incomesFixed,
    incomeTypesTrxs,
    incomeManualTrxs,
    dividendTrxs,
    interestAndFixedIncomeTrxs,
    totalIncome,
    totalFixedIncome,
    totalProjectedDebtMonthlyInterest,
    incomeTillNow,

    // Expenses
    expensesFixed,
    totalFixedExpenses,
    expensesManualOtherTrxs,
    totalExpenses,
    totalExpensesManualCreditCard,
    totalExpensesManualOther,
    totalRealEstateInstallments,

    // Investments
    stockInvestmentTrxs,
    securitiesInvestmentTrxs,
    debtInvestmentTrxs,
    goldInvestmentTrxs,
    currencyInvestmentTrxs,
    debtInvestments,
    realEstateInvestments,
    totalInvestments,
    totalStockInvestments,
    totalSecuritiesInvestments,
    totalDebtInvestments,
    totalGoldInvestments,
    totalCurrencyInvestments,

    // Summary
    netCashFlow,
    netTillNowCashFlow,
  };
}
