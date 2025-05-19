
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;

export const AddInvestmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }),
  amountInvested: z.coerce.number().positive({ message: "Amount must be positive." }),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  
  // Stock specific
  selectedStockId: z.string().optional(), // ID of the stock selected from dropdown
  numberOfShares: z.coerce.number().optional(), // Label: "Number of Securities"
  purchasePricePerShare: z.coerce.number().optional(), // Label: "Purchase Price"
  isStockFund: z.boolean().optional().default(false),

  // Gold specific
  quantityInGrams: z.coerce.number().optional(),
  isPhysicalGold: z.boolean().optional().default(true),

  // Currency specific
  currencyCode: z.string().optional(), // e.g. USD
  baseCurrency: z.string().optional(), // e.g. EUR
  currentExchangeRate: z.coerce.number().optional(), // For AI analysis input

  // Real Estate specific
  propertyAddress: z.string().optional(),
  propertyType: z.enum(['Residential', 'Commercial', 'Land']).optional(),
  
  // Debt Instruments specific
  issuer: z.string().optional(),
  interestRate: z.coerce.number().optional(),
  maturityDate: z.string().optional().refine((date) => date ? !isNaN(Date.parse(date)) : true, { message: "Invalid maturity date format."}),

}).superRefine((data, ctx) => {
  if (data.type === 'Stocks') {
    if (!data.selectedStockId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a stock.", path: ["selectedStockId"] });
    }
    if (data.numberOfShares === undefined || data.numberOfShares <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of securities must be positive.", path: ["numberOfShares"] });
    }
    if (data.purchasePricePerShare === undefined || data.purchasePricePerShare <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Purchase price must be positive.", path: ["purchasePricePerShare"] });
    }
  }
  if (data.type === 'Gold') {
    if (data.quantityInGrams === undefined || data.quantityInGrams <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity in grams must be positive for gold.", path: ["quantityInGrams"] });
    }
  }
  if (data.type === 'Currencies') {
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
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;
