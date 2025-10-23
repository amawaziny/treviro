import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoldMarketPrices } from "@/lib/types";

async function fetchAndParsePrices(
  url: string,
  unit: "gram" | "ounce",
): Promise<Partial<GoldMarketPrices>> {
  console.log(`Fetching ${unit} prices from:`, url);
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const prices: Partial<GoldMarketPrices> = {};
  const $ = cheerio.load(html);
  const content = $("body").text();
  const priceRegex =
    /gold\s+(Gram|Ounce)\s+(\d+)K\s+in\s+Egypt\s+is\s+([\d,]+\.[\d]+)/gi;

  let match;
  while ((match = priceRegex.exec(content)) !== null) {
    const matchUnit = match[1].toLowerCase();
    const karat = match[2];
    const price = parseFloat(match[3].replace(/,/g, ""));

    // Only process if the unit matches what we're looking for
    if (matchUnit !== unit) continue;

    if (!isNaN(price)) {
      const priceKey = (
        unit === "gram" ? `K${karat}` : `OunceK${karat}`
      ) as keyof GoldMarketPrices;
      (prices as Record<string, number>)[priceKey] = price;
    }
  }

  return prices;
}

export async function GET(req: NextRequest) {
  try {
    const goldPrices: GoldMarketPrices = { source: "goldrate24.com" };

    // Fetch gram prices
    const gramPrices = await fetchAndParsePrices(
      "https://www.goldrate24.com/gold-prices/middle-east/egypt/gram/",
      "gram",
    );
    Object.assign(goldPrices, gramPrices);

    // Calculate gold pound price (8g of 21K gold) if we have the 21K gram price
    if (goldPrices.K21) {
      goldPrices.Pound = goldPrices.K21 * 8;
    }

    // Fetch ounce prices
    const ouncePrices = await fetchAndParsePrices(
      "https://www.goldrate24.com/gold-prices/middle-east/egypt/ounce/",
      "ounce",
    );
    Object.assign(goldPrices, ouncePrices);

    // Extract the last updated time
    const lastUpdated = new Date().toISOString();

    console.log("Extracted gold prices:", goldPrices);

    // Prepare data with only defined fields
    const goldMarketData: Partial<GoldMarketPrices> = {
      lastUpdated,
      source: "goldrate24.com",
    };

    // Only add defined values to the document
    const priceFields: (keyof GoldMarketPrices)[] = [
      // Gram prices
      "K24",
      "K22",
      "K21",
      "K18",
      "K14",
      "K12",
      "K10",
      "K9",
      "K8",
      "Pound",
      // Ounce prices
      "Ounce",
      "OunceK22",
      "OunceK21",
      "OunceK18",
      "OunceK14",
      "OunceK12",
      "OunceK10",
      "OunceK9",
      "OunceK8",
    ];

    priceFields.forEach((field) => {
      const value = goldPrices[field];
      if (value !== undefined) {
        goldMarketData[field] = value;
      }
    });

    // Log the data we're about to save
    console.log("Saving to Firestore:", goldMarketData);

    // Save to Firestore
    try {
      await setDoc(doc(db, "goldMarketPrices", "current"), goldMarketData, {
        merge: true,
      });
      console.log("Successfully updated gold prices in Firestore");
    } catch (firestoreError) {
      console.error("Firestore error:", firestoreError);
      throw firestoreError;
    }

    return NextResponse.json({
      success: true,
      lastUpdated,
    });
  } catch (error) {
    console.error("Error scraping gold prices:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gold prices",
      },
      { status: 500 },
    );
  }
}
