import { initializeApp } from 'firebase/app';
import { 
  Firestore, 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Get the project root directory
const projectRoot = process.cwd();

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Firebase types
import { FirebaseApp } from 'firebase/app';

let app: FirebaseApp;
let db: Firestore;

// Initialize Firebase
app = initializeApp(firebaseConfig);
db = getFirestore(app);

// Enable offline persistence (optional)
(async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Firebase offline persistence enabled');
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (error.code === 'unimplemented') {
      console.warn('⚠️ The current browser does not support offline persistence.');
    } else {
      console.warn('⚠️ Could not enable offline persistence:', error.message);
    }
  }
})();

// Start the upload process
uploadSecurities(db).catch(error => {
  console.error('❌ Error in upload process:', error);
  process.exit(1);
});

// Interface matching our JSON structure and ListedSecurity type
interface Security {
  id: string;
  isin: string;
  name: string;
  name_ar: string;
  symbol: string;
  logoUrl?: string;
  price: number;
  currency: string;
  changePercent: number;
  market: string;
  securityType?: string;
  fundType?: string;
  description?: string;
  sector?: string;
  sectorAr?: string;
  lastUpdated?: string;
  listingDate?: string;
  securityTypeAr?: string;
  listedShares?: number;
  tradedVolume?: number;
  tradedValue?: number;
  priceEarningRatio?: number;
  dividendYield?: number;
  cashDividends?: string | number;
  marketCap?: number;
  parValue?: number;
  currencyAr?: string;
  couponPaymentDate?: string;
  couponNo?: number | string;
}

// Helper function to wait for a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadSecurities(firestore: Firestore) {
  try {
    // Path to the JSON file - adjust the path to be relative to the project root
    const filePath = path.resolve(projectRoot, 'data/egx-securities-final.json');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}. Please make sure the file exists at the specified path.`);
    }
    
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const securities: Security[] = JSON.parse(fileContent);
    
    console.log(`Found ${securities.length} securities to process...`);
    
    // Reference to the Firestore collection
    const securitiesCollection = collection(db, 'listedStocks');
    
    // Counter for tracking progress
    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 25; // Process in batches to avoid rate limiting
    
    // Process securities in batches
    console.log(`Starting to process ${securities.length} securities...`);
    for (let i = 0; i < securities.length; i += BATCH_SIZE) {
      const batch = securities.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(securities.length / BATCH_SIZE)}...`);
      
      // Process each security in the current batch
      const batchPromises = batch.map(async (security) => {
        try {
          const docRef = doc(securitiesCollection, security.id);
          const docSnap = await getDoc(docRef);
          const exists = docSnap.exists();
          
          const securityData = {
            id: security.id,
            isin: security.isin,
            name: security.name,
            name_ar: security.name_ar,
            symbol: security.symbol,
            logoUrl: security.logoUrl || '',
            price: security.price,
            currency: security.currency,
            changePercent: security.changePercent || 0,
            market: security.market,
            securityType:
  security.securityType === 'Egyptian securities-Stocks' ? 'Stock' :
  security.securityType === 'ETF' || security.securityType === 'Egyptian securities-Funds' ? 'Fund' : undefined,
            fundType: security.fundType || '',
            description: security.description || '',
            sector: security.sector || '',
            sectorAr: security.sectorAr || '',
            lastUpdated: security.lastUpdated || new Date().toISOString(),
            listingDate: security.listingDate || '',
            securityTypeAr: security.securityTypeAr || '',
            listedShares: security.listedShares || 0,
            tradedVolume: security.tradedVolume || 0,
            tradedValue: security.tradedValue || 0,
            priceEarningRatio: security.priceEarningRatio || 0,
            dividendYield: security.dividendYield || 0,
            cashDividends: security.cashDividends || '',
            marketCap: security.marketCap || 0,
            parValue: security.parValue || 0,
            currencyAr: security.currencyAr || '',
            couponPaymentDate: security.couponPaymentDate || '',
            couponNo: security.couponNo || '',
            updatedAt: new Date().toISOString(),
          };
          
          // Use merge: true to update existing documents or create new ones
          await setDoc(docRef, securityData, { merge: true });
          console.log(`Processed ${security.id} - ${security.name}`);
          
          if (exists) {
            updateCount++;
            return { success: true, action: 'updated', id: security.id };
          } else {
            successCount++;
            return { success: true, action: 'created', id: security.id };
          }
        } catch (error) {
          console.error(`❌ Error processing ${security.id}:`, error);
          return { success: false, action: 'error', id: security.id, error };
        }
      });
      
      // Wait for all promises in the current batch to complete
      const results = await Promise.all(batchPromises);
      
      // Log batch results
      const batchResults = results.reduce((acc, result) => {
        acc[result.action] = (acc[result.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Batch results:', batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < securities.length) {
        await delay(1000); // 1 second delay between batches
      }
    }
    
    console.log(`\n📊 Upload Summary:`);
    console.log(`✅ Successfully created: ${successCount} securities`);
    console.log(`🔄 Updated: ${updateCount} securities`);
    if (errorCount > 0) {
      console.log(`❌ Failed to process: ${errorCount} securities`);
    }
    console.log(`\n🎉 Total processed: ${successCount + updateCount} out of ${securities.length} securities`);
    
  } catch (error) {
    console.error('Error reading file or initializing Firebase:', error);
    process.exit(1);
  } finally {
    // Close the Firebase connection
    process.exit(0);
  }
}

// Run the upload function
uploadSecurities();
