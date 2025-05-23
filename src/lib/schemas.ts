
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;
export const goldTypes = ['K24', 'K21', 'Pound', 'Ounce'] as const;
export const debtSubTypes = ['Certificate', 'Treasury Bill', 'Bond', 'Other'] as const;
export const propertyTypes = ['Residential', 'Commercial', 'Land'] as const;

// Helper for transforming string to number or undefined
const stringToOptionalNumber = z.string().transform(val => val === "" ? undefined : parseFloat(val));
const stringToNumberOrDefault = (defaultValue: number) => z.string().transform(val => parseFloat(val || String(defaultValue)));


export const AddInvestmentSchema = z.object({
  name: z.string().optional(),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }).optional(),
  
  amountInvested: stringToOptionalNumber.pipe(z.number().positive().optional()),

  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),

  // Stocks
  selectedStockId: z.string().optional(),
  numberOfShares: stringToOptionalNumber.pipe(z.number().int().positive().optional()),
  purchasePricePerShare: stringToOptionalNumber.pipe(z.number().positive().optional()),
  purchaseFees: stringToNumberOrDefault(0).pipe(z.number().min(0, {message: "Fees must be non-negative."})).default("0"), // Zod default is for initial string value

  // Gold
  goldType: z.enum(goldTypes).optional(),
  quantityInGrams: stringToOptionalNumber.pipe(z.number().positive().optional()),

  // Currencies
  currencyCode: z.string().optional(),
  foreignCurrencyAmount: stringToOptionalNumber.pipe(z.number().positive().optional()),
  exchangeRateAtPurchase: stringToOptionalNumber.pipe(z.number().positive().optional()),

  // Real Estate
  propertyAddress: z.string().optional(),
  propertyType: z.enum(propertyTypes).optional(),

  // Debt Instruments
  debtSubType: z.enum(debtSubTypes).optional(),
  issuer: z.string().optional(),
  interestRate: stringToOptionalNumber.pipe(z.number().positive().optional()),
  maturityDate: z.string().optional().refine((date) => date === undefined || date === "" || !isNaN(Date.parse(date)), { message: "Invalid maturity date format."}),

}).superRefine((data, ctx) => {
  const effectiveType = data.type;

  if (effectiveType === 'Stocks') {
    if (!data.selectedStockId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a security.", path: ["selectedStockId"] });
    }
    // numberOfShares and purchasePricePerShare are now individually validated by their pipes
    if (data.numberOfShares === undefined) { // Check after transform
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities is required.", path: ["numberOfShares"] });
    }
    if (data.purchasePricePerShare === undefined) { // Check after transform
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase price is required.", path: ["purchasePricePerShare"] });
    }
  } else if (effectiveType === 'Real Estate' || effectiveType === 'Gold' || effectiveType === 'Debt Instruments') {
    if (data.amountInvested === undefined) { // Check after transform
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount invested is required.", path: ["amountInvested"] });
    }
  }

  if (effectiveType === 'Gold') {
    if (!data.goldType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Gold type is required.", path: ["goldType"] });
    }
    if (data.quantityInGrams === undefined) { // Check after transform
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity / Units is required.", path: ["quantityInGrams"] });
    }
  }
  if (effectiveType === 'Currencies') {
    if (!data.currencyCode || data.currencyCode.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Transaction currency code is required.", path: ["currencyCode"] });
    }
    if (data.foreignCurrencyAmount === undefined) { // Check after transform
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Foreign currency amount is required.", path: ["foreignCurrencyAmount"] });
    }
    if (data.exchangeRateAtPurchase === undefined) { // Check after transform
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
    if (data.interestRate === undefined) { // Check after transform
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interest rate is required.", path: ["interestRate"]});
    }
    if (!data.maturityDate || data.maturityDate.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maturity date is required.", path: ["maturityDate"]});
    }
  }
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;


export const SellStockSchema = z.object({
  stockId: z.string(),
  numberOfSharesToSell: stringToOptionalNumber
    .pipe(z.number({required_error: "Number of securities is required."})
      .int({ message: "Number of securities to sell must be an integer." })
      .positive({ message: "Number of securities to sell must be positive." })),
  sellPricePerShare: stringToOptionalNumber
    .pipe(z.number({required_error: "Sell price is required."}).positive({ message: "Sell price must be positive." })),
  sellDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: stringToNumberOrDefault(0).pipe(z.number().min(0, {message: "Fees cannot be negative."})).default("0"),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  numberOfShares: stringToOptionalNumber
    .pipe(z.number({required_error: "Number of securities is required."})
      .int({ message: "Number of securities must be an integer." })
      .positive({ message: "Number of securities must be positive." })),
  purchasePricePerShare: stringToOptionalNumber
    .pipe(z.number({required_error: "Purchase price is required."}).positive({ message: "Purchase price must be positive." })),
  purchaseFees: stringToNumberOrDefault(0)
    .pipe(z.number().min(0, { message: "Fees cannot be negative." })).default("0"),
});
export type EditStockInvestmentFormValues = z.infer<typeof EditStockInvestmentSchema>;
