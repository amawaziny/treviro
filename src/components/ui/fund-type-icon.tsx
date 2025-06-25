import React from "react";
import {
  Gem,
  Coins,
  Home,
  LineChart,
  Landmark,
  PiggyBank,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FundType } from "@/lib/types";

interface FundTypeIconProps {
  fundType?: FundType;
  className?: string;
  size?: number;
}

/**
 * Renders an icon representing the fund type using lucide-react icons.
 * @param fundType - The type of fund (e.g., "Gold", "Debt", "Real Estate", "Stock")
 * @param className - Optional extra className for styling
 * @param size - Optional icon size (default: 20)
 */
export const FundTypeIcon: React.FC<FundTypeIconProps> = ({
  fundType,
  className = "",
  size = 20,
}) => {
  // Always render inline and aligned with text unless user overrides
  // Use cn to combine default and custom className
  const baseClass = cn("inline align-text-top", className);
  switch (fundType?.toLowerCase()) {
    case "gold": {
      // If no className is provided, default to gold color, inline
      const goldClass = cn("inline align-text-top text-amber-500", className);
      return <Gem className={goldClass} size={size} />;
    }
    case "debt":
    case "fixed income":
    case "bond":
      return <Coins className={baseClass} size={size} />;
    case "real estate":
    case "reit":
      return <Home className={baseClass} size={size} />;
    case "stock":
    case "equity":
      return <LineChart className={baseClass} size={size} />;
    case "money market":
      return <PiggyBank className={baseClass} size={size} />;
    case "mixed":
      return <Landmark className={className} size={size} />;
    case "cash":
      return <Banknote className={baseClass} size={size} />;
    default:
      return <Landmark className={className} size={size} />;
  }
};

export default FundTypeIcon;
