import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import axios from "axios";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  try {
    // Vacation check: skip if today is a vacation
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const vacationDocRef = doc(db, "vacations", today);
    const vacationDocSnap = await getDoc(vacationDocRef);
    if (vacationDocSnap.exists()) {
      return NextResponse.json({
        success: false,
        message: `Today (${today}) is a vacation. Skipping stock scraping.`,
      });
    }
    // Parse offset, limit, and all from query parameters
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");
    const searchOffset = parseInt(searchParams.get("offset") || "0", 10);
    const searchLimit = parseInt(searchParams.get("limit") || "20", 10);

    // 1. Read the list of securities from collection listedSecurities in firebase and filter by securityType=Stock
    const q = query(
      collection(db, "listedSecurities"),
      where("securityType", "==", "Stock"),
    );
    const snapshot = await getDocs(q);
    // If 'all' is set, process all stocks, otherwise only the batch
    const batchDocs =
      all && all.toLowerCase() === "true"
        ? snapshot.docs
        : snapshot.docs.slice(searchOffset, searchOffset + searchLimit);
    const updates: Array<Promise<any>> = [];
    for (const stockDoc of batchDocs) {
      const symbol = stockDoc.get("symbol");
      if (!symbol) continue;
      // 2. Concat :EC to symbol
      const code = `${symbol}:EC`;
      // 3. Fetch and parse price
      const url = `https://www.asharqbusiness.com/stocks/security/${code}`;
      try {
        const { data: content } = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const $ = cheerio.load(content);
        const priceText = $(".leading-48").first().text();
        const price = parseFloat(priceText.replace(/[^\d.\-]/g, ""));
        console.log(`Parsing: ${code}, Price: ${price}`);
        if (!isNaN(price)) {
          // 4. Update listedSecurities collection in firebase and set price column
          updates.push(
            (async () => {
              // Update the price in listedSecurities
              await updateDoc(
                doc(db, "listedSecurities", stockDoc.id),
                {
                  price,
                },
              );
              // Also update priceHistory subcollection
              const today = new Date().toISOString();

              // Check if today's priceHistory record exists and price is the same
              const todayDocRef = doc(
                db,
                "listedSecurities",
                stockDoc.id,
                "priceHistory",
                today,
              );
              const todayDocSnap = await getDoc(todayDocRef);
              if (
                todayDocSnap.exists() &&
                todayDocSnap.get("price") === price
              ) {
                // Price for today is already recorded and unchanged, do nothing
                return;
              }

              await setDoc(
                doc(
                  db,
                  "listedSecurities",
                  stockDoc.id,
                  "priceHistory",
                  today,
                ),
                { price },
                { merge: true },
              );
              // Fetch two most recent priceHistory docs
              const priceHistRef = collection(
                db,
                "listedSecurities",
                stockDoc.id,
                "priceHistory",
              );
              const priceHistQuery = query(
                priceHistRef,
                orderBy("__name__", "desc"),
                limit(2),
              );
              const histSnap = await getDocs(priceHistQuery);
              const prices: number[] = [];
              histSnap.forEach((doc) => {
                const p = doc.get("price");
                if (typeof p === "number") prices.push(p);
              });
              let changePercent = 0;
              if (prices.length === 2 && prices[1] !== 0) {
                changePercent = ((prices[0] - prices[1]) / prices[1]) * 100;
              }
              await updateDoc(
                doc(db, "listedSecurities", stockDoc.id),
                {
                  changePercent,
                },
              );
            })(),
          );
          console.log(`Updated: ${code}`);
        } else {
          console.error("Price is NaN:", code, price);
        }
      } catch (err) {
        // Log and skip this stock on error
        console.error(`Error fetching/parsing for ${code}:`, err);
      }
    }
    await Promise.all(updates);
    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

// ---
// Firestore Collection: vacations
// Each document in 'vacations' has the document ID as the date (YYYY-MM-DD) and can have fields like:
//   - reason: string (optional, e.g. 'Public holiday')
// Example: vacations/2024-05-17 { reason: 'Eid al-Fitr' }
