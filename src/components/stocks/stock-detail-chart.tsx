
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import type { StockChartDataPoint, StockChartTimeRange } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { subDays, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

interface StockDetailChartProps {
  securityId: string; // Changed from stockSymbol to securityId
}

const timeRanges: StockChartTimeRange[] = ['1D', '1W', '1M', '6M', '1Y', '5Y'];

const getNumPointsForRange = (range: StockChartTimeRange): number => {
  switch (range) {
    case '1D': return 7; // Show last 7 daily points for "1D" as we only have daily data
    case '1W': return 7;
    case '1M': return 30;
    case '6M': return 180; // Approx 6 months of daily data
    case '1Y': return 365;
    case '5Y': return 365 * 5;
    default: return 30;
  }
};

export function StockDetailChart({ securityId }: StockDetailChartProps) {
  const [selectedRange, setSelectedRange] = useState<StockChartTimeRange>('1M');
  const [chartData, setChartData] = useState<StockChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!securityId) {
      setIsLoading(false);
      setError("No security ID provided to fetch chart data.");
      setChartData([]);
      return;
    }

    const fetchPriceHistory = async () => {
      setIsLoading(true);
      setError(null);
      setChartData([]);

      try {
        const numPoints = getNumPointsForRange(selectedRange);
        const priceHistoryRef = collection(db, `listedStocks/${securityId}/priceHistory`);
        
        // To get the last N points, we query by date string in descending order.
        // The document IDs are 'YYYY-MM-DD'.
        const q = query(priceHistoryRef, orderBy(document.id, "desc"), limit(numPoints));
        
        const querySnapshot = await getDocs(q);
        const data: StockChartDataPoint[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const docData = doc.data();
          if (docData.price !== undefined) { // Ensure price field exists
            data.push({
              date: doc.id, // doc.id is 'YYYY-MM-DD'
              price: parseFloat(docData.price),
            });
          }
        });

        // Data is fetched in descending order of date, reverse to make it ascending for the chart
        setChartData(data.reverse());

      } catch (err: any) {
        console.error("Error fetching price history:", err);
        setError(err.message || "Failed to load chart data.");
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceHistory();
  }, [securityId, selectedRange]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Skeleton className="h-10 w-3/4 mb-4" /> {/* Skeleton for buttons */}
        <Skeleton className="h-[calc(100%-3.5rem)] w-full" /> {/* Skeleton for chart area */}
        <p className="text-muted-foreground mt-2">Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
       <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Chart Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (chartData.length === 0 && !isLoading) {
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
        <div className="flex-grow flex items-center justify-center">
             <p className="text-muted-foreground">No price history data available for this security or selected range.</p>
        </div>
      </div>
    );
  }


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
          margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
                const dateObj = new Date(tick + "T00:00:00"); // Ensure parsing as local date
                if (selectedRange === '1D' || selectedRange === '1W') return format(dateObj, 'MMM d');
                if (selectedRange === '1M' || selectedRange === '6M') return format(dateObj, 'MMM d');
                if (selectedRange === '1Y') return format(dateObj, 'MMM yy');
                return format(dateObj, 'yyyy');
            }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval="preserveStartEnd"
            minTickGap={50}
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
            formatter={(value: number, name: string, props: any) => {
                const securityName = props?.payload?.name || "Price"; // Get security name if available
                return [`$${value.toFixed(2)}`, securityName];
            }}
            labelFormatter={(label: string) => format(new Date(label + "T00:00:00"), 'MMM d, yyyy')}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }}/>
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Price" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
