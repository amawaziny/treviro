
import { z } from 'zod';

export const investmentTypes = ['Real Estate', 'Gold', 'Stocks', 'Debt Instruments', 'Currencies'] as const;

export const AddInvestmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  type: z.enum(investmentTypes, { errorMap: () => ({ message: "Please select a valid investment type."}) }),
  amountInvested: z.coerce.number().positive({ message: "Amount must be positive." }),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  
  selectedStockId: z.string().optional(), 
  numberOfShares: z.coerce.number().optional(), 
  purchasePricePerShare: z.coerce.number().optional(), 
  isStockFund: z.boolean().optional().default(false),

  quantityInGrams: z.coerce.number().optional(),
  isPhysicalGold: z.boolean().optional().default(true),

  currencyCode: z.string().optional(), 
  baseCurrency: z.string().optional(), 
  currentExchangeRate: z.coerce.number().optional(), 

  propertyAddress: z.string().optional(),
  propertyType: z.enum(['Residential', 'Commercial', 'Land']).optional(),
  
  issuer: z.string().optional(),
  interestRate: z.coerce.number().optional(),
  maturityDate: z.string().optional().refine((date) => date && date.length > 0 ? !isNaN(Date.parse(date)) : true, { message: "Invalid maturity date format."}),

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
  if (data.type === 'Debt Instruments') {
    if (!data.issuer) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Issuer is required.", path: ["issuer"]});
    }
    if (data.interestRate === undefined || data.interestRate <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interest rate must be positive.", path: ["interestRate"]});
    }
    if (!data.maturityDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maturity date is required.", path: ["maturityDate"]});
    }
  }
});

export type AddInvestmentFormValues = z.infer<typeof AddInvestmentSchema>;


export const SellStockSchema = z.object({
  stockId: z.string(), // Hidden field or passed programmatically
  numberOfSharesToSell: z.coerce.number().positive({ message: "Number of securities to sell must be positive." }),
  sellPricePerShare: z.coerce.number().positive({ message: "Sell price must be positive." }),
  sellDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format."}),
  fees: z.coerce.number().min(0, {message: "Fees cannot be negative."}).optional().default(0),
});

export type SellStockFormValues = z.infer<typeof SellStockSchema>;
