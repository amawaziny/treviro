'use server';

/**
 * @fileOverview Analyzes currency exchange rates for transactions and notifies users of significant deviations from historical rates.
 *
 * - currencyFluctuationAnalysis - A function that analyzes currency exchange rates.
 * - CurrencyFluctuationAnalysisInput - The input type for the currencyFluctuationAnalysis function.
 * - CurrencyFluctuationAnalysisOutput - The return type for the currencyFluctuationAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CurrencyFluctuationAnalysisInputSchema = z.object({
  transactionCurrency: z
    .string()
    .describe('The currency of the transaction (e.g., USD).'),
  transactionAmount: z.number().describe('The amount of the transaction.'),
  transactionDate: z
    .string()
    .describe('The date of the transaction in ISO format (YYYY-MM-DD).'),
  baseCurrency: z.string().describe('The base currency for comparison (e.g., EUR).'),
  currentExchangeRate: z
    .number()
    .describe('The current exchange rate between the transaction currency and the base currency.'),
});

export type CurrencyFluctuationAnalysisInput = z.infer<
  typeof CurrencyFluctuationAnalysisInputSchema
>;

const CurrencyFluctuationAnalysisOutputSchema = z.object({
  significantDeviation: z
    .boolean()
    .describe(
      'Whether the current exchange rate deviates significantly from the historical rate.'
    ),
  deviationPercentage: z
    .number()
    .describe(
      'The percentage of deviation between the current and historical exchange rates.'
    ),
  analysisSummary: z
    .string()
    .describe('A summary of the currency fluctuation analysis.'),
});

export type CurrencyFluctuationAnalysisOutput = z.infer<
  typeof CurrencyFluctuationAnalysisOutputSchema
>;

export async function currencyFluctuationAnalysis(
  input: CurrencyFluctuationAnalysisInput
): Promise<CurrencyFluctuationAnalysisOutput> {
  return currencyFluctuationAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'currencyFluctuationAnalysisPrompt',
  input: {schema: CurrencyFluctuationAnalysisInputSchema},
  output: {schema: CurrencyFluctuationAnalysisOutputSchema},
  prompt: `You are an expert financial analyst specializing in currency exchange rates.

You are provided with the details of a transaction, including the currency, amount, and date.
You are also provided with the current exchange rate between the transaction currency and a base currency.

Your task is to determine if the current exchange rate significantly deviates from the historical exchange rate at the time of the transaction.

Here are the transaction details:
- Transaction Currency: {{{transactionCurrency}}}
- Transaction Amount: {{{transactionAmount}}}
- Transaction Date: {{{transactionDate}}}
- Base Currency: {{{baseCurrency}}}
- Current Exchange Rate: {{{currentExchangeRate}}}

Consider a significant deviation to be more than 5%.

Analyze the provided information and determine:
1. Whether the current exchange rate deviates significantly from the historical rate.
2. The percentage of deviation between the current and historical exchange rates.
3. A summary of your analysis.

Output the results in JSON format.
`, // Adjusted prompt to request JSON output.
});

const currencyFluctuationAnalysisFlow = ai.defineFlow(
  {
    name: 'currencyFluctuationAnalysisFlow',
    inputSchema: CurrencyFluctuationAnalysisInputSchema,
    outputSchema: CurrencyFluctuationAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
