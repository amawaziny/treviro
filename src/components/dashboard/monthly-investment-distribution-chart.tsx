"use client";

import * as React from "react";
import { ResponsivePie } from '@nivo/pie';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvestments } from "@/hooks/use-investments";
import { calculateMonthlyCashFlowSummary } from '@/lib/financial-utils';
import { useTheme } from 'next-themes';
import { formatNumberWithSuffix } from '@/lib/utils';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  'Real Estate': 'Real Estate',
  'Gold': 'Gold',
  'Stocks': 'Stocks',
  'Debt Instruments': 'Debt instruments',
  'Debt instruments': 'Debt instruments',
  'Currencies': 'Currencies',
};

const INVESTMENT_ORDER = [
  'Real Estate',
  'Gold',
  'Stocks',
  'Debt instruments',
  'Currencies',
];

export function MonthlyInvestmentDistributionChart() {
  const { investments, isLoading } = useInvestments();
  const { resolvedTheme } = useTheme();

  // Color palettes for light/dark mode
  const LIGHT_COLORS = {
    'Real Estate': '#b6d037',
    'Gold': '#e6b93e',
    'Stocks': '#e05a47',
    'Debt instruments': '#5e9c1c',
    'Currencies': '#7bb661',
  };
  const DARK_COLORS = {
    'Real Estate': '#7bb661',
    'Gold': '#e6b93e',
    'Stocks': '#ff7b6b',
    'Debt instruments': '#b6d037',
    'Currencies': '#45818e',
  };
  const COLORS = resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  // Filter investments for this month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  // Calculate real estate installments for this month using the same logic as the dashboard summary
  const { expenseRecords, fixedEstimates } = useInvestments();
  const cashFlowSummary = React.useMemo(() => calculateMonthlyCashFlowSummary({
    incomeRecords: [],
    expenseRecords,
    investments,
    fixedEstimates,
    month: now,
  }), [expenseRecords, investments, fixedEstimates, now]);
  const realEstateInstallmentsMonthly = cashFlowSummary.realEstateInstallmentsMonthly || 0;

  const monthlyInvestments = React.useMemo(() => {
    if (isLoading || investments.length === 0) return [];
    return investments.filter(inv => {
      if (!inv.purchaseDate) return false;
      const date = typeof inv.purchaseDate === 'string' ? parseISO(inv.purchaseDate) : inv.purchaseDate;
      return date >= monthStart && date <= monthEnd;
    });
  }, [investments, isLoading, monthStart, monthEnd]);

  // Use the cashFlowSummary for exact breakdown matching the cash flow card (now only actual paid real estate installments)
  const chartData = React.useMemo(() => {
    const data = [];
    if (cashFlowSummary.totalStockInvestmentThisMonth > 0) {
      data.push({
        id: 'Stocks',
        label: 'Stocks',
        value: cashFlowSummary.totalStockInvestmentThisMonth,
        color: COLORS['Stocks'] || '#e05a47',
      });
    }
    if (cashFlowSummary.totalGoldInvestmentThisMonth > 0) {
      data.push({
        id: 'Gold',
        label: 'Gold',
        value: cashFlowSummary.totalGoldInvestmentThisMonth,
        color: COLORS['Gold'] || '#e6b93e',
      });
    }
    if (cashFlowSummary.totalDebtInvestmentThisMonth > 0) {
      data.push({
        id: 'Debt instruments',
        label: 'Debt instruments',
        value: cashFlowSummary.totalDebtInvestmentThisMonth,
        color: COLORS['Debt instruments'] || '#5e9c1c',
      });
    }
    if (cashFlowSummary.realEstateInstallmentsMonthly > 0) {
      data.push({
        id: 'Real Estate Installments',
        label: 'Real Estate Installments',
        value: cashFlowSummary.realEstateInstallmentsMonthly, // now only paid installments due this month
        color: '#6b7280',
      });
    }
    return data;
  }, [cashFlowSummary, COLORS]);

  const total = cashFlowSummary.totalInvestmentsThisMonth || 0;

  return (
    <Card className={resolvedTheme === 'dark' ? 'bg-[#181c2a] text-white rounded-2xl shadow-xl' : 'text-[#23255a] rounded-2xl shadow-xl'}>
      <CardHeader>
        <CardTitle className={resolvedTheme === 'dark' ? 'text-white text-lg font-bold' : 'text-[#23255a] text-lg font-bold'}>This Month's Investment Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[300px]">
          <ResponsivePie
            data={chartData}
            margin={{ top: 20, right: 10, bottom: 10, left: 10 }}
            innerRadius={0.5}
            padAngle={4}
            cornerRadius={8}
            activeOuterRadiusOffset={5}
            colors={chartData.map(d => d.color)}
            borderWidth={4}
            enableArcLabels={true}
            enableArcLinkLabels={true}
            arcLinkLabelsTextColor={d => d.color}
            arcLinkLabelsSkipAngle={3}
            arcLinkLabelsDiagonalLength={10}
            arcLinkLabelsStraightLength={10}
            arcLinkLabelsThickness={4}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLinkLabel={d => `${d.label} ${((d.value/total)*100).toFixed(0)}%`}
            arcLinkLabelsTextOffset={10}
            tooltip={({ datum }) => (
              <div style={{ padding: 10, background: resolvedTheme === 'dark' ? '#181c2a' : '#fff', color: resolvedTheme === 'dark' ? '#fff' : '#23255a', borderRadius: 6, minWidth: 120, fontWeight: 600 }}>
                <strong>{datum.label}: </strong>
                {formatNumberWithSuffix(datum.value)}
              </div>
            )}
            theme={{
              labels: {
                text: {
                  fontSize: 14,
                  fontWeight: 700,
                  fill: resolvedTheme === 'dark' ? '#fff' : '#23255a',
                  textShadow: resolvedTheme === 'dark' ? '0 2px 8px #181c2a' : '0 2px 8px #fff',
                  filter: resolvedTheme === 'dark' ? 'drop-shadow(0 2px 8px #181c2a)' : 'drop-shadow(0 2px 8px #fff)'
                },
              },
            }}
            animate={true}
            motionConfig="wobbly"
            isInteractive={true}
            layers={['arcs', 'arcLinkLabels', 'legends',
              // Custom layer for center total
              (props) => {
                const { centerX, centerY } = props;
                return (
                  <g transform={`translate(${centerX},${centerY})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: 28, fontWeight: 700, fill: resolvedTheme === 'dark' ? '#fff' : '#23255a' }}
                    >
                      {formatNumberWithSuffix(total)}
                    </text>
                    <text
                      y={24}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: 14, fill: resolvedTheme === 'dark' ? '#fff' : '#23255a', opacity: 0.7 }}
                    >
                      Total
                    </text>
                  </g>
                );
              }
            ]}
          />
        </div>
        {/* Custom legend below chart */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
          {chartData.map((d, i) => (
            <div key={d.id} className="flex items-center gap-2 min-w-[110px]">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }} />
              <span className={resolvedTheme === 'dark' ? 'font-semibold text-white' : 'font-semibold text-[#23255a]'}>{d.label}:</span>
              <span className={resolvedTheme === 'dark' ? 'font-semibold text-white' : 'font-semibold text-[#23255a]'}>{((d.value/total)*100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
