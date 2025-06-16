"use client";

import React, { useState, useMemo, useEffect } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { StockChartDataPoint, StockChartTimeRange } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  documentId,
  where,
} from "firebase/firestore";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrencyWithCommas, formatDateDisplay, formatNumberWithSuffix } from "@/lib/utils";

interface StockDetailChartProps {
  securityId: string;
  currency: string;
}

const timeRanges: StockChartTimeRange[] = ["1W", "1M", "6M", "1Y", "5Y"];

const getNumPointsForRange = (range: StockChartTimeRange): number => {
  switch (range) {
    case "6M":
      return 180;
    case "1Y":
      return 365;
    case "5Y":
      return 365 * 5;
    default:
      return 30;
  }
};

export function StockDetailChart({
  securityId,
  currency,
}: StockDetailChartProps) {
  const { t: t } = useLanguage();
  const { language } = useLanguage();
  const [selectedRange, setSelectedRange] = useState<StockChartTimeRange>("1W");
  const [chartData, setChartData] = useState<StockChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!securityId) {
      setIsLoading(false);
      setError(t("no_security_id_provided_to_fetch_chart_data"));
      setChartData([]);
      return;
    }
    if (!db) {
      setIsLoading(false);
      setError(t("firestore_is_not_available_cannot_fetch_chart_data"));
      setChartData([]);
      return;
    }

    const fetchPriceHistory = async () => {
      setIsLoading(true);
      setError(null);
      setChartData([]);

      try {
        let firestoreQuery;
        const priceHistoryRef = collection(
          db!,
          `listedStocks/${securityId}/priceHistory`,
        );

        if (selectedRange === "1W" || selectedRange === "1M") {
          const today = new Date();
          const daysToSubtract = selectedRange === "1W" ? 7 : 30;
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - daysToSubtract);
          startDate.setHours(0, 0, 0, 0); // Start of the day

          const startDateString = format(startDate, "yyyy-MM-dd");

          firestoreQuery = query(
            priceHistoryRef,
            where(documentId(), ">=", startDateString),
            orderBy(documentId(), "asc"),
          );
        } else {
          const numPoints = getNumPointsForRange(selectedRange);
          firestoreQuery = query(
            priceHistoryRef,
            orderBy(documentId(), "desc"),
            limit(numPoints),
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

        const finalData =
          selectedRange !== "1W" && selectedRange !== "1M"
            ? data.reverse()
            : data;
        setChartData(finalData);
      } catch (err: any) {
        console.error(t("error_fetching_price_history"), err);
        if (
          err.code === t("failedprecondition") &&
          err.message.includes("index")
        ) {
          setError(
            `Firestore index missing for price history. Please create it in Firebase console. Details: ${err.message}`,
          );
        } else {
          setError(err.message || t("failed_to_load_chart_data"));
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
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRange(range)}
              disabled
            >
              {range}
            </Button>
          ))}
        </div>
        <Skeleton className="h-[calc(100%-3.5rem)] w-full" />
        <p className="text-muted-foreground mt-2">
          {t("loading_chart_data_for")}
          {selectedRange}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("chart_error")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (chartData.length === 0 && !isLoading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex justify-center space-x-1 mb-4">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
        <div className="flex-grow flex items-center justify-center text-wrap">
          <p className="text-muted-foreground text-sm">
            {t(
              "no_price_history_data_available_for_this_security_or_selected_range",
            )}
            {selectedRange}).
          </p>
        </div>
      </div>
    );
  }

  const yAxisTickFormatter = (value: number) => {
    return formatNumberWithSuffix(value);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-center space-x-1 mb-4">
        {timeRanges.map((range) => (
          <Button
            key={range}
            variant={selectedRange === range ? "default" : "outline"}
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
          margin={{
            top: 5,
            right: language === "ar" ? 30 : 20,
            left: language === "ar" ? 5 : -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(tick) => {
              try {
                const dateObj = new Date(tick + "T00:00:00Z"); // Assume UTC
                return format(dateObj, "dd/MM/yy");
              } catch (e) {
                return tick;
              }
            }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            interval="preserveStartEnd"
            minTickGap={
              selectedRange === "1W" || selectedRange === "1M" ? 20 : 50
            }
            reversed={language === "ar"}
          />

          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickFormatter={yAxisTickFormatter}
            domain={["auto", "auto"]}
            orientation={language === "ar" ? "right" : "left"}
            yAxisId="priceAxis"
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            itemStyle={{ color: "hsl(var(--primary))" }}
            formatter={(value: number) => {
              return [formatCurrencyWithCommas(value, currency), "Price"];
            }}
            labelFormatter={(label: string) => {
              try {
                return formatDateDisplay(label + "T00:00:00Z");
              } catch (e) {
                return label;
              }
            }}
          />

          <Legend wrapperStyle={{ fontSize: "10px" }} />
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
