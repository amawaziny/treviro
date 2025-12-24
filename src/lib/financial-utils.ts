import { DebtInstrumentInvestment } from "./types";

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

export function calcDebtMonthlyInterest(
  ...debtInvestments: DebtInstrumentInvestment[]
) {
  return debtInvestments.reduce(
    (sum, debtInv) => sum + debtInv.monthlyInterestAmount,
    0,
  );
}
