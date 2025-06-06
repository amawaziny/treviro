import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvestments } from '@/hooks/use-investments';
import { formatNumberWithSuffix } from '@/lib/utils';
import { TrendingUp, TrendingDown, Landmark, Coins, LineChart, FileText, CircleDollarSign } from 'lucide-react';
import React from 'react';

const investmentTypeIcons = {
  'Real Estate': Landmark,
  'Gold': Coins,
  'Stocks': LineChart,
  'Debt instruments': FileText,
  'Currencies': CircleDollarSign,
};

const investmentTypeColors = {
  'Real Estate': '#a6c037',
  'Gold': '#e6b93e',
  'Stocks': '#e05a47',
  'Debt instruments': '#5e9c1c',
  'Currencies': '#45818e',
};

import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function InvestmentBreakdownCards() {
  const { investments } = useInvestments();
  if (!investments || investments.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No investments found.</div>;
  }

  // Helper: parse YYYY-MM-DD to Date
  const parseDateString = (dateStr?: string): Date | null => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  };

  // Calculate invested amount for each type
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // Group by type
  const typeGroups = investments.reduce((acc, inv) => {
    acc[inv.type] = acc[inv.type] || [];
    acc[inv.type].push(inv);
    return acc;
  }, {} as Record<string, typeof investments>);

  // For percent, use the sum of all invested (legacy: full amount for all types)
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amountInvested || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(typeGroups).map(([type, invs]) => {
        let invested = 0;
        if (type === 'Real Estate') {
          // Only sum paid installments due this month
          invs.forEach(inv => {
            const reInv = inv as import('@/lib/types').RealEstateInvestment;
            if (Array.isArray(reInv.installments)) {
              (reInv.installments as any[]).forEach((inst: any) => {
                const dueDate = parseDateString(inst.dueDate);
                if (
                  inst.status === 'Paid' &&
                  dueDate &&
                  isWithinInterval(dueDate, { start: currentMonthStart, end: currentMonthEnd })
                ) {
                  invested += inst.amount || 0;
                }
              });
            }
          });
        } else {
          invested = invs.reduce((sum, inv) => sum + (inv.amountInvested || 0), 0);
        }
        const current = invs.reduce((sum, inv) => sum + (inv.currentValue ?? inv.amountInvested ?? 0), 0);
        const percent = totalInvested > 0 ? (invested / totalInvested) * 100 : 0;
        const plAmount = current - invested;
        const plPercent = invested > 0 ? (plAmount / invested) * 100 : 0;
        const Icon = investmentTypeIcons[type as keyof typeof investmentTypeIcons] || FileText;
        return (
          <Card
            key={type}
            className={`flex flex-col justify-between shadow-md bg-[#f8fafc] dark:bg-[#23255a] p-4 min-h-[160px] rounded-xl border-0 relative`}
            style={{
              borderLeft: `8px solid ${
                investmentTypeColors[type as keyof typeof investmentTypeColors] || '#a6c037'
              }`,
            }}
          >
            <CardContent className="flex flex-col gap-2 p-0">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="rounded-full p-2"
                  style={{
                    background:
                      investmentTypeColors[type as keyof typeof investmentTypeColors] || '#a6c037',
                  }}
                >
                  <Icon className="h-7 w-7 text-[#23255a] dark:text-white" />
                </span>
                <span className="text-lg font-bold flex-1 text-[#23255a] dark:text-white">{type}</span>
                <Badge className={`text-xs px-2 py-1 bg-green-600 text-white`}>
                  {plAmount >= 0 ? (
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="inline h-4 w-4 mr-1" />
                  )}
                  {plAmount >= 0 ? '+' : ''}
                  {formatNumberWithSuffix(plAmount)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 items-end justify-between mt-2">
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">Invested</div>
                  <div className="font-bold text-base text-[#23255a] dark:text-white">
                    {formatNumberWithSuffix(invested)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">Current</div>
                  <div className="font-bold text-base text-[#23255a] dark:text-white">
                    {formatNumberWithSuffix(current)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">% of Portfolio</div>
                  <div className="font-bold text-base text-[#23255a] dark:text-white">
                    {percent.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-[#23255a] dark:text-white font-medium">P/L %</div>
                  <div
                    className={`font-bold text-base ${
                      plAmount >= 0
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {plPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
