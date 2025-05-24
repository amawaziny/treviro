
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
  currency: string;
}

const timeRanges: StockChartTimeRange[] = ['1W', '1M', '6M', '1Y', '5Y'];

const getNumPointsForRange = (range: StockChartTimeRange): number => {
  switch (range) {
    case '6M': return 180;
    case '1Y': return 365;
    case '5Y': return 365 * 5;
    default: return 30; 
  }
};

export function StockDetailChart({ securityId, currency }: StockDetailChartProps) {
  const { language } = useLanguage();
  const [selectedRange, setSelectedRange] = useState<StockChartTimeRange>('1W');
  const [chartData, setChartData] = useState<StockChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayCurrencySymbol = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'EGP' })
        .formatToParts(0).find(part => part.type === 'currency')?.value || (currency || 'EGP');
    } catch (e) {
      return currency || 'EGP'; // Fallback if currency code is invalid for Intl
    }
  }, [currency]);

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
        let firestoreQuery;
        const priceHistoryRef = collection(db, `listedStocks/${securityId}/priceHistory`);

        if (selectedRange === '1W' || selectedRange === '1M') {
          const today = new Date();
          const daysToSubtract = selectedRange === '1W' ? 7 : 30;
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - daysToSubtract);
          startDate.setHours(0, 0, 0, 0); // Start of the day
          
          const startDateString = format(startDate, 'yyyy-MM-dd');
          
          firestoreQuery = query(
            priceHistoryRef,
            where(documentId(), '>=', startDateString),
            orderBy(documentId(), 'asc') 
          );
        } else {
          const numPoints = getNumPointsForRange(selectedRange);
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
        
        const finalData = (selectedRange !== '1W' && selectedRange !== '1M') ? data.reverse() : data;
        setChartData(finalData);

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
                disabled 
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

  const yAxisTickFormatter = (value: number) => {
    // Show more precision for smaller values, less for larger to keep it compact
    if (Math.abs(value) < 10) return `${displayCurrencySymbol}${value.toFixed(currency === 'EGP' ? 3 : 2)}`;
    if (Math.abs(value) < 1000) return `${displayCurrencySymbol}${value.toFixed(0)}`;
    return `${displayCurrencySymbol}${(value / 1000).toFixed(1)}K`; // Compact for thousands
  };


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
          margin={{ top: 5, right: language === 'ar' ? 30 : 20, left: language === 'ar' ? 5 : -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
                try {
                    const dateObj = new Date(tick + "T00:00:00Z"); // Assume UTC
                    return format(dateObj, 'dd-MM-yyyy');
                } catch (e) { return tick; }
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
            tickFormatter={yAxisTickFormatter}
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
                const digits = currency === 'EGP' ? 3 : 2;
                return [new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value), "Price"];
            }}
            labelFormatter={(label: string) => {
                 try { return format(new Date(label + "T00:00:00Z"), 'dd-MM-yyyy') } catch(e) { return label; }
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }}/>
          <Line 
            yAxisId="priceAxis"
            type="monotone" 
            dataKey="price" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2} 
            dot={chartData.length < 60} 
            name="Price" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
