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
  limit,
  startAfter,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import axios from "axios";
import { LISTED_SECURITIES_COLLECTION } from "@/lib/constants";

const deletePriceHistory = async (stockId: string) => {
  const priceHistoryRef = collection(
    db,
    "listedSecurities",
    stockId,
    "priceHistory",
  );

  const snapshot = await getDocs(priceHistoryRef);

  if (snapshot.empty) {
    console.log("No price history to delete.");
    return;
  }

  const batch = writeBatch(db);

  snapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();

  console.log("Price history deleted successfully.");
};

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
    const now = new Date().toISOString();

    // 1. Read the list of securities from collection listedSecurities in firebase and filter by securityType=Stock
    let q = query(
      collection(db, LISTED_SECURITIES_COLLECTION),
      orderBy("id"),
      where("securityType", "in", ["Stock", "Index"]),
    );

    if (all && all.toLowerCase() !== "true") {
      const cursorSnapDocs = await getDocs(
        query(
          collection(db, LISTED_SECURITIES_COLLECTION),
          orderBy("id"),
          limit(searchOffset),
        ),
      );

      const cursor = cursorSnapDocs.docs[cursorSnapDocs.docs.length - 1];

      q = query(q, limit(searchLimit), orderBy("id"), startAfter(cursor));
    }

    const snapshot = await getDocs(q);
    const batchDocs = snapshot.docs;

    const updates: Array<Promise<any>> = [];
    for (const stockDoc of batchDocs) {
      const symbol = stockDoc.get("symbol");
      if (!symbol) continue;

      const code = symbol;
      const url = `https://scanner.tradingview.com/egypt/scan`;

      try {
        const payload = {
          symbols: { tickers: ["EGX:" + code.toUpperCase()] },
          columns: ["close", "open", "high", "low", "volume", "change"],
        };

        const res = await axios.post(url, payload, {
          headers: {
            contentType: "application/json",
            "User-Agent": "Mozilla/5.0",
          },
        });

        const data = res.data;

        if (!data.data || data.data.length === 0) {
          console.error("No price data", code);
          continue;
        }

        const row = data.data[0].d;

        console.log(`Parsing: ${code}, Response: ${row}, Price: ${row[0]}`);
        if (row.length !== 0) {
          // 4. Update listedSecurities collection in firebase and set price column
          updates.push(
            (async () => {
              // Update the price in listedSecurities
              await updateDoc(
                doc(db, LISTED_SECURITIES_COLLECTION, stockDoc.id),
                {
                  price: row[0],
                  changePercent: row[5],
                  high: row[2],
                  low: row[3],
                  volume: row[4],
                  updatedAt: now,
                  lastUpdated: now
                },
              );
            })(),
          );
          console.log(`Updated: ${code}`);
        } else {
          console.error("Price is NaN:", code, row);
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
