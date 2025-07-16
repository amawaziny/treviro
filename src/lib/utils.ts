import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { enUS } from "date-fns/locale/en-US";
import { InvestmentType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determines the investment type based on the fund type
 * @param fundType - The fund type to evaluate
 * @returns The corresponding investment type ("Gold" | "Real Estate" | "Debt" | "Stock" | "Other")
 */
export function getInvestmentType(fundType?: string): InvestmentType {
  if (!fundType) return "Stocks";

  if (isGoldRelatedFund(fundType)) return "Gold";
  if (isRealEstateRelatedFund(fundType)) return "Real Estate";
  if (isDebtRelatedFund(fundType)) return "Debt Instruments";
  if (isStockRelatedFund(fundType)) return "Stocks";

  return "Stocks";
}

// Helper function to identify gold-related funds
export function isGoldRelatedFund(fundType?: string | null): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const goldKeywords = ["gold", "precious metal", "gld", "bullion"]; // Add more keywords if needed
  return goldKeywords.some((keyword) => lowerFundType.includes(keyword));
}

// Helper function to identify real estate-related funds (REITs)
export function isRealEstateRelatedFund(fundType?: string | null): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const realEstateKeywords = [
    "reit",
    "real estate",
    "property fund",
    "mortgage",
  ]; // Add more keywords if needed
  return realEstateKeywords.some((keyword) => lowerFundType.includes(keyword));
}

// Helper function to identify debt-related funds
export function isDebtRelatedFund(fundType?: string | null): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const debtKeywords = [
    "debt",
    "bond",
    "fixed income",
    "money market",
    "mmf",
    "cash management",
    "treasury",
    "certificate", // For funds that might invest in CDs
  ];
  return debtKeywords.some((keyword) => lowerFundType.includes(keyword));
}
export function formatNumberForMobile(
  isMobile: boolean = false,
  num: number | undefined,
  currency: string = "EGP",
) {
  if (isMobile) {
    return formatCurrencyWithCommas(num, currency);
  }
  return formatCurrencyWithCommas(num, currency);
}
export function formatNumberWithSuffix(
  num: number | undefined,
  currency: string = "EGP",
): string {
  if (num === undefined || num === null || isNaN(num))
    return `${currency} 0.00`;
  const absNum = Math.abs(num);
  let suffix = "";
  let value = absNum;

  if (absNum >= 1000000) {
    value = absNum / 1000000;
    suffix = "M";
  } else if (absNum >= 1000) {
    value = absNum / 1000;
    suffix = "K";
  }

  let formatted = value.toFixed(3).replace(/\.0$/, "");
  if (suffix) formatted += suffix;

  return `${currency} ${num < 0 ? "-" : ""}${formatted}`;
}

/**
 * Formats a date as 'Month YYYY' (e.g., 'June 2025').
 * Accepts either a Date object or a date string.
 */
export function formatMonthYear(
  date: Date | string,
  language: string = "en",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return format(d, "MMMM yyyy", { locale: language == "ar" ? ar : enUS });
}

export const formatDateDisplay = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    // Handle potential "Invalid Date" if dateString is not a valid ISO format
    // Firestore serverTimestamp might initially be null before server populates it,
    // or client-set dates could be in various formats.
    // For robustness, ensure it's a valid date.
    if (isNaN(date.getTime())) return dateString; // Or 'Invalid Date'
    return format(date, "dd-MM-yyyy");
  } catch (e) {
    return dateString; // Or 'Error formatting date'
  }
};

export const formatDateTimeDisplay = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    // Handle potential "Invalid Date" if dateString is not a valid ISO format
    // Firestore serverTimestamp might initially be null before server populates it,
    // or client-set dates could be in various formats.
    // For robustness, ensure it's a valid date.
    if (isNaN(date.getTime())) return dateString; // Or 'Invalid Date'
    return format(date, "dd-MM-yyyy hh:mm:ss a");
  } catch (e) {
    return dateString; // Or 'Error formatting date'
  }
};

export const getCurrentDate = () => {
  return format(new Date(), "yyyy-MM-dd");
};
// Checks if a given date is in the current month
export function isInCurrentMonth(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

/**
 * Format a number with commas, 3 decimal places, and currency (EGP by default).
 * Example: 1234567.8912 => "1,234,567.891 EGP"
 */
export function formatCurrencyWithCommas(
  value: number | string | undefined,
  currency: string = "EGP",
  digitsOverride?: number,
): string {
  if (value === undefined || value === null || Number.isNaN(value))
    return `${currency} 0`;
  const num = typeof value === "number" ? value : parseFloat(value);
  // toFixed(3) ensures 3 digits after decimal
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: digitsOverride ?? 0,
    maximumFractionDigits: digitsOverride ?? 3,
  }).format(num);
}

// Helper function to identify stock-related funds
export function isStockRelatedFund(fundType?: string | null): boolean {
  if (!fundType) return false;
  const lowerFundType = fundType.toLowerCase();
  const stockKeywords = [
    "stock",
    "equity",
    "index",
    "growth",
    "value",
    "dividend",
  ]; // Add more keywords as needed
  return stockKeywords.some((keyword) => lowerFundType.includes(keyword));
}

export const parseDateString = (dateStr?: string): Date | null => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  return new Date(year, month - 1, day);
};
