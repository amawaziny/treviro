import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to identify gold-related funds
export function isGoldRelatedFund(fundType?: string): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const goldKeywords = ["gold", "precious metal", "gld", "bullion"]; // Add more keywords if needed
  return goldKeywords.some(keyword => lowerFundType.includes(keyword));
}

// Helper function to identify real estate-related funds (REITs)
export function isRealEstateRelatedFund(fundType?: string): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const realEstateKeywords = ["reit", "real estate", "property fund", "mortgage"]; // Add more keywords if needed
  return realEstateKeywords.some(keyword => lowerFundType.includes(keyword));
}

// Helper function to identify debt-related funds
export function isDebtRelatedFund(fundType?: string): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const debtKeywords = [
    "debt", 
    "bond", 
    "fixed income", 
    "money market", 
    "cash management", 
    "treasury",
    "certificate" // For funds that might invest in CDs
  ];
  return debtKeywords.some(keyword => lowerFundType.includes(keyword));
}

export function formatNumberWithSuffix(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}



// Helper function to identify stock-related funds
export function isStockRelatedFund(fundType?: string): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const stockKeywords = ["stock", "equity", "index", "growth", "value", "dividend"]; // Add more keywords as needed
  return stockKeywords.some(keyword => lowerFundType.includes(keyword));
}