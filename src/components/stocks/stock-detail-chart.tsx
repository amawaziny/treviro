
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import type { StockChartDataPoint, StockChartTimeRange } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, QueryDocumentSnapshot, DocumentData, documentId, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

interface StockDetailChartProps {
  securityId: string;
}

const timeRanges: StockChartTimeRange[] = ['1W', '1M', '6M', '1Y', '5Y'];

const getNumPointsForRange = (range: StockChartTimeRange): number => {
  // This is now only used for 6M, 1Y, 5Y ranges
  switch (range) {
    case '6M': return 180;
    case '1Y': return 365;
    case '5Y': return 365 * 5;
    default: return 30; // Default for any other case, though not expected for these ranges
  }
};

export function StockDetailChart({ securityId }: StockDetailChartProps) {
  const { language } = useLanguage();
  const [selectedRange, setSelectedRange] = useState<StockChartTimeRange>('1W');
  const [chartData, setChartData] = useState<StockChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`StockDetailChart: useEffect triggered. Range: ${selectedRange}, Security ID: ${securityId}`);
    if (!securityId) {
      setIsLoading(false);
      setError("No security ID provided to fetch chart data.");
      setChartData([]);
      return;
    }
    if (!db) {
      setIsLoading(false);
      setError("Firestore is not available. Cannot fetch chart data.");
      setChartData([]);
      return;
    }

    const fetchPriceHistory = async () => {
      setIsLoading(true);
      setError(null);
      setChartData([]); // Clear previous data

      try {
        let firestoreQuery;
        const priceHistoryRef = collection(db, `listedStocks/${securityId}/priceHistory`);

        if (selectedRange === '1W' || selectedRange === '1M') {
          const today = new Date();
          const daysToSubtract = selectedRange === '1W' ? 7 : 30;
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - daysToSubtract);
          
          const startDateString = format(startDate, 'yyyy-MM-dd');
          
          console.log(`StockDetailChart: Range ${selectedRange}. Fetching from date >= ${startDateString}`);

          firestoreQuery = query(
            priceHistoryRef,
            where(documentId(), '>=', startDateString),
            orderBy(documentId(), 'asc') 
          );
        } else {
          // For 6M, 1Y, 5Y, use the limit N points logic
          const numPoints = getNumPointsForRange(selectedRange);
          console.log(`StockDetailChart: Range ${selectedRange}. Fetching last ${numPoints} points (desc order).`);
          firestoreQuery = query(
            priceHistoryRef,
            orderBy(documentId(), 'desc'),
            limit(numPoints)
          );
        }
        
        const querySnapshot = await getDocs(firestoreQuery);
        const data: StockChartDataPoint[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const docData = doc.data();
          if (docData.price !== undefined) { 
            data.push({
              date: doc.id, 
              price: parseFloat(docData.price),
            });
          }
        });
        
        console.log(`StockDetailChart: Fetched ${data.length} data points for range ${selectedRange}. Sample (raw):`, JSON.stringify(data.slice(0,3)));
        
        // If we fetched with limit (desc order for 6M+), we need to reverse.
        // If we fetched with date range (asc order for 1W, 1M), it's already correct.
        const finalData = (selectedRange !== '1W' && selectedRange !== '1M') ? data.reverse() : data;
        setChartData(finalData);
        console.log(`StockDetailChart: chartData state updated with ${finalData.length} points. Full chartData sample:`, JSON.stringify(finalData.slice(0,Math.min(3, finalData.length))));

      } catch (err: any) {
        console.error("Error fetching price history:", err);
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
          setError(`Firestore index missing for price history. Please create it in Firebase console. Details: ${err.message}`);
        } else {
          setError(err.message || "Failed to load chart data.");
        }
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
        <div className="flex justify-center space-x-1 mb-4">
            {timeRanges.map(range => (
            <Button
                key={range}
                variant={selectedRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange(range)}
                disabled // Disable buttons while loading initial data for a range
            >
                {range}
            </Button>
            ))}
        </div>
        <Skeleton className="h-[calc(100%-3.5rem)] w-full" /> 
        <p className="text-muted-foreground mt-2">Loading chart data for {selectedRange}...</p>
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
             <p className="text-muted-foreground">No price history data available for this security or selected range ({selectedRange}).</p>
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
          margin={{ top: 5, right: 20, left: language === 'ar' ? 5 : -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
                const dateObj = new Date(tick + "T00:00:00"); // Assume UTC if no timezone in string
                if (chartData.length <= 15 && (selectedRange === '1W' || selectedRange === '1M')) return format(dateObj, 'MMM d'); // Show more ticks for sparse short ranges
                if (selectedRange === '1W' || selectedRange === '1M') return format(dateObj, 'MMM d');
                if (selectedRange === '6M' || selectedRange === '1Y') return format(dateObj, 'MMM yy');
                return format(dateObj, 'yyyy');
            }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval="preserveStartEnd"
            minTickGap={selectedRange === '1W' || selectedRange === '1M' ? 20 : 50}
            reversed={language === 'ar'}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            domain={['auto', 'auto']}
            orientation={language === 'ar' ? 'right' : 'left'}
            yAxisId="priceAxis"
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
                return [`$${value.toFixed(2)}`, "Price"];
            }}
            labelFormatter={(label: string) => format(new Date(label + "T00:00:00"), 'MMM d, yyyy')}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }}/>
          <Line 
            yAxisId="priceAxis"
            type="monotone" 
            dataKey="price" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2} 
            dot={chartData.length < 30} // Show dots if few data points
            name="Price" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
