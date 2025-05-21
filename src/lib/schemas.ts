
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;
export const goldTypes = ['K24', 'K21', 'Pound', 'Ounce'] as const;

export const AddInvestmentSchema = z.object({
  name: z.string().optional(),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }).optional(), // Optional because it can be set by URL
  amountInvested: z.coerce.number().optional(),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),

  selectedStockId: z.string().optional(),
  numberOfShares: z.coerce.number().optional(),
  purchasePricePerShare: z.coerce.number().optional(),
  purchaseFees: z.coerce.number().min(0, {message: "Fees cannot be negative."}).optional().default(0),

  goldType: z.enum(goldTypes).optional(),
  quantityInGrams: z.coerce.number().optional(), // Label is "Quantity / Units"

  currencyCode: z.string().optional(),
  baseCurrency: z.string().optional(),
  currentExchangeRate: z.coerce.number().optional(),

  propertyAddress: z.string().optional(),
  propertyType: z.enum(['Residential', 'Commercial', 'Land']).optional(),

  debtSubType: z.enum(['Certificate', 'Treasury Bill', 'Bond', 'Other']).optional(),
  issuer: z.string().optional(),
  interestRate: z.coerce.number().optional(),
  maturityDate: z.string().optional().refine((date) => date && date.length > 0 ? !isNaN(Date.parse(date)) : true, { message: "Invalid maturity date format."}),

}).superRefine((data, ctx) => {
  // If type is set by URL, it might not be in form values initially, handle this gracefully
  const effectiveType = data.type;

  if (effectiveType === 'Stocks') {
    if (!data.selectedStockId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a security.", path: ["selectedStockId"] });
    }
    if (data.numberOfShares === undefined || data.numberOfShares <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities must be positive.", path: ["numberOfShares"] });
    }
    if (data.purchasePricePerShare === undefined || data.purchasePricePerShare <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase price must be positive.", path: ["purchasePricePerShare"] });
    }
  } else if (effectiveType && !['Stocks', 'Debt Instruments'].includes(effectiveType)) {
    // For Gold, Currencies, Real Estate when they are the effective type
    // Debt Instruments has its amountInvested inside its specific section
    if (data.amountInvested === undefined || data.amountInvested <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount invested must be positive.", path: ["amountInvested"] });
    }
  }


  if (effectiveType === 'Gold') {
    if (!data.goldType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Gold type is required.", path: ["goldType"] });
    }
    if (data.quantityInGrams === undefined || data.quantityInGrams <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity / Units must be positive for gold.", path: ["quantityInGrams"] });
    }
  }
  if (effectiveType === 'Currencies') {
    if (!data.currencyCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Currency code is required.", path: ["currencyCode"] });
    }
    if (!data.baseCurrency) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Base currency is required for comparison.", path: ["baseCurrency"] });
    }
    if (data.currentExchangeRate === undefined || data.currentExchangeRate <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Current exchange rate must be positive.", path: ["currentExchangeRate"] });
    }
  }
  if (effectiveType === 'Debt Instruments') {
    if (!data.debtSubType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Specific debt type is required.", path: ["debtSubType"]});
    }
    if (!data.issuer) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Issuer is required.", path: ["issuer"]});
    }
    if (data.interestRate === undefined || data.interestRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interest rate must be positive.", path: ["interestRate"]});
    }
    if (!data.maturityDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maturity date is required.", path: ["maturityDate"]});
    }
     if (data.amountInvested === undefined || data.amountInvested <= 0) { // Amount invested for debt
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount invested must be positive.", path: ["amountInvested"] });
    }
  }
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;


export const SellStockSchema = z.object({
  stockId: z.string(), 
  numberOfSharesToSell: z.coerce.number().positive({ message: "Number of securities to sell must be positive." }),
  sellPricePerShare: z.coerce.number().positive({ message: "Sell price must be positive." }),
  sellDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: z.coerce.number().min(0, {message: "Fees cannot be negative."}).optional().default(0),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;

export const EditStockInvestmentSchema = z.object({
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  numberOfShares: z.coerce.number().positive({ message: "Number of securities must be positive." }),
  purchasePricePerShare: z.coerce.number().positive({ message: "Purchase price must be positive." }),
  purchaseFees: z.coerce.number().min(0, { message: "Fees cannot be negative." }).optional().default(0),
});
export type EditStockInvestmentFormValues = z.infer<typeof EditStockInvestmentSchema>;
