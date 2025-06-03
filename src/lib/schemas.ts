
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

// Coercion helpers for numeric string inputs
const stringToRequiredPositiveNumberCoerced = z.coerce.number({
    invalid_type_error: "Must be a valid number.",
    required_error: "This field is required.",
  }).positive({ message: "Amount must be positive." });

const stringToOptionalPositiveNumberCoerced = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number({ invalid_type_error: "Must be a valid number if provided." })
    .positive({ message: "Amount must be positive if provided." })
    .optional()
);

const stringToOptionalNonNegativeNumberCoerced = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number({ invalid_type_error: "Must be a valid number if provided." })
    .min(0, { message: "Cannot be negative if provided." })
    .optional()
);

const stringToRequiredPositiveIntegerCoerced = z.coerce.number({
    invalid_type_error: "Must be a valid whole number.",
    required_error: "This field is required.",
  }).int({ message: "Must be a whole number."}).positive({ message: "Number must be a positive whole number." });


// Discriminated union for AddInvestmentSchema
const StockInvestmentSchema = z.object({
  type: z.literal('Stocks'),
  name: z.string().optional(),
  selectedStockId: z.string({ required_error: 'Please select a security.' }),
  numberOfShares: stringToRequiredPositiveIntegerCoerced, // Use coerced version
  purchasePricePerShare: stringToRequiredPositiveNumberCoerced, // Use coerced version
  purchaseFees: stringToOptionalNonNegativeNumberCoerced.default(0), // Use coerced version
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
  amountInvested: z.any().optional(), // calculated in submit logic, not user input
});

const GoldInvestmentSchema = z.object({
  type: z.literal('Gold'),
  name: z.string().optional(),
  goldType: z.enum(goldTypes, { required_error: 'Gold type is required.' }),
  quantityInGrams: stringToRequiredPositiveNumberCoerced, // Use coerced version
  amountInvested: stringToRequiredPositiveNumberCoerced, // Use coerced version
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
});

const CurrencyInvestmentSchema = z.object({
  type: z.literal('Currencies'),
  name: z.string().optional(),
  currencyCode: z.string().min(1, { message: 'Transaction currency code is required.' }),
  foreignCurrencyAmount: stringToRequiredPositiveNumberCoerced, // Use coerced version
  exchangeRateAtPurchase: stringToRequiredPositiveNumberCoerced, // Use coerced version
  amountInvested: z.any().optional(), // calculated in submit logic, not user input
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
});

const RealEstateInvestmentSchema = z.object({
  type: z.literal('Real Estate'),
  name: z.string().optional(),
  propertyAddress: z.string().min(1, { message: 'Property address is required.' }),
  propertyType: z.enum(propertyTypes, { required_error: 'Property type is required.' }),
  amountInvested: stringToRequiredPositiveNumberCoerced, // Use coerced helper
  installmentFrequency: z.enum(['Monthly', 'Quarterly', 'Yearly']).optional(),
  installmentAmount: stringToOptionalPositiveNumberCoerced, // Use coerced helper
  installmentStartDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
  purchaseDate: z.string().min(1, { message: 'Purchase date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
  totalInstallmentPrice: stringToOptionalPositiveNumberCoerced, // Use coerced helper
  installmentEndDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
  downPayment: stringToOptionalPositiveNumberCoerced, // Use coerced helper
  maintenanceAmount: stringToOptionalNonNegativeNumberCoerced, // Use coerced helper (can be 0)
  maintenancePaymentDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format.' }),
});

const DebtInstrumentInvestmentSchema = z.object({
  type: z.literal('Debt Instruments'),
  name: z.string().optional(),
  debtSubType: z.enum(debtSubTypes, { required_error: 'Specific debt type is required.' }),
  issuer: z.string().min(1, { message: 'Issuer is required.' }),
  interestRate: stringToRequiredPositiveNumberCoerced, // Use coerced version
  maturityDate: z.string().min(1, { message: 'Maturity date is required.' }).refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid maturity date format.' }),
  certificateInterestFrequency: z.enum(['Monthly', 'Quarterly', 'Yearly']).default('Monthly').optional(),
  amountInvested: stringToRequiredPositiveNumberCoerced, // Use coerced version
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
  numberOfSharesToSell: stringToRequiredPositiveIntegerCoerced, // Use coerced version
  sellPricePerShare: stringToRequiredPositiveNumberCoerced, // Use coerced version
  sellDate: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: stringToOptionalNonNegativeNumberCoerced.default(0), // Use coerced version
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  numberOfShares: stringToRequiredPositiveIntegerCoerced, // Use coerced version
  purchasePricePerShare: stringToRequiredPositiveNumberCoerced, // Use coerced version
  purchaseFees: stringToOptionalNonNegativeNumberCoerced.default(0), // Use coerced version
});
export type EditStockInvestmentFormValues = z.infer<typeof EditStockInvestmentSchema>;


export const AddIncomeSchema = z.object({
  type: z.enum(incomeTypes, { required_error: "Income type is required." }),
  source: z.string().optional(),
  amount: stringToRequiredPositiveNumberCoerced, // Use coerced version
  date: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  description: z.string().optional(),
});

export type AddIncomeFormValues = z.infer<typeof AddIncomeSchema>;

export const AddExpenseSchema = z.object({
  category: z.enum(expenseCategories, { required_error: "Expense category is required." }),
  description: z.string().optional(),
  amount: stringToRequiredPositiveNumberCoerced, // Use coerced version
  date: z.string().min(1, { message: "Date is required." }).refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  isInstallment: z.boolean().optional().default(false),
  numberOfInstallments: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: "Number of months must be a valid whole number." })
      .int({ message: "Number of months must be a whole number."})
      .positive({ message: "Number of months must be a positive whole number." })
      .optional()
  ),
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
  amount: stringToRequiredPositiveNumberCoerced, // Use coerced version
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
