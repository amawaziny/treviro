import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import axios from "axios";
import * as cheerio from "cheerio";

interface GoldPrices {
  // Gram prices
  pricePerGramK24?: number;
  pricePerGramK21?: number;
  pricePerGramK22?: number;
  pricePerGramK18?: number;
  pricePerGramK14?: number;
  pricePerGramK12?: number;
  pricePerGramK10?: number;
  pricePerGramK9?: number;
  pricePerGramK8?: number;
  pricePerGoldPound?: number;
  
  // Ounce prices
  pricePerOunceK24?: number;
  pricePerOunceK21?: number;
  pricePerOunceK22?: number;
  pricePerOunceK18?: number;
  pricePerOunceK14?: number;
  pricePerOunceK12?: number;
  pricePerOunceK10?: number;
  pricePerOunceK9?: number;
  pricePerOunceK8?: number;
  
  [key: string]: number | undefined;
}

async function fetchAndParsePrices(url: string, unit: 'gram' | 'ounce'): Promise<Partial<GoldPrices>> {
  console.log(`Fetching ${unit} prices from:`, url);
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  
  const prices: Partial<GoldPrices> = {};
  const $ = cheerio.load(html);
  const content = $('body').text();
  const priceRegex = /gold\s+(Gram|Ounce)\s+(\d+)K\s+in\s+Egypt\s+is\s+([\d,]+\.[\d]+)/gi;
  
  let match;
  while ((match = priceRegex.exec(content)) !== null) {
    const matchUnit = match[1].toLowerCase();
    const karat = match[2];
    const price = parseFloat(match[3].replace(/,/g, ''));
    
    // Only process if the unit matches what we're looking for
    if (matchUnit !== unit) continue;
    
    if (!isNaN(price)) {
      const priceKey = `pricePer${unit.charAt(0).toUpperCase() + unit.slice(1)}K${karat}` as keyof GoldPrices;
      prices[priceKey] = price;
    }
  }
  
  return prices;
}

export async function GET(req: NextRequest) {
  try {
    const goldPrices: GoldPrices = {};
    
    // Fetch gram prices
    const gramPrices = await fetchAndParsePrices(
      "https://www.goldrate24.com/gold-prices/middle-east/egypt/gram/",
      "gram"
    );
    Object.assign(goldPrices, gramPrices);
    
    // Calculate gold pound price (8g of 21K gold) if we have the 21K gram price
    if (goldPrices.pricePerGramK21) {
      goldPrices.pricePerGoldPound = goldPrices.pricePerGramK21 * 8;
    }
    
    // Fetch ounce prices
    const ouncePrices = await fetchAndParsePrices(
      "https://www.goldrate24.com/gold-prices/middle-east/egypt/ounce/",
      "ounce"
    );
    Object.assign(goldPrices, ouncePrices);
    
    // Extract the last updated time
    const lastUpdated = new Date().toISOString();
    
    console.log('Extracted gold prices:', goldPrices);

    // Prepare data with only defined fields
    const goldMarketData: Record<string, unknown> = {
      lastUpdated,
      source: 'goldrate24.com',
    };
    
    // Only add defined values to the document
    const priceFields = [
      // Gram prices
      'pricePerGramK24', 'pricePerGramK21', 'pricePerGramK22', 'pricePerGramK18',
      'pricePerGramK14', 'pricePerGramK12', 'pricePerGramK10', 'pricePerGramK9',
      'pricePerGramK8', 'pricePerGoldPound',
      
      // Ounce prices
      'pricePerOunceK24', 'pricePerOunceK21', 'pricePerOunceK22', 'pricePerOunceK18',
      'pricePerOunceK14', 'pricePerOunceK12', 'pricePerOunceK10', 'pricePerOunceK9',
      'pricePerOunceK8'
    ] as const;
    
    priceFields.forEach((field) => {
      const value = goldPrices[field];
      if (value !== undefined) {
        goldMarketData[field] = value;
      }
    });
    
    // Log the data we're about to save
    console.log('Saving to Firestore:', goldMarketData);
    
    // Save to Firestore
    try {
      await setDoc(doc(db, "goldMarketPrices", "current"), goldMarketData, { merge: true });
      console.log('Successfully updated gold prices in Firestore');
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      throw firestoreError;
    }

    return NextResponse.json({ 
      success: true, 
      lastUpdated,
    });
  } catch (error) {
    console.error('Error scraping gold prices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch gold prices' },
      { status: 500 },
    );
  }
}
