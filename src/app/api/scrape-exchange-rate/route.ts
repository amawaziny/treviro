import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import axios from "axios";
import * as cheerio from "cheerio";

// Mapping from currency name on Banque Misr site to code
const currencyNameToCode: Record<string, string> = {
  "US Dollar": "USD_EGP",
  EURO: "EUR_EGP",
  "Sterling Pound": "GBP_EGP",
  "UAE DIRHAM": "AED_EGP",
  "Australian Dollar": "AUD_EGP",
  "Bahrain Dinar": "BHD_EGP",
  "Canadian Dollar": "CAD_EGP",
  "Swiss Franc": "CHF_EGP",
  Yuan: "CNY_EGP",
  "Danish Krone": "DKK_EGP",
  "Jordanian Dinar": "JOD_EGP",
  "100 Japan Yen": "JPY_EGP",
  "Kuwait Dinar": "KWD_EGP",
  "Norway Krone": "NOK_EGP",
  "Oman Riyal": "OMR_EGP",
  "QATARI Riyal": "QAR_EGP",
  "Saudi Riyal": "SAR_EGP",
  "SWEDISH KRONA": "SEK_EGP",
  // Add more as needed
};

export async function GET(req: NextRequest) {
  try {
    const url =
      "https://www.banquemisr.com/en/Home/CAPITAL-MARKETS/Exchange-Rates-and-Currencies";
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const $ = cheerio.load(html);

    const rates: Record<string, number> = {};
    $("table tbody tr").each((_, el) => {
      const tds = $(el).find("td");
      const row: string[] = [];
      tds.toArray().forEach((td) => row.push($(td).text().trim()));
      // row[0]: Currency name, row[4]: Transfer Sell
      const currencyName = row[0].replace(/\s+/g, " ").trim();
      const transferSell = parseFloat(row[3]?.replace(/,/g, ""));
      const code = currencyNameToCode[currencyName];
      if (code && !isNaN(transferSell)) {
        rates[code] = transferSell;
      }
    });

    await setDoc(doc(db, "exchangeRates", "current"), {
      ...rates,
      lastUpdated: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, rates });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
