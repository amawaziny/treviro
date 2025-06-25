// Offline Investment Storage Utility for Listing
import { InvestmentFormValues } from "./schemas";
import { openDB, STORE_NAME } from "./offline-db";

export async function getAllOfflineInvestments(): Promise<
  (InvestmentFormValues & { id: string })[]
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
