import { db } from "@/lib/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import type { GoldMarketPrices, ListedSecurity } from "@/lib/types";
import {
  GOLD_MARKET_PRICES_PATH,
  LISTED_SECURITIES_COLLECTION,
  EXCHANGE_RATES_PATH,
} from "@/lib/constants";
import { dateConverter } from "@/lib/firestore-converters";

export class MasterDataService {
  private static instance: MasterDataService;

  private constructor() {}

  public static getInstance(): MasterDataService {
    if (!MasterDataService.instance) {
      MasterDataService.instance = new MasterDataService();
    }
    return MasterDataService.instance;
  }

  getExchangeRateRef() {
    return doc(db, EXCHANGE_RATES_PATH).withConverter(dateConverter);
  }

  getGoldMarketPricesRef() {
    return doc(db, GOLD_MARKET_PRICES_PATH).withConverter(dateConverter);
  }

  getSecurityCollectionRef() {
    return collection(db, LISTED_SECURITIES_COLLECTION).withConverter(dateConverter);
  }

  /**
   * Fetches current gold market prices
   */
  async getGoldMarketPrices(): Promise<GoldMarketPrices> {
    const pricesDocRef = this.getGoldMarketPricesRef();
    const pricesDocSnap = await getDoc(pricesDocRef);

    if (!pricesDocSnap.exists()) {
      throw new Error("Gold market prices not found");
    }

    return pricesDocSnap.data() as GoldMarketPrices;
  }

  /**
   * Fetches a specific security by ID
   * @param securityId The ID of the security to fetch
   */
  async getSecurity(securityId: string): Promise<ListedSecurity> {
    const securityDocRef = doc(this.getSecurityCollectionRef(), securityId);
    const securityDocSnap = await getDoc(securityDocRef);

    if (!securityDocSnap.exists()) {
      throw new Error(`Security with ID ${securityId} not found`);
    }

    return securityDocSnap.data() as ListedSecurity;
  }

  /**
   * Fetches exchange rate between two currencies
   * @param fromCurrency Source currency code (e.g., 'USD')
   * @param toCurrency Target currency code (e.g., 'EGP')
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const ratesDocRef = this.getExchangeRateRef();
    const ratesDocSnap = await getDoc(ratesDocRef);

    if (!ratesDocSnap.exists()) {
      throw new Error("Exchange rates not found");
    }

    const rateKey = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    const rates = ratesDocSnap.data();

    if (!rates || typeof rates[rateKey] !== "number") {
      throw new Error(`Exchange rate not found for ${rateKey}`);
    }

    return rates[rateKey] as number;
  }

  // Add more master data methods as needed
}

export const masterDataService = MasterDataService.getInstance();
