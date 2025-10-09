import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { AppSettings } from "@/lib/types";

export class AppSettingsService {
  private userId: string;
  private readonly SETTINGS_DOC = 'appSettings';

  constructor(userId: string) {
    this.userId = userId;
  }

  private getSettingsDocRef() {
    return doc(db, `users/${this.userId}/settings/${this.SETTINGS_DOC}`);
  }

  /**
   * Fetches the user's app settings from Firestore
   * @returns AppSettings object or null if not found
   */
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const docRef = this.getSettingsDocRef();
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting app settings:', error);
      throw new Error('Failed to fetch app settings');
    }
  }

  /**
   * Updates the user's app settings in Firestore
   * @param settings Partial settings to update
   * @returns The updated settings
   */
  async updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const docRef = this.getSettingsDocRef();
      const currentSettings = await this.getAppSettings();
      
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(docRef, updatedSettings, { merge: true });
      
      return updatedSettings as AppSettings;
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw new Error('Failed to update app settings');
    }
  }

  /**
   * Initializes default settings for a new user
   * @returns The default settings
   */
  async initializeDefaultSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      financialYearStartMonth: 1, // January
      investmentTypePercentages: {
        "Real Estate": 30,
        Securities: 25,
        Stocks: 25,
        "Debt Instruments": 20,
        Currencies: 10,
        Gold: 15,
      },
    };

    const docRef = this.getSettingsDocRef();
    await setDoc(docRef, defaultSettings);
    
    return defaultSettings;
  }
}
