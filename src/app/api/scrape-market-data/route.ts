import { NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const baseUrl = isDev
      ? "http://localhost:9002"
      : process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

    // Call exchange rate API
    const exchangeRateResponse = await fetch(
      `${baseUrl}/api/scrape-exchange-rate`,
    );
    const exchangeRateData = await exchangeRateResponse.json();

    if (!exchangeRateResponse.ok) {
      console.error("Failed to fetch exchange rates:", exchangeRateData);
      throw new Error("Failed to fetch exchange rates");
    }

    // Call gold prices API
    const goldPricesResponse = await fetch(`${baseUrl}/api/scrape-gold-prices`);
    const goldPricesData = await goldPricesResponse.json();

    if (!goldPricesResponse.ok) {
      console.error("Failed to fetch gold prices:", goldPricesData);
      throw new Error("Failed to fetch gold prices");
    }

    // Log successful execution
    console.log("Successfully updated market data");
    console.log("Exchange Rate Data:", exchangeRateData);
    console.log("Gold Prices Data:", goldPricesData);

    return NextResponse.json({
      success: true,
      message: "Market data updated successfully",
      exchangeRate: exchangeRateData,
      goldPrices: goldPricesData,
    });
  } catch (error) {
    console.error("Error in market data scraper:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update market data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
