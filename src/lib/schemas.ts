
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;
export const goldTypes = ['K24', 'K21', 'Pound', 'Ounce'] as const;
export const debtSubTypes = ['Certificate', 'Treasury Bill', 'Bond', 'Other'] as const;
export const propertyTypes = ['Residential', 'Commercial', 'Land'] as const;
export const incomeTypes = ['Profit Share', 'Bonus', 'Gift', 'Rental Income', 'Freelance', 'Stock Dividend', 'Other'] as const;
export const expenseCategories = ['Credit Card', 'Other'] as const;

// New constants for Fixed Estimates
export const fixedEstimateTypes = ['Salary', 'Zakat', 'Charity', 'Other'] as const;
export const fixedEstimatePeriods = ['Monthly', 'Quarterly', 'Yearly'] as const;


const stringToOptionalPositiveNumberOrUndefined = z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional());
const stringToOptionalPositiveIntegerOrUndefined = z.string().transform(val => val.trim() === "" ? undefined : parseInt(val, 10)).pipe(z.number().int().positive({ message: "Must be a positive whole number." }).optional());
const stringToRequiredPositiveNumber = z.string().min(1, {message: "This field is required."}).transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }));
const stringToRequiredPositiveInteger = z.string().min(1, {message: "This field is required."}).transform(val => parseInt(val,10)).pipe(z.number().int().positive({ message: "Number must be a positive whole number." }));
const stringToOptionalNonNegativeNumber = z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().min(0, { message: "Cannot be negative." }).optional());


