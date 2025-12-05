import { useLanguage } from "@/contexts/language-context";
import { useTheme } from "next-themes";
import React from "react";
import { AdvancedChart } from "react-tradingview-embed";
import { useTimeZone } from "@/hooks/use-timezone";

interface SecurityChartProps {
  symbol: string;
  width?: string | number;
  height?: string | number;
}

/**
 * SecurityChart Component
 * Wraps TradingView AdvancedChart widget with dynamic symbol
 */
const SecurityChart: React.FC<SecurityChartProps> = ({ symbol, width = "100%", height = "100%" }) => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const timeZone = useTimeZone();

  return (
    <div className="w-full h-full">
      <AdvancedChart
        widgetProps={{
          symbol: symbol,
          theme: theme || "dark",
          autosize: true,
          height: height,
          width: width,
          locale: language,
          // interval: "D",
          timezone: timeZone,
        }}
      />
    </div>
  );
};

export default SecurityChart;
