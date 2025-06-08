"use client"

import * as React from "react"
import { ResponsivePie } from '@nivo/pie';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { Investment } from "@/lib/types"
import { useInvestments } from "@/hooks/use-investments"
import { formatNumberWithSuffix } from '@/lib/utils';
import { useTheme } from 'next-themes';

const INVESTMENT_TYPE_COLORS: Record<string, string> = {
  'Real Estate': '#b6d037',      // light green
  'Gold': '#e6b93e',            // gold
  'Stocks': '#e05a47',          // red
  'Debt instruments': '#5e9c1c',// dark green
  'Currencies': '#7bb661',      // green
};

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

export function InvestmentDistributionChart() {
  const { investments, isLoading } = useInvestments();
  const { resolvedTheme } = useTheme();

  // Dynamic color palettes for light/dark mode
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

  const chartData = React.useMemo(() => {
    if (isLoading || investments.length === 0) return [];
    const distribution: { [key: string]: number } = {};
    investments.forEach(inv => {
      const label = INVESTMENT_TYPE_LABELS[inv.type] || inv.type;
      distribution[label] = (distribution[label] || 0) + inv.amountInvested;
    });
    return INVESTMENT_ORDER.map(type => {
      const label = INVESTMENT_TYPE_LABELS[type] || type;
      return {
        id: label,
        label: label,
        value: distribution[label] || 0,
        color: COLORS[label as keyof typeof COLORS] || '#8884d8',
      };
    }).filter(d => d.value > 0);
  }, [investments, isLoading, COLORS]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className={resolvedTheme === 'dark' ? 'bg-[#181c2a] text-white rounded-2xl shadow-xl' : 'text-[#23255a] rounded-2xl shadow-xl'}>
      <CardHeader>
        <CardTitle className={resolvedTheme === 'dark' ? 'text-white text-lg font-bold' : 'text-[#23255a] text-lg font-bold'}>Investment Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[300px] max-w-full overflow-hidden">
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

