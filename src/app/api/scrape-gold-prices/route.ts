import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import axios from "axios";
import * as cheerio from "cheerio";

interface GoldPrices {
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
  [key: string]: number | undefined;
}

export async function GET(req: NextRequest) {
  try {
    const url = "https://www.goldrate24.com/gold-prices/middle-east/egypt/gram/";
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    
    const goldPrices: GoldPrices = {};
    
    // Extract the last updated time
    const lastUpdated = new Date().toISOString();
    
    // Parse HTML content with cheerio
    const $ = cheerio.load(html);
    
    // Extract gold prices from the text content
    const content = $('body').text();
    const priceRegex = /gold\s+Gram\s+(\d+)K\s+in\s+Egypt\s+is\s+([\d,]+\.[\d]+)/gi;
    const matches = [...content.matchAll(priceRegex)];
    
    for (const match of matches) {
      const karat = match[1];
      const price = parseFloat(match[2].replace(/,/g, ''));
      
      if (!isNaN(price)) {
        switch (karat) {
          case '24':
            goldPrices.pricePerGramK24 = price;
            break;
          case '21':
            goldPrices.pricePerGramK21 = price;
            break;
          case '22':
            goldPrices.pricePerGramK22 = price;
            break;
          case '18':
            goldPrices.pricePerGramK18 = price;
            break;
          case '14':
            goldPrices.pricePerGramK14 = price;
            break;
          case '12':
            goldPrices.pricePerGramK12 = price;
            break;
          case '10':
            goldPrices.pricePerGramK10 = price;
            break;
          case '9':
            goldPrices.pricePerGramK9 = price;
            break;
          case '8':
            goldPrices.pricePerGramK8 = price;
            break;
        }
      }
    }
    
    // Calculate gold pound price (8g of 21K gold)
    if (goldPrices.pricePerGramK21) {
      goldPrices.pricePerGoldPound = goldPrices.pricePerGramK21 * 8;
    }
    
    console.log('Extracted gold prices:', goldPrices);

    // Prepare data with only defined fields
    const goldMarketData: Record<string, unknown> = {
      lastUpdated,
      source: url,
    };
    
    // Only add defined values to the document
    const priceFields = [
      'pricePerGramK24', 'pricePerGramK21', 'pricePerGramK22', 'pricePerGramK18',
      'pricePerGramK14', 'pricePerGramK12', 'pricePerGramK10', 'pricePerGramK9',
      'pricePerGramK8', 'pricePerGoldPound'
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