export const AddInvestmentSchema = z.object({
  name: z.string().optional(),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }).optional(),
  amountInvested: z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional()),
  purchaseDate: z.string().optional(),

  // Stocks
  selectedStockId: z.string().optional(),
  numberOfShares: z.string().transform(val => val.trim() === "" ? undefined : parseInt(val, 10)).pipe(z.number().int({message: "Number of securities must be a whole number."}).positive({ message: "Number of securities must be positive." }).optional()),
  purchasePricePerShare: z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional()),
  purchaseFees: z.string().transform(val => parseFloat(val || "0")).pipe(z.number().min(0, { message: "Cannot be negative." })).default("0"),

  // Gold
  goldType: z.enum(goldTypes).optional(),
  quantityInGrams: z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional()),

  // Currencies
  currencyCode: z.string().optional(),
  foreignCurrencyAmount: z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional()),
  exchangeRateAtPurchase: z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional()),

  // Real Estate
  propertyAddress: z.string().optional(),
  propertyType: z.enum(propertyTypes).optional(),

  // Debt Instruments
  debtSubType: z.enum(debtSubTypes).optional(),
  issuer: z.string().optional(),
  interestRate: z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." }).optional()),
  maturityDate: z.string().optional().refine((dateStr) => {
    if (!dateStr || dateStr.trim() === "") return true; // Optional, so valid if empty
    return !isNaN(Date.parse(dateStr));
  }, { message: "Invalid maturity date format."}),

}).superRefine((data, ctx) => {
  const effectiveType = data.type;

  // Purchase Date validation
  if (effectiveType && (effectiveType === 'Stocks' || effectiveType === 'Gold' || effectiveType === 'Currencies' || effectiveType === 'Real Estate')) {
    if (!data.purchaseDate || data.purchaseDate.trim() === "" || isNaN(Date.parse(data.purchaseDate))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase date is required.", path: ["purchaseDate"] });
    }
  } else if (effectiveType === 'Debt Instruments' && data.debtSubType && data.debtSubType !== 'Certificate') {
    if (!data.purchaseDate || data.purchaseDate.trim() === "" || isNaN(Date.parse(data.purchaseDate))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase date is required for this debt type.", path: ["purchaseDate"] });
    }
  }
  
  // Amount Invested validation for non-Stock, non-Currency, non-Debt types
  if (effectiveType && effectiveType !== 'Stocks' && effectiveType !== 'Currencies' && effectiveType !== 'Debt Instruments' && data.amountInvested === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total amount invested is required.", path: ["amountInvested"] });
  }

  // Type-specific validations
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
  }

  if (effectiveType === 'Gold') {
    if (!data.goldType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Gold type is required.", path: ["goldType"] });
    }
    if (data.quantityInGrams === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity / Units is required.", path: ["quantityInGrams"] });
    }
     if (data.amountInvested === undefined) { // Amount invested is required for Gold
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total amount invested is required.", path: ["amountInvested"] });
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
    if (data.amountInvested === undefined) { // Amount invested is required for Debt Instruments
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total amount invested is required.", path: ["amountInvested"] });
    }
  }
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;


export const SellStockSchema = z.object({
  stockId: z.string(),
  numberOfSharesToSell: z.string().transform(val => parseInt(val,10)).pipe(z.number().int({message: "Number must be a whole number."}).positive({ message: "Number of shares must be a positive whole number." })),
  sellPricePerShare: z.string().transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Sell price must be positive." })),
  sellDate: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: z.string().transform(val => parseFloat(val || "0")).pipe(z.number().min(0, { message: "Cannot be negative." })).default("0"),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  numberOfShares: z.string().transform(val => parseInt(val,10)).pipe(z.number().int({message: "Number must be a whole number."}).positive({ message: "Number of shares must be a positive whole number." })),
  purchasePricePerShare: z.string().transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Price must be positive." })),
  purchaseFees: z.string().transform(val => parseFloat(val || "0")).pipe(z.number().min(0, { message: "Cannot be negative." })).default("0"),
});
export type EditStockInvestmentFormValues = z.infer<typeof EditStockInvestmentSchema>;


export const AddIncomeSchema = z.object({
  type: z.enum(incomeTypes, { required_error: "Income type is required." }),
  source: z.string().optional(),
  amount: z.string().min(1, {message: "Amount is required."}).transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." })),
  date: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  description: z.string().optional(),
});

export type AddIncomeFormValues = z.infer<typeof AddIncomeSchema>;

export const AddExpenseSchema = z.object({
  category: z.enum(expenseCategories, { required_error: "Expense category is required." }),
  description: z.string().optional(),
  amount: z.string().min(1, {message: "Amount is required."}).transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." })),
  date: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  isInstallment: z.boolean().optional().default(false),
  numberOfInstallments: z.string().transform(val => val.trim() === "" ? undefined : parseInt(val, 10)).pipe(z.number().int({message: "Number must be a whole number."}).positive({ message: "Number of months must be a positive whole number." }).optional()),
}).superRefine((data, ctx) => {
  if (data.category === 'Credit Card' && data.isInstallment && data.numberOfInstallments === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Number of months is required for installment plans.",
      path: ["numberOfInstallments"],
    });
  }
  if (data.category === 'Credit Card' && data.isInstallment && (data.numberOfInstallments ?? 0) <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Number of months must be greater than 0.",
      path: ["numberOfInstallments"],
    });
  }
});
export type AddExpenseFormValues = z.infer<typeof AddExpenseSchema>;

// New Schema for Fixed Estimates
export const FixedEstimateSchema = z.object({
  type: z.enum(fixedEstimateTypes, { required_error: "Estimate type is required." }),
  name: z.string().optional(),
  amount: z.string().min(1, {message: "Amount is required."}).transform(val => parseFloat(val)).pipe(z.number().positive({ message: "Amount must be positive." })),
  period: z.enum(fixedEstimatePeriods, { required_error: "Period is required." }),
  isExpense: z.boolean().optional(), // Will be set based on type if 'Other' is not chosen
}).superRefine((data, ctx) => {
  if (data.type === 'Other' && (!data.name || data.name.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Name is required when type is 'Other'.",
      path: ["name"],
    });
  }
  if (data.type === 'Other' && data.isExpense === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify if this 'Other' item is an expense or income.",
      path: ["isExpense"],
    });
  }
});

export type FixedEstimateFormValues = z.infer<typeof FixedEstimateSchema>;
