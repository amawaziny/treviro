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

const stringToOptionalPositiveNumberOrUndefined = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    }
    return val;
  },
  z.number().positive({ message: "Amount must be positive." }).optional()
);
const stringToOptionalPositiveIntegerOrUndefined = z.string().transform(val => val.trim() === "" ? undefined : parseInt(val, 10)).pipe(z.number().int().positive({ message: "Must be a positive whole number." }).optional());
const stringToRequiredPositiveNumber = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    }
    return val;
  },
  z.number().positive({ message: "Amount must be positive." })
);
const stringToRequiredPositiveInteger = z.string().min(1, {message: "This field is required."}).transform(val => parseInt(val,10)).pipe(z.number().int().positive({ message: "Number must be a positive whole number." }));
const stringToOptionalNonNegativeNumber = z.string().transform(val => val.trim() === "" ? undefined : parseFloat(val)).pipe(z.number().min(0, { message: "Cannot be negative." }).optional());

// Discriminated union for AddInvestmentSchema
const StockInvestmentSchema = z.object({
  type: z.literal('Stocks'),
  name: z.string().optional(),
  selectedStockId: z.string({ required_error: 'Please select a security.' }),
  numberOfShares: stringToRequiredPositiveInteger,
  purchasePricePerShare: stringToRequiredPositiveNumber,
  purchaseFees: stringToOptionalNonNegativeNumber.default('0'),
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
  amountInvested: z.any().optional(), // calculated in submit logic, not user input
});

const GoldInvestmentSchema = z.object({
  type: z.literal('Gold'),
  name: z.string().optional(),
  goldType: z.enum(goldTypes, { required_error: 'Gold type is required.' }),
  quantityInGrams: stringToRequiredPositiveNumber,
  amountInvested: stringToRequiredPositiveNumber,
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
});

const CurrencyInvestmentSchema = z.object({
  type: z.literal('Currencies'),
  name: z.string().optional(),
  currencyCode: z.string().min(1, { message: 'Transaction currency code is required.' }),
  foreignCurrencyAmount: stringToRequiredPositiveNumber,
  exchangeRateAtPurchase: stringToRequiredPositiveNumber,
  amountInvested: z.any().optional(), // calculated in submit logic, not user input
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
});

const RealEstateInvestmentSchema = z.object({
  type: z.literal('Real Estate'),
  name: z.string().optional(),
  propertyAddress: z.string().min(1, { message: 'Property address is required.' }),
  propertyType: z.enum(propertyTypes, { required_error: 'Property type is required.' }),
  amountInvested: stringToRequiredPositiveNumber,
  installmentFrequency: z.enum(['Monthly', 'Quarterly', 'Yearly']).optional(),
  installmentAmount: stringToOptionalPositiveNumberOrUndefined,
  installmentStartDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format.' }), // NEW FIELD
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
  totalInstallmentPrice: stringToOptionalPositiveNumberOrUndefined, // New field
  installmentEndDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format.' }), // New field
  downPayment: stringToOptionalPositiveNumberOrUndefined, // NEW FIELD
  maintenanceAmount: stringToOptionalPositiveNumberOrUndefined, // NEW FIELD
  maintenancePaymentDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format.' }), // NEW FIELD
});

const DebtInstrumentInvestmentSchema = z.object({
  type: z.literal('Debt Instruments'),
  name: z.string().optional(),
  debtSubType: z.enum(debtSubTypes, { required_error: 'Specific debt type is required.' }),
  issuer: z.string().min(1, { message: 'Issuer is required.' }),
  interestRate: stringToRequiredPositiveNumber,
  maturityDate: z.string().min(1, { message: 'Maturity date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid maturity date format.' }),
  certificateInterestFrequency: z.enum(['Monthly', 'Quarterly', 'Yearly']).default('Monthly').optional(),
  amountInvested: stringToRequiredPositiveNumber,
  purchaseDate: z.string().optional().refine((dateStr) => {
    if (!dateStr || dateStr.trim() === "") return true;
    return !isNaN(Date.parse(dateStr));
  }, { message: 'Invalid purchase date format.' }),
});

export const AddInvestmentSchema = z.discriminatedUnion('type', [
  StockInvestmentSchema,
  GoldInvestmentSchema,
  CurrencyInvestmentSchema,
  RealEstateInvestmentSchema,
  DebtInstrumentInvestmentSchema,
]);

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
