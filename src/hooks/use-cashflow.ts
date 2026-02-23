import { useCallback, useMemo } from "react";
import { isWithinInterval, differenceInMonths, set } from "date-fns";
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
} from "@/lib/utils";
import { useEffect, useState } from "react";
import { calcDebtMonthlyInterest as calcProjectedDebtMonthlyInterest } from "@/lib/financial-utils";

export interface CashFlowSummaryArgs {
  expensesManualCreditCard: ExpenseRecord[];
  investments: Investment[];
  fixedEstimates: FixedEstimateRecord[];
  transactions: Transaction[];
  startMonth: Date;
  endMonth: Date;
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
  startMonth,
  endMonth,
}: CashFlowSummaryArgs) {
  const [investmentTrxs, setInvestmentTrxs] = useState<Transaction[]>([]);
  const [
    totalProjectedDebtMonthlyInterest,
    setTotalProjectedDebtMonthlyInterest,
  ] = useState<number>(0);
  const [incomeTillNow, setIncomeTillNow] = useState<number>(0);
  const [totalExpensesTrxs, setTotalExpensesTrxs] = useState<number>(0);
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
  const [principalReturned, setPrincipalReturned] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalIncomesFixedPlanned, setTotalIncomesFixedPlanned] =
    useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalFixedExpensesPlanned, setTotalFixedExpensesPlanned] =
    useState<number>(0);
  const [
    totalExpensesManualCreditCardPlanned,
    setTotalExpensesManualCreditCardPlanned,
  ] = useState<number>(0);
  const [netCashFlow, setNetCashFlow] = useState<number>(0);
  const [netTillNowCashFlow, setNetTillNowCashFlow] = useState<number>(0);
  const [incomesFixedPlanned, setIncomesFixedPlanned] = useState<
    FixedEstimateRecord[]
  >([]);
  const [debtInvestments, setDebtInvestments] = useState<
    DebtInstrumentInvestment[]
  >([]);
  const [incomesTrxs, setIncomesTrxs] = useState<Transaction[]>([]);
  const [expensesFixedPlanned, setExpensesFixedPlanned] = useState<
    FixedEstimateRecord[]
  >([]);
  const [expensesTrxs, setExpensesTrxs] = useState<Transaction[]>([]);
  const [expensesManualCreditCardPlanned, setExpensesManualCreditCardPlanned] =
    useState<ExpenseRecord[]>([]);
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

  const fetchInvestmentTransactions = useCallback(async () => {
    const investmentTrxs = transactions.filter(
      (tx) => tx.type === "BUY" && tx.sourceType === "Investment",
    );
    setInvestmentTrxs(investmentTrxs);
  }, [transactions]);

  const calculateTotalFixedIncomePlanned = useCallback(() => {
    const fixedIncomes = fixedEstimates.filter((fe) => !fe.isExpense);
    const incomesPlanned = fixedIncomes.filter(
      (income) => !incomesTrxs.find((trx) => trx.sourceId === income.id),
    );
    setIncomesFixedPlanned(incomesPlanned);
    setTotalIncomesFixedPlanned(
      incomesPlanned.reduce((sum, tx) => sum + tx.amount, 0),
    );
  }, [fixedEstimates, incomesTrxs]);

  const calculateTotalProjectedDebtMonthlyInterest = useCallback(() => {
    const debtInvestments = investments.filter(isDebtInstrumentInvestment);
    setDebtInvestments(debtInvestments);

    const interestTrxs = transactions.filter((tx) => tx.type === "INTEREST");
    const debtInvestmentsPlanned = debtInvestments.filter(
      (inv) => !interestTrxs.find((tx) => tx.sourceId === inv.id),
    );
    setTotalProjectedDebtMonthlyInterest(
      calcProjectedDebtMonthlyInterest(...debtInvestmentsPlanned),
    );
  }, [investments, transactions]);

  const calculateIncomeTillNow = useCallback(() => {
    const incomesTrxs = transactions.filter((tx) => {
      const isIncomeType = [
        "DIVIDEND", //Passive income
        "INCOME", //Active income
        "INTEREST", //Passive income
        "SELL", //RealizedPnL - Passive income
      ].includes(tx.type);
      return isIncomeType;
    });

    const incomesGroupedBySourcIdTrxs =
      groupTransactionsBySourceIdAndTxType(incomesTrxs);
    setIncomesTrxs(incomesGroupedBySourcIdTrxs);

    setPrincipalReturned(
      transactions
        .filter((tx) => {
          const investToCash = ["MATURED_DEBT", "SELL"].includes(tx.type);
          return investToCash;
        })
        .reduce((sum, tx) => sum + tx.amount, 0),
    );

    setIncomeTillNow(
      incomesGroupedBySourcIdTrxs.reduce((sum, tx) => sum + tx.amount, 0),
    );
  }, [transactions]);

  const calculateTotalFixedExpenses = useCallback(() => {
    const fixedExpenses = fixedEstimates.filter((fe) => fe.isExpense);

    const expensesFixedPlanned = fixedExpenses.filter(
      (expense) => !expensesTrxs.find((trx) => trx.sourceId === expense.id),
    );
    setExpensesFixedPlanned(expensesFixedPlanned);

    const totalExpensesFixedPlanned = expensesFixedPlanned.reduce(
      (sum, fe) => sum + fe.amount,
      0,
    );
    setTotalFixedExpensesPlanned(totalExpensesFixedPlanned);
  }, [fixedEstimates, expensesTrxs]);

  const calculateTotalExpensesTrxs = useCallback(() => {
    const expenses = transactions.filter((tx) => tx.type === "EXPENSE");
    setExpensesTrxs(groupTransactionsBySourceIdAndTxType(expenses));

    setTotalExpensesTrxs(expenses.reduce((sum, tx) => sum + tx.amount, 0));
  }, [transactions]);

  const calculateTotalExpensesManualCreditCard = useCallback(() => {
    const expensesManualCreditCardPlanned = expensesManualCreditCard.filter(
      (expense) => {
        const notFound = !expensesTrxs.find((tx) => tx.sourceId === expense.id);
        if (notFound) {
          const recordDate = expense.date!;

          const recordMonth = recordDate.getMonth();
          const recordYear = recordDate.getFullYear();
          const month = endMonth.getMonth();
          const year = endMonth.getFullYear();

          const monthsSinceStart =
            (year - recordYear) * 12 + (month - recordMonth);

          const numberOfInstallments = (expense.numberOfInstallments ?? 0) || 1;

          if (
            monthsSinceStart >= 0 &&
            monthsSinceStart < numberOfInstallments
          ) {
            return expense;
          }
        }
      },
    );
    setExpensesManualCreditCardPlanned(expensesManualCreditCardPlanned);

    setTotalExpensesManualCreditCardPlanned(
      expensesManualCreditCardPlanned.reduce(
        (sum, record) => sum + (record._requiredAmount ?? record.amount),
        0,
      ),
    );
  }, [expensesManualCreditCard, expensesTrxs, endMonth]);

  const calculateTotalRealEstateInstallments = useCallback(() => {
    const realEstateInvestments = new Map<string, RealEstateInvestment>();

    setTotalRealEstateInstallments(
      investments
        .filter((inv): inv is RealEstateInvestment => {
          return (
            isRealEstateInvestment(inv) &&
            Boolean(
              differenceInMonths(inv.lastInstallmentDate!, startMonth) > 1 &&
                inv.installmentAmount &&
                inv.installmentFrequency,
            )
          );
        })
        .reduce((sum, reInv) => {
          const monthsDiff = differenceInMonths(
            startMonth,
            reInv.firstInstallmentDate,
          );
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
            const maintenanceDate = reInv.maintenancePaymentDate;
            if (
              maintenanceDate &&
              isWithinInterval(maintenanceDate, {
                start: startMonth,
                end: endMonth,
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
  }, [investments, startMonth, endMonth]);

  const calculateTotalSecuritiesInvestments = useCallback(() => {
    const securitiesInvestments = investmentTrxs.filter(
      (tx) => tx.securityId && tx.metadata.sourceSubType === "Securities",
    );
    setSecuritiesInvestmentTrxs(securitiesInvestments);

    setTotalSecuritiesInvestments(
      Math.abs(
        securitiesInvestments.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      ),
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
      Math.abs(
        stockInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      ),
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
      Math.abs(
        debtInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      ),
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
      Math.abs(
        goldInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      ),
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
      Math.abs(
        currencyInvestmentTrxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      ),
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
      totalIncomesFixedPlanned +
        totalProjectedDebtMonthlyInterest +
        incomeTillNow,
    );
  }, [
    totalProjectedDebtMonthlyInterest,
    incomeTillNow,
    totalIncomesFixedPlanned,
  ]);

  const calculateTotalExpenses = useCallback(() => {
    setTotalExpenses(
      totalFixedExpensesPlanned +
        totalExpensesManualCreditCardPlanned +
        totalExpensesTrxs,
    );
  }, [
    totalFixedExpensesPlanned,
    totalExpensesManualCreditCardPlanned,
    totalExpensesTrxs,
  ]);

  const calculateNetCashFlow = useCallback(() => {
    setNetCashFlow(totalIncome + totalExpenses - totalInvestments);
  }, [totalIncome, totalExpenses, totalInvestments]);

  const calculateNetTillNowCashFlow = useCallback(() => {
    setNetTillNowCashFlow(incomeTillNow + totalExpenses - totalInvestments);
  }, [incomeTillNow, totalExpenses, totalInvestments]);

  // First effect: Process investment transactions
  useEffect(() => {
    fetchInvestmentTransactions();
  }, [fetchInvestmentTransactions]);

  // Second effect: Calculate investments based on processed investment transactions
  useEffect(() => {
    calculateTotalSecuritiesInvestments();
    calculateTotalStockInvestments();
    calculateTotalDebtInvestments();
    calculateTotalGoldInvestments();
    calculateTotalCurrencyInvestments();
  }, [
    calculateTotalSecuritiesInvestments,
    calculateTotalStockInvestments,
    calculateTotalDebtInvestments,
    calculateTotalGoldInvestments,
    calculateTotalCurrencyInvestments,
  ]);

  // Main effect: Calculate all other values
  useEffect(() => {
    calculateTotalFixedIncomePlanned();
    calculateTotalProjectedDebtMonthlyInterest();
    calculateIncomeTillNow();
    calculateTotalFixedExpenses();
    calculateTotalExpensesTrxs();
    calculateTotalExpensesManualCreditCard();
    calculateTotalRealEstateInstallments();
    calculateTotalInvestments();
    calculateTotalIncome();
    calculateTotalExpenses();
    calculateNetCashFlow();
    calculateNetTillNowCashFlow();
  }, [
    expensesManualCreditCard,
    investments,
    fixedEstimates,
    transactions,
    startMonth,
    endMonth,
    calculateTotalProjectedDebtMonthlyInterest,
    calculateIncomeTillNow,
    calculateTotalExpensesTrxs,
    calculateTotalRealEstateInstallments,
    calculateTotalInvestments,
    calculateTotalIncome,
    calculateTotalExpenses,
    calculateNetCashFlow,
    calculateNetTillNowCashFlow,
  ]);

  return {
    // Income
    incomesFixedPlanned,
    incomesTrxs,
    totalIncome,
    totalProjectedDebtMonthlyInterest,
    incomeTillNow,

    // Expenses
    expensesFixedPlanned,
    expensesTrxs,
    expensesManualCreditCardPlanned,
    totalExpenses,
    totalExpensesTrxs,

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
    totalRealEstateInstallments,

    // Summary
    netCashFlow,
    principalReturned,
    netTillNowCashFlow,
  };

  function groupTransactionsBySourceIdAndTxType(transactions: Transaction[]) {
    const groupedBySourceId = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .reduce(
        (acc, tx) => {
          const key = tx.sourceId + tx.type;
          const amount = tx.type === "SELL" ? tx.profitOrLoss || 0 : tx.amount;
          if (!acc[key]) {
            acc[key] = { ...tx, amount: amount };
          } else {
            acc[key].amount += amount;
          }
          return acc;
        },
        {} as Record<string, Transaction>,
      );

    return Object.values(groupedBySourceId);
  }
}
