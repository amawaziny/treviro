
"use client";

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import type { StockChartDataPoint, StockChartTimeRange } from '@/lib/types';
import { Card, CardContent } from '../ui/card';


interface StockDetailChartProps {
  stockSymbol: string; // Used for potential future API calls or more specific mock data
}

// Mock data generation
const generateMockData = (range: StockChartTimeRange): StockChartDataPoint[] => {
  const data: StockChartDataPoint[] = [];
  let numPoints: number;
  let startDate = new Date();
  let priceVolatility = 5;
  let basePrice = Math.random() * 100 + 50; // Random base price between 50 and 150

  switch (range) {
    case '1D':
      numPoints = 24; // Hourly for a day
      startDate.setDate(startDate.getDate() - 1);
      priceVolatility = 2;
      break;
    case '1W':
      numPoints = 7; // Daily for a week
      startDate.setDate(startDate.getDate() - 7);
      priceVolatility = 5;
      break;
    case '1M':
      numPoints = 30; // Daily for a month
      startDate.setMonth(startDate.getMonth() - 1);
      priceVolatility = 10;
      break;
    case '6M':
      numPoints = 26; // Weekly for 6 months (approx)
      startDate.setMonth(startDate.getMonth() - 6);
      priceVolatility = 20;
      break;
    case '1Y':
      numPoints = 52; // Weekly for a year
      startDate.setFullYear(startDate.getFullYear() - 1);
      priceVolatility = 25;
      break;
    case '5Y':
      numPoints = 60; // Monthly for 5 years
      startDate.setFullYear(startDate.getFullYear() - 5);
      priceVolatility = 40;
      break;
    default:
      numPoints = 30;
  }

  for (let i = 0; i < numPoints; i++) {
    const date = new Date(startDate);
    if (range === '1D') date.setHours(startDate.getHours() + i);
    else if (range === '1W' || range === '1M') date.setDate(startDate.getDate() + i);
    else if (range === '6M' || range === '1Y') date.setDate(startDate.getDate() + i * 7); // Weekly
    else if (range === '5Y') date.setMonth(startDate.getMonth() + i); // Monthly

    const price = basePrice + (Math.random() - 0.5) * priceVolatility;
    data.push({
      date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      price: parseFloat(price.toFixed(2)),
    });
    basePrice = price > 0 ? price : 1; // Ensure price doesn't go negative
  }
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};


const timeRanges: StockChartTimeRange[] = ['1D', '1W', '1M', '6M', '1Y', '5Y'];

export function StockDetailChart({ stockSymbol }: StockDetailChartProps) {
  const [selectedRange, setSelectedRange] = useState<StockChartTimeRange>('1M');

  const chartData = useMemo(() => generateMockData(selectedRange), [selectedRange]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-center space-x-1 mb-4">
        {timeRanges.map(range => (
          <Button
            key={range}
            variant={selectedRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: -20, bottom: 5 }} // Adjusted left margin
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
                 // Simple date formatting based on range - can be more sophisticated
                if (selectedRange === '1D') return new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'});
                if (selectedRange === '1W' || selectedRange === '1M') return new Date(tick).toLocaleDateString([], { month: 'short', day: 'numeric'});
                if (selectedRange === '6M' || selectedRange === '1Y') return new Date(tick).toLocaleDateString([], { month: 'short', year: '2-digit'});
                return new Date(tick).toLocaleDateString([], { year: 'numeric' });
            }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            itemStyle={{ color: 'hsl(var(--primary))' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }}/>
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={stockSymbol} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
