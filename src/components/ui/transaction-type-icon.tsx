import React from "react";
import {
  Gem,
  Coins,
  Home,
  LineChart,
  Landmark,
  PiggyBank,
  Banknote,
  ScrollText,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/lib/types";

interface TransactionTypeIconProps {
  transactionType?: TransactionType;
  className?: string;
  size?: number;
}

/**
 * Renders an icon representing the transaction type using lucide-react icons.
 * @param TransactionType - The type of transaction (e.g., "Buy", "Payment", "Sell", "Dividend")
 * @param className - Optional extra className for styling
 * @param size - Optional icon size (default: 20)
 */
export const TransactionTypeIcon: React.FC<TransactionTypeIconProps> = ({
  transactionType,
  className = "",
  size = 20,
}) => {
  // Always render inline and aligned with text unless user overrides
  // Use cn to combine default and custom className
  const baseClass = cn("inline align-text-top", className);
  switch (transactionType?.toUpperCase()) {
    case "INCOME":
      return <PiggyBank className={baseClass} size={size} />;
    case "INTEREST":
    case "MATURED_DEBT":
      return <ScrollText className={baseClass} size={size} />;
    case "SELL":
    case "BUY":
      return <LineChart className={baseClass} size={size} />;
    case "DIVIDEND":
      return <Coins className={baseClass} size={size} />;
    case "PAYMENT":
      return <DollarSign className={className} size={size} />;
    case "EXPENSE":
      return <Banknote className={baseClass} size={size} />;
    default:
      return <Landmark className={className} size={size} />;
  }
};

export default TransactionTypeIcon;
