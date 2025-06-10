"use server";

import { doc, getDoc } from "firebase/firestore";
import { ListedSecurity } from "@/lib/types";
import { db } from "@/lib/firebase";

export async function getListedSecurityById(
  id: string,
): Promise<ListedSecurity | null> {
  try {
    if (!id || !db) return null;

    const docRef = doc(db, "listedSecurities", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as ListedSecurity;
  } catch (error) {
    console.error("Error fetching listed security:", error);
    return null;
  }
}
