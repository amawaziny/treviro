
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;
export const goldTypes = ['K24', 'K21', 'Pound', 'Ounce'] as const;
export const debtSubTypes = ['Certificate', 'Treasury Bill', 'Bond', 'Other'] as const;
export const propertyTypes = ['Residential', 'Commercial', 'Land'] as const;
export const incomeTypes = ['Salary', 'Profit Share', 'Bonus', 'Gift', 'Rental Income', 'Freelance', 'Other'] as const;

// Helper for transforming string to number or undefined, and ensuring it's positive if not undefined
const stringToOptionalPositiveNumber = z.string().transform(val => val === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional());
const stringToPositiveNumber = z.string().transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }));

const stringToOptionalPositiveInteger = z.string().transform(val => val === "" ? undefined : parseInt(val, 10)).pipe(z.number().int().positive({ message: "Must be a positive whole number." }).optional());
const stringToPositiveInteger = z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive({ message: "Must be a positive whole number." }));

// Helper for transforming string to number, defaulting to a value if empty/invalid, and ensuring it's non-negative
const stringToNonNegativeNumberOrDefault = (defaultValue: number) =>
  z.string().transform(val => {
    const num = parseFloat(val);
    return isNaN(num) || val.trim() === "" ? defaultValue : num; // Ensure empty string also defaults
  }).pipe(z.number().min(0, { message: "Cannot be negative." }));


export const AddInvestmentSchema = z.object({
  name: z.string().optional(),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }).optional(),

  amountInvested: stringToOptionalPositiveNumber,
  purchaseDate: z.string().optional(),

  // Stocks
  selectedStockId: z.string().optional(),
  numberOfShares: stringToOptionalPositiveInteger,
  purchasePricePerShare: stringToOptionalPositiveNumber,
  purchaseFees: stringToNonNegativeNumberOrDefault(0),

  // Gold
  goldType: z.enum(goldTypes).optional(),
  quantityInGrams: stringToOptionalPositiveNumber,

  // Currencies
  currencyCode: z.string().optional(),
  foreignCurrencyAmount: stringToOptionalPositiveNumber,
  exchangeRateAtPurchase: stringToOptionalPositiveNumber,

  // Real Estate
  propertyAddress: z.string().optional(),
  propertyType: z.enum(propertyTypes).optional(),

  // Debt Instruments
  debtSubType: z.enum(debtSubTypes).optional(),
  issuer: z.string().optional(),
  interestRate: stringToOptionalPositiveNumber,
  maturityDate: z.string().optional().refine((dateStr) => {
    if (!dateStr || dateStr.trim() === "") return true;
    return !isNaN(Date.parse(dateStr));
  }, { message: "Invalid maturity date format."}),

}).superRefine((data, ctx) => {
  const effectiveType = data.type;

  const isPurchaseDateRequiredForType =
    effectiveType === 'Stocks' ||
    effectiveType === 'Gold' ||
    effectiveType === 'Currencies' ||
    effectiveType === 'Real Estate' ||
    (effectiveType === 'Debt Instruments' && data.debtSubType !== 'Certificate');

  if (isPurchaseDateRequiredForType) {
    if (!data.purchaseDate || data.purchaseDate.trim() === "" || isNaN(Date.parse(data.purchaseDate))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase date is required.", path: ["purchaseDate"] });
    }
  }


  if (effectiveType === 'Stocks') {
    if (!data.selectedStockId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a security.", path: ["selectedStockId"] });
    }
    if (data.numberOfShares === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities is required.", path: ["numberOfShares"] });
    }
    if (data.purchasePricePerShare === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase price is required.", path: ["purchasePricePerShare"] });
    }
  } else if (effectiveType === 'Real Estate' || effectiveType === 'Gold' || effectiveType === 'Debt Instruments' || effectiveType === 'Currencies') {
     // Amount invested is derived for Stocks and Currencies, so only validate for others
     if (effectiveType !== 'Stocks' && effectiveType !== 'Currencies') {
        if (data.amountInvested === undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount invested is required.", path: ["amountInvested"] });
        }
     }
  }


  if (effectiveType === 'Gold') {
    if (!data.goldType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Gold type is required.", path: ["goldType"] });
    }
    if (data.quantityInGrams === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity / Units is required.", path: ["quantityInGrams"] });
    }
  }
  if (effectiveType === 'Currencies') {
    if (!data.currencyCode || data.currencyCode.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Transaction currency code is required.", path: ["currencyCode"] });
    }
    if (data.foreignCurrencyAmount === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Foreign currency amount is required.", path: ["foreignCurrencyAmount"] });
    }
    if (data.exchangeRateAtPurchase === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exchange rate at purchase is required.", path: ["exchangeRateAtPurchase"] });
    }
  }
  if (effectiveType === 'Debt Instruments') {
    if (!data.debtSubType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Specific debt type is required.", path: ["debtSubType"]});
    }
    if (!data.issuer || data.issuer.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Issuer is required.", path: ["issuer"]});
    }
    if (data.interestRate === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interest rate is required.", path: ["interestRate"]});
    }
    if (!data.maturityDate || data.maturityDate.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maturity date is required.", path: ["maturityDate"]});
    }
    if (data.amountInvested === undefined) { // Amount invested is required for Debt
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total amount invested is required.", path: ["amountInvested"] });
    }
  }
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;


export const SellStockSchema = z.object({
  stockId: z.string(),
  numberOfSharesToSell: stringToPositiveInteger
    .refine(val => val !== undefined, { message: "Number of securities is required." }),
  sellPricePerShare: stringToPositiveNumber
    .refine(val => val !== undefined, { message: "Sell price is required." }),
  sellDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: stringToNonNegativeNumberOrDefault(0),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  numberOfShares: stringToPositiveInteger
    .refine(val => val !== undefined, { message: "Number of securities is required." }),
  purchasePricePerShare: stringToPositiveNumber
    .refine(val => val !== undefined, { message: "Purchase price is required." }),
  purchaseFees: stringToNonNegativeNumberOrDefault(0),
});
export type EditStockInvestmentFormValues = z.infer<typeof EditStockInvestmentSchema>;


export const AddIncomeSchema = z.object({
  type: z.enum(incomeTypes, { required_error: "Income type is required." }),
  source: z.string().optional(),
  amount: stringToPositiveNumber.refine(val => val !== undefined, { message: "Amount is required." }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Date is required." }),
  description: z.string().optional(),
});

export type AddIncomeFormValues = z.infer<typeof AddIncomeSchema>;
