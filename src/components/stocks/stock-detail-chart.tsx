
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import type { StockChartDataPoint, StockChartTimeRange } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, QueryDocumentSnapshot, DocumentData, documentId } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context'; // Added

interface StockDetailChartProps {
  securityId: string;
}

const timeRanges: StockChartTimeRange[] = ['1W', '1M', '6M', '1Y', '5Y'];

const getNumPointsForRange = (range: StockChartTimeRange): number => {
  switch (range) {
    // '1D' case removed
    case '1W': return 7;
    case '1M': return 30;
    case '6M': return 180; 
    case '1Y': return 365;
    case '5Y': return 365 * 5;
    default: return 30; // Default to 30 points if range is somehow undefined
  }
};

export function StockDetailChart({ securityId }: StockDetailChartProps) {
  const { language } = useLanguage(); // Added
  const [selectedRange, setSelectedRange] = useState<StockChartTimeRange>('1W'); // Default to '1W'
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
    if (!db) {
      setIsLoading(false);
      setError("Firestore is not available. Cannot fetch chart data.");
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
        
        const q = query(priceHistoryRef, orderBy(documentId(), "desc"), limit(numPoints));
        
        const querySnapshot = await getDocs(q);
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

        setChartData(data.reverse());

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
        <Skeleton className="h-10 w-3/4 mb-4" /> 
        <Skeleton className="h-[calc(100%-3.5rem)] w-full" /> 
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
          margin={{ top: 5, right: 20, left: language === 'ar' ? 5 : -20, bottom: 5 }} // Adjusted left margin for Y-axis
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
                const dateObj = new Date(tick + "T00:00:00"); 
                if (selectedRange === '1D' || selectedRange === '1W') return format(dateObj, 'MMM d');
                if (selectedRange === '1M' || selectedRange === '6M') return format(dateObj, 'MMM d');
                if (selectedRange === '1Y') return format(dateObj, 'MMM yy');
                return format(dateObj, 'yyyy');
            }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            interval="preserveStartEnd"
            minTickGap={50}
            reversed={language === 'ar'} // Set XAxis to reversed for RTL
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            domain={['auto', 'auto']}
            orientation={language === 'ar' ? 'right' : 'left'} // Set YAxis orientation for RTL
            yAxisId="priceAxis" // Added yAxisId for clarity
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
            yAxisId="priceAxis" // Refer to the yAxisId
            type="monotone" 
            dataKey="price" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2} 
            dot={false} 
            name="Price" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
