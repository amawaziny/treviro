"use client"

import * as React from "react"
import { ResponsivePie } from '@nivo/pie';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useTheme } from 'next-themes';
import { formatNumberWithSuffix } from "@/lib/utils";

interface InvestmentDistributionCardProps {
  title: string;
  chartData: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  total: number;
}

export function InvestmentDistributionCard({ title, chartData, total }: InvestmentDistributionCardProps) {
  const { resolvedTheme } = useTheme();


  return (
    <Card className={resolvedTheme === 'dark' ? 'bg-[#181c2a] text-white rounded-2xl shadow-xl' : 'text-[#23255a] rounded-2xl shadow-xl'}>
    <CardHeader>
      <CardTitle className={resolvedTheme === 'dark' ? 'text-white text-lg font-bold' : 'text-[#23255a] text-lg font-bold'}>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative mx-auto h-[300px] max-w-full overflow-hidden">
        <ResponsivePie
          data={chartData}
          margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
          innerRadius={0.5}
          padAngle={4}
          cornerRadius={8}
          activeOuterRadiusOffset={3}
          colors={chartData.map(d => d.color)}
          borderWidth={4}
          enableArcLabels={true}
          enableArcLinkLabels={true}
          arcLinkLabelsTextColor={d => d.color}
          arcLinkLabelsSkipAngle={2}
          arcLinkLabelsDiagonalLength={5}
          arcLinkLabelsStraightLength={5}
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
                fontSize: 11,
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
                    style={{ fontSize: 24, fontWeight: 700, fill: resolvedTheme === 'dark' ? '#fff' : '#23255a' }}
                  >
                    {formatNumberWithSuffix(total)}
                  </text>
                  <text
                    y={24}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#fff' : '#23255a', opacity: 0.7 }}
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
      <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-2 sm:mt-4 px-2">
        {chartData.map((d, i) => (
          <div key={d.id} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className={resolvedTheme === 'dark' ? 'font-medium text-white' : 'font-medium text-[#23255a] truncate max-w-[70px] sm:max-w-none'}>{d.label}:</span>
            <span className={resolvedTheme === 'dark' ? 'font-medium text-white' : 'font-medium text-[#23255a]'}>{((d.value/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>

  );
}
