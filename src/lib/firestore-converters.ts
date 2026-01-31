import { Timestamp } from "firebase/firestore";
import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

// Recursively convert Timestamp fields to Date
export function convertTimestampsToDates(obj: any): any {
  if (obj instanceof Timestamp) {
    return obj.toDate();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertTimestampsToDates);
  }
  if (obj && typeof obj === "object") {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestampsToDates(value);
    }
    return converted;
  }
  return obj;
}

// Recursively convert Date fields back to Timestamp (for writes)
export function convertDatesToTimestamps(obj: any): any {
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamps);
  }
  if (obj && typeof obj === "object") {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToTimestamps(value);
    }
    return converted;
  }
  return obj;
}

export const dateConverter: FirestoreDataConverter<DocumentData> = {
  toFirestore: (data: DocumentData) => {
    // Convert Date fields to Timestamp before writing
    return convertDatesToTimestamps(data);
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>) => {
    // Convert Timestamp fields to Date after reading
    const data = snapshot.data();
    return convertTimestampsToDates(data);
  },
};