
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;
export const goldTypes = ['K24', 'K21', 'Pound', 'Ounce'] as const;
export const debtSubTypes = ['Certificate', 'Treasury Bill', 'Bond', 'Other'] as const;
export const propertyTypes = ['Residential', 'Commercial', 'Land'] as const;

export const AddInvestmentSchema = z.object({
  name: z.string().optional(),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }).optional(),
  amountInvested: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),

  // Stocks
  selectedStockId: z.string().optional(),
  numberOfShares: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),
  purchasePricePerShare: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),
  purchaseFees: z.coerce.string().transform(val => val === "" || val === undefined ? 0 : parseFloat(val)).default("0"),

  // Gold
  goldType: z.enum(goldTypes).optional(),
  quantityInGrams: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),

  // Currencies
  currencyCode: z.string().optional(),
  foreignCurrencyAmount: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),
  exchangeRateAtPurchase: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),

  // Real Estate
  propertyAddress: z.string().optional(),
  propertyType: z.enum(propertyTypes).optional(),

  // Debt Instruments
  debtSubType: z.enum(debtSubTypes).optional(),
  issuer: z.string().optional(),
  interestRate: z.coerce.string().transform(val => val === "" || val === undefined ? undefined : parseFloat(val)).optional(),
  maturityDate: z.string().optional().refine((date) => date === undefined || date === "" || !isNaN(Date.parse(date)), { message: "Invalid maturity date format."}),

}).superRefine((data, ctx) => {
  const effectiveType = data.type;

  if (effectiveType === 'Stocks') {
    if (!data.selectedStockId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a security.", path: ["selectedStockId"] });
    }
    if (data.numberOfShares === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities is required.", path: ["numberOfShares"] });
    } else if (data.numberOfShares <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities must be positive.", path: ["numberOfShares"] });
    } else if (!Number.isInteger(data.numberOfShares)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities must be an integer.", path: ["numberOfShares"] });
    }

    if (data.purchasePricePerShare === undefined || data.purchasePricePerShare <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase price must be positive.", path: ["purchasePricePerShare"] });
    }
  } else if (effectiveType === 'Real Estate' || effectiveType === 'Gold' || effectiveType === 'Debt Instruments') {
    if (data.amountInvested === undefined || data.amountInvested <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount invested must be positive.", path: ["amountInvested"] });
    }
  }

  if (effectiveType === 'Gold') {
    if (!data.goldType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Gold type is required.", path: ["goldType"] });
    }
    if (data.quantityInGrams === undefined || data.quantityInGrams <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity / Units must be positive.", path: ["quantityInGrams"] });
    }
  }
  if (effectiveType === 'Currencies') {
    if (!data.currencyCode || data.currencyCode.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Transaction currency code is required.", path: ["currencyCode"] });
    }
    if (data.foreignCurrencyAmount === undefined || data.foreignCurrencyAmount <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Foreign currency amount must be positive.", path: ["foreignCurrencyAmount"] });
    }
    if (data.exchangeRateAtPurchase === undefined || data.exchangeRateAtPurchase <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exchange rate at purchase must be positive.", path: ["exchangeRateAtPurchase"] });
    }
  }
  if (effectiveType === 'Debt Instruments') {
    if (!data.debtSubType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Specific debt type is required.", path: ["debtSubType"]});
    }
    if (!data.issuer || data.issuer.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Issuer is required.", path: ["issuer"]});
    }
    if (data.interestRate === undefined || data.interestRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interest rate must be positive.", path: ["interestRate"]});
    }
    if (!data.maturityDate || data.maturityDate.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maturity date is required.", path: ["maturityDate"]});
    }
  }
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;


export const SellStockSchema = z.object({
  stockId: z.string(),
  numberOfSharesToSell: z.coerce.string().transform(val => parseFloat(val))
    .pipe(z.number()
      .int({ message: "Number of securities to sell must be an integer." })
      .positive({ message: "Number of securities to sell must be positive." })),
  sellPricePerShare: z.coerce.string().transform(val => parseFloat(val))
    .pipe(z.number().positive({ message: "Sell price must be positive." })),
  sellDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: z.coerce.string().transform(val => val === "" ? 0 : parseFloat(val))
    .pipe(z.number().min(0, {message: "Fees cannot be negative."})).optional().default("0"),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  numberOfShares: z.coerce.string().transform(val => parseFloat(val))
    .pipe(z.number()
      .int({ message: "Number of securities must be an integer." })
      .positive({ message: "Number of securities must be positive." })),
  purchasePricePerShare: z.coerce.string().transform(val => parseFloat(val))
    .pipe(z.number().positive({ message: "Purchase price must be positive." })),
  purchaseFees: z.coerce.string().transform(val => val === "" ? 0 : parseFloat(val))
    .pipe(z.number().min(0, { message: "Fees cannot be negative." })).optional().default("0"),
});
export type EditStockInvestmentFormValues = z.infer<typeof EditStockInvestmentSchema>;

