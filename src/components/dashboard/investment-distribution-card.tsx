"use client";
import { useLanguage } from "@/contexts/language-context";

import * as React from "react";
import { ResponsivePie } from "@nivo/pie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { formatNumberWithSuffix } from "@/lib/utils";

const INVESTMENT_ORDER = [
  "Real Estate",
  "Gold",
  "Stocks",
  "Debt Instruments",
  "Currencies",
];

// Create default checked items object
const DEFAULT_CHECKED_ITEMS = INVESTMENT_ORDER.reduce(
  (acc, type) => ({
    ...acc,
    [type]: true,
  }),
  {},
);

interface InvestmentDistributionCardProps {
  title: string;
  chartData: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  allChartData?: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  total: number;
  checkedItems?: Record<string, boolean>;
  defaultCheckedItems?: Record<string, boolean>;
  onCheckboxChange?: (type: string) => void;
  isEmpty?: boolean;
}

export function InvestmentDistributionCard({
  title,
  chartData,
  allChartData,
  total,
  checkedItems: controlledCheckedItems,
  defaultCheckedItems = DEFAULT_CHECKED_ITEMS,
  onCheckboxChange: onControlledCheckboxChange,
  isEmpty: controlledIsEmpty = false,
}: InvestmentDistributionCardProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Internal state for uncontrolled usage
  const [uncontrolledCheckedItems, setUncontrolledCheckedItems] =
    React.useState<Record<string, boolean>>(defaultCheckedItems);

  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledCheckedItems !== undefined;
  const checkedItems = isControlled
    ? controlledCheckedItems
    : uncontrolledCheckedItems;

  // Handle checkbox changes
  const handleCheckboxChange = (type: string) => {
    const newValue = !checkedItems[type];

    if (isControlled) {
      onControlledCheckboxChange?.(type);
    } else {
      setUncontrolledCheckedItems((prev) => ({
        ...prev,
        [type]: newValue,
      }));
    }
  };

  // Calculate if all items are unchecked
  const allUnchecked = Object.values(checkedItems).every((checked) => !checked);
  const isEmpty = controlledIsEmpty || allUnchecked;

  // Filter chart data based on checked items
  const filteredChartData = chartData.filter(
    (item) => checkedItems[item.id] !== false,
  );

  // Use allChartData for legend if provided, otherwise fall back to chartData
  const legendData = allChartData || chartData;

  // When empty, show a skeleton pie chart with $0 total
  const displayChartData = isEmpty ? [] : filteredChartData;
  const displayTotal = isEmpty
    ? 0
    : filteredChartData.reduce((sum, item) => sum + item.value, 0);

  // Create skeleton data for the empty state
  const skeletonData = [
    {
      id: "empty",
      label: t("no_investments"),
      value: 1,
      color: isDark ? "#2d3748" : "#e2e8f0",
    },
  ];

  // Use filtered data for the chart, or skeleton data when empty
  const chartToRender = isEmpty ? skeletonData : displayChartData;

  return (
    <Card
      className={
        resolvedTheme === "dark"
          ? "bg-[#181c2a] text-white rounded-2xl shadow-xl"
          : "text-[#23255a] rounded-2xl shadow-xl"
      }
    >
      <CardHeader>
        <CardTitle
          className={
            resolvedTheme === "dark"
              ? "text-white text-lg font-bold"
              : "text-[#23255a] text-lg font-bold"
          }
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[300px] max-w-full overflow-hidden">
          <ResponsivePie
            data={chartToRender}
            margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
            innerRadius={0.5}
            padAngle={4}
            cornerRadius={8}
            activeOuterRadiusOffset={3}
            colors={chartToRender.map((d) => d.color)}
            borderWidth={4}
            enableArcLabels={!isEmpty}
            enableArcLinkLabels={!isEmpty}
            arcLinkLabelsTextColor={(d) => d.color}
            arcLinkLabelsSkipAngle={2}
            arcLinkLabelsDiagonalLength={5}
            arcLinkLabelsStraightLength={5}
            arcLinkLabelsThickness={4}
            arcLinkLabelsColor={{ from: "color" }}
            arcLinkLabel={(d) =>
              `${d.label} ${((d.value / (isEmpty ? 1 : total)) * 100).toFixed(0)}%`
            }
            arcLinkLabelsTextOffset={10}
            tooltip={({ datum }) => (
              <div
                className="text-xs sm:text-[11px]"
                style={{
                  padding: 10,
                  background: resolvedTheme === "dark" ? "#181c2a" : "#fff",
                  color: resolvedTheme === "dark" ? "#fff" : "#23255a",
                  borderRadius: 6,
                  minWidth: 120,
                  fontWeight: 600,
                }}
              >
                <strong>{datum.label}: </strong>
                {formatNumberWithSuffix(datum.value)}
              </div>
            )}
            theme={{
              labels: {
                text: {
                  fontSize: 11,
                  fontWeight: 600,
                  fill: resolvedTheme === "dark" ? "#fff" : "#23255a",
                  textShadow:
                    resolvedTheme === "dark"
                      ? "0 2px 8px #181c2a"
                      : "0 2px 8px #fff",
                  filter:
                    resolvedTheme === "dark"
                      ? "drop-shadow(0 2px 8px #181c2a)"
                      : "drop-shadow(0 2px 8px #fff)",
                },
              },
            }}
            animate={true}
            motionConfig="wobbly"
            isInteractive={true}
            layers={[
              "arcs",
              "arcLinkLabels",
              "legends",
              // Custom layer for center total
              (props) => {
                const { centerX, centerY } = props;
                return (
                  <g transform={`translate(${centerX},${centerY})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        fill: resolvedTheme === "dark" ? "#fff" : "#23255a",
                        opacity: isEmpty ? 0.7 : 1,
                      }}
                    >
                      {formatNumberWithSuffix(displayTotal)}
                    </text>
                    <text
                      y={24}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fontSize: 12,
                        fill: resolvedTheme === "dark" ? "#fff" : "#23255a",
                        opacity: 0.7,
                      }}
                    >
                      {t("total")}
                    </text>
                  </g>
                );
              },
            ]}
          />
        </div>
        {/* Custom legend below chart */}
        <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-2 sm:mt-4 px-2">
          {legendData.map((d) => {
            const isChecked = checkedItems[d.id] !== false;
            const dataPoint = chartData.find((item) => item.id === d.id) || {
              value: 0,
            };
            const percentage = total > 0 ? (dataPoint.value / total) * 100 : 0;
            const displayValue =
              isChecked && dataPoint.value > 0 ? percentage.toFixed(0) : "0";

            return (
              <div
                key={d.id}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm cursor-pointer"
                onClick={() => handleCheckboxChange(d.id)}
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-2 appearance-none transition-colors ${
                      resolvedTheme === "dark"
                        ? "border-gray-500"
                        : "border-gray-400"
                    } ${
                      isChecked
                        ? "bg-blue-500 border-blue-500"
                        : "bg-transparent"
                    }`}
                    style={{
                      backgroundImage: isChecked
                        ? "url(" +
                          (resolvedTheme === "dark"
                            ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E"
                            : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E") +
                          ")"
                        : "none",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "contain",
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-sm"
                    style={{
                      backgroundColor: d.color,
                      opacity: isChecked ? 1 : 0.3,
                      pointerEvents: "none",
                    }}
                  />
                </div>
                <span
                  className={
                    resolvedTheme === "dark"
                      ? `font-medium ${isChecked ? "text-white" : "text-gray-500"}`
                      : `font-medium ${isChecked ? "text-[#23255a]" : "text-gray-400"} truncate max-w-[70px] sm:max-w-none`
                  }
                >
                  {d.label}:
                </span>
                <span
                  className={
                    resolvedTheme === "dark"
                      ? `font-medium ${isChecked ? "text-white" : "text-gray-500"}`
                      : `font-medium ${isChecked ? "text-[#23255a]" : "text-gray-400"}`
                  }
                >
                  {displayValue}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
