import { z } from "zod";

export const investmentTypes = [
  "Real Estate",
  "Gold",
  "Stocks",
  "Debt Instruments",
  "Currencies",
] as const;
export const goldTypes = ["K24", "K21", "Pound", "Ounce"] as const;
export const debtSubTypes = [
  "Certificate",
  "Treasury Bill",
  "Bond",
  "Other",
] as const;
export const propertyTypes = ["Residential", "Touristic", "Commercial", "Land"] as const;
export const incomeTypes = [
  "Profit Share",
  "Bonus",
  "Gift",
  "Rental Income",
  "Freelance",
  "Other",
] as const;
export const expenseCategories = ["Credit Card", "Other"] as const;

// New constants for Fixed Estimates
export const fixedEstimateTypes = [
  "Salary",
  "Zakat",
  "Charity",
  "Living Expenses",
  "Other",
] as const;
export const fixedEstimatePeriods = ["Monthly", "Quarterly", "Yearly"] as const;

// Coercion helpers for numeric string inputs

// For required fields that must be non-negative numbers (including zero)
const stringToRequiredGreaterThanOne = z.preprocess(
  (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
  z
    .number({ invalid_type_error: "Must be a valid number." })
    .min(1, { message: "Amount cannot be less than 1." }),
);

// For required fields that must be positive numbers
const stringToRequiredNonNegativeNumberCoerced = z.preprocess(
  (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
  z
    .number({ invalid_type_error: "Must be a valid number." })
    .min(0, { message: "Amount cannot be negative." }),
);

// For optional fields that must be positive numbers if provided
const stringToOptionalPositiveNumberCoerced = z.preprocess(
  (val) =>
    (typeof val === "string" && val.trim() === "") ||
    val === null ||
    val === undefined
      ? undefined
      : Number(val),
  z
    .number({ invalid_type_error: "Must be a valid number if provided." })
    .positive({ message: "Amount must be positive if provided." })
    .optional(),
);

// For optional fields that must be non-negative numbers if provided
const stringToOptionalNonNegativeNumberCoerced = z.preprocess(
  (val) =>
    val === "" || val === null || val === undefined ? undefined : String(val), // Ensure it's a string or undefined
  z
    .string()
    .optional()
    .pipe(
      z.coerce
        .number({ invalid_type_error: "Must be a valid number if provided." })
        .min(0, { message: "Cannot be negative if provided." })
        .optional(),
    ),
);

// For required fields that must be positive integers
const stringToRequiredPositiveIntegerCoerced = z.preprocess(
  (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
  z
    .number({ invalid_type_error: "Must be a valid whole number." })
    .int({ message: "Must be a whole number." })
    .positive({ message: "Number must be a positive whole number." }),
);

// Discriminated union for AddInvestmentSchema
const StockInvestmentSchema = z.object({
  type: z.literal("Stocks"),
  name: z.string().optional(),
  selectedSecurityId: z
    .string({ required_error: "Please select a security." })
    .min(1, "Please select a security."),
  numberOfShares: stringToRequiredPositiveIntegerCoerced,
  purchasePricePerShare: stringToRequiredNonNegativeNumberCoerced,
  purchaseFees: stringToOptionalNonNegativeNumberCoerced
    .default("0")
    .transform((v) => parseFloat(String(v) || "0")),
  purchaseDate: z
    .string()
    .min(1, { message: "Purchase date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  amountInvested: z.any().optional(),
});

const GoldInvestmentSchema = z.object({
  type: z.literal("Gold"),
  name: z.string().optional(),
  goldType: z.enum(goldTypes, { required_error: "Gold type is required." }),
  quantityInGrams: stringToRequiredNonNegativeNumberCoerced,
  amountInvested: stringToRequiredNonNegativeNumberCoerced,
  purchaseDate: z
    .string()
    .min(1, { message: "Purchase date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
});

const CurrencyInvestmentSchema = z.object({
  type: z.literal("Currencies"),
  name: z.string().optional(),
  currencyCode: z
    .string()
    .min(1, { message: "Transaction currency code is required." }),
  foreignCurrencyAmount: stringToRequiredNonNegativeNumberCoerced,
  exchangeRateAtPurchase: stringToRequiredNonNegativeNumberCoerced,
  amountInvested: z.any().optional(),
  purchaseDate: z
    .string()
    .min(1, { message: "Purchase date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
});

const RealEstateInvestmentSchema = z.object({
  type: z.literal("Real Estate"),
  name: z.string().optional(),
  propertyAddress: z
    .string()
    .min(1, { message: "Property address is required." }),
  propertyType: z.enum(propertyTypes, {
    required_error: "Property type is required.",
  }),
  amountInvested: stringToRequiredNonNegativeNumberCoerced,
  installmentFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  installmentAmount: stringToOptionalPositiveNumberCoerced,
  installmentStartDate: z
    .string()
    .optional()
    .refine((date) => !date || date.trim() === "" || !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  purchaseDate: z
    .string()
    .min(1, { message: "Purchase date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  totalInstallmentPrice: stringToOptionalPositiveNumberCoerced,
  installmentEndDate: z
    .string()
    .optional()
    .refine((date) => !date || date.trim() === "" || !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  downPayment: stringToOptionalPositiveNumberCoerced,
  maintenanceAmount: stringToOptionalNonNegativeNumberCoerced,
  maintenancePaymentDate: z
    .string()
    .optional()
    .refine((date) => !date || date.trim() === "" || !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
});

const DebtInstrumentInvestmentSchema = z.object({
  type: z.literal("Debt Instruments"),
  name: z.string().optional(),
  debtSubType: z.enum(debtSubTypes, {
    required_error: "Specific debt type is required.",
  }),
  issuer: z.string().min(1, { message: "Issuer is required." }),
  interestRate: stringToRequiredNonNegativeNumberCoerced,
  maturityDate: z
    .string()
    .min(1, { message: "Maturity date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid maturity date format.",
    }),
  certificateInterestFrequency: z
    .enum(["Monthly", "Quarterly", "Yearly"])
    .default("Monthly")
    .optional(),
  amountInvested: stringToRequiredGreaterThanOne,
  purchaseDate: z
    .string()
    .optional()
    .refine(
      (dateStr) => {
        if (!dateStr || dateStr.trim() === "") return true; // Optional, so empty is fine
        return !isNaN(Date.parse(dateStr));
      },
      { message: "Invalid purchase date format." },
    ),
});

export const AddInvestmentSchema = z.discriminatedUnion("type", [
  StockInvestmentSchema,
  GoldInvestmentSchema,
  CurrencyInvestmentSchema,
  RealEstateInvestmentSchema,
  DebtInstrumentInvestmentSchema,
]);

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;

export const SellStockSchema = z.object({
  securityId: z.string(),
  numberOfSharesToSell: stringToRequiredPositiveIntegerCoerced,
  sellPricePerShare: stringToRequiredNonNegativeNumberCoerced,
  sellDate: z
    .string()
    .min(1, { message: "Date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  fees: stringToOptionalNonNegativeNumberCoerced
    .default("0")
    .transform((v) => parseFloat(String(v) || "0")),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z
    .string()
    .min(1, { message: "Date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  numberOfShares: stringToRequiredPositiveIntegerCoerced,
  purchasePricePerShare: stringToRequiredNonNegativeNumberCoerced,
  purchaseFees: stringToOptionalNonNegativeNumberCoerced
    .default("0")
    .transform((v) => parseFloat(String(v) || "0")),
});
export type EditStockInvestmentFormValues = z.infer<
  typeof EditStockInvestmentSchema
>;

export const AddIncomeSchema = z.object({
  type: z.enum(incomeTypes, { required_error: "Income type is required." }),
  source: z.string().optional(),
  amount: stringToRequiredNonNegativeNumberCoerced,
  date: z
    .string()
    .min(1, { message: "Date is required." })
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format.",
    }),
  description: z.string().optional(),
});

export type AddIncomeFormValues = z.infer<typeof AddIncomeSchema>;

export const ExpenseFormSchema = z
  .object({
    category: z.enum(expenseCategories, {
      required_error: "Expense category is required.",
    }),
    description: z.string().optional(),
    amount: stringToRequiredNonNegativeNumberCoerced,
    date: z
      .string()
      .min(1, { message: "Date is required." })
      .refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date format.",
      }),
    isInstallment: z.boolean().optional().default(false),
    numberOfInstallments: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined
          ? undefined
          : String(val),
      z
        .string()
        .optional()
        .pipe(
          z.coerce
            .number({
              invalid_type_error:
                "Number of months must be a valid whole number.",
            })
            .int({ message: "Number of months must be a whole number." })
            .positive({
              message: "Number of months must be a positive whole number.",
            })
            .min(1, { message: "Number of months must be greater than 0." })
            .optional(),
        ),
    ),
  })
  .superRefine((data, ctx) => {
    if (
      data.category === "Credit Card" &&
      data.isInstallment &&
      data.numberOfInstallments === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number of months is required for installment plans.",
        path: ["numberOfInstallments"],
      });
    }
    if (
      data.category === "Credit Card" &&
      data.isInstallment &&
      data.numberOfInstallments !== undefined &&
      data.numberOfInstallments <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number of months must be greater than 0.",
        path: ["numberOfInstallments"],
      });
    }
  });
export type ExpenseFormValues = z.infer<typeof ExpenseFormSchema>;

// New Schema for Fixed Estimates
export const FixedEstimateSchema = z
  .object({
    type: z.enum(fixedEstimateTypes, {
      required_error: "Estimate type is required.",
    }),
    name: z.string().optional(),
    amount: stringToRequiredNonNegativeNumberCoerced,
    period: z.enum(fixedEstimatePeriods, {
      required_error: "Period is required.",
    }),
    isExpense: z.boolean().optional(),
  })
  .transform((data) => {
    let isExpense: boolean | undefined = data.isExpense;
    if (data.type === "Salary") isExpense = false;
    if (
      data.type === "Zakat" ||
      data.type === "Charity" ||
      data.type === "Living Expenses"
    )
      isExpense = true;
    // For 'Other', leave as provided
    return { ...data, isExpense };
  })
  .superRefine((data, ctx) => {
    if (data.type === "Other" && (!data.name || data.name.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required when type is 'Other'.",
        path: ["name"],
      });
    }
    if (data.type === "Other" && data.isExpense === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify if this 'Other' item is an expense or income.",
        path: ["isExpense"],
      });
    }
  });

export type FixedEstimateFormValues = z.infer<typeof FixedEstimateSchema>;
