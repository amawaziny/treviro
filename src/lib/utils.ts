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
