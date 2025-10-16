import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  getDoc,
  DocumentData,
  DocumentReference,
  orderBy,
  CollectionReference,
} from "firebase/firestore";
import { eventBus } from "./events";
import { v4 as uuidv4 } from "uuid";
import type {
  BaseRecord,
  IncomeRecord,
  ExpenseRecord,
  FixedEstimateRecord,
} from "@/lib/types";

// Collection names as const for type safety
const COLLECTIONS = {
  INCOMES: "incomes" as const,
  EXPENSES: "expenses" as const,
  FIXED_ESTIMATES: "fixedEstimates" as const,
} as const;

type CollectionType = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export class FinancialRecordsService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Generic helper to get collection reference with user path
  private getCollectionRef<T extends DocumentData>(
    collectionName: CollectionType,
  ): CollectionReference<T> {
    if (!db) throw new Error("Firestore not initialized");
    return collection(
      db,
      `users/${this.userId}/${collectionName}`,
    ) as CollectionReference<T>;
  }

  // Generic helper to get document reference with user path
  private getDocRef(
    collectionName: CollectionType,
    id: string,
  ): DocumentReference<DocumentData> {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `users/${this.userId}/${collectionName}`, id);
  }

  // Generic CRUD operations
  private async addRecord<T extends BaseRecord>(
    collectionName: CollectionType,
    data: Omit<T, "id" | "createdAt" | "updatedAt" | "userId">,
  ): Promise<T> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const recordData = {
        ...data,
        id,
        userId: this.userId,
        createdAt: now,
        updatedAt: now,
      } as T;

      await setDoc(
        this.getDocRef(collectionName, id),
        recordData as DocumentData,
      );

      // Publish appropriate event based on collection type
      if (collectionName === COLLECTIONS.INCOMES) {
        await eventBus.publish({
          type: "income:added",
          record: recordData as unknown as IncomeRecord,
        });
      } else if (collectionName === COLLECTIONS.EXPENSES) {
        await eventBus.publish({
          type: "expense:added",
          record: recordData as unknown as ExpenseRecord,
        });
      }

      return recordData;
    } catch (error) {
      console.error(`Error adding ${collectionName} record:`, error);
      throw error;
    }
  }

  private async updateRecord<T extends BaseRecord>(
    collectionName: CollectionType,
    id: string,
    data: Partial<Omit<T, "id" | "createdAt" | "updatedAt" | "userId">>,
  ): Promise<T> {
    try {
      const docRef = this.getDocRef(collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`${collectionName} record not found`);
      }
      const currentData = docSnap.data() as T;
      const updatedData = {
        ...currentData,
        ...data,
        updatedAt: new Date().toISOString(),
      } as T;

      await updateDoc(docRef, updatedData as DocumentData);

      // Publish appropriate event based on collection type
      if (collectionName === COLLECTIONS.INCOMES) {
        await eventBus.publish({
          type: "income:updated",
          record: updatedData as unknown as IncomeRecord,
        });
      } else if (collectionName === COLLECTIONS.EXPENSES) {
        await eventBus.publish({
          type: "expense:updated",
          record: updatedData as unknown as ExpenseRecord,
        });
      }

      return updatedData;
    } catch (error) {
      console.error(`Error updating ${collectionName} record:`, error);
      throw error;
    }
  }

  private async deleteRecord(
    collectionName: CollectionType,
    id: string,
  ): Promise<void> {
    try {
      const docRef = this.getDocRef(collectionName, id);

      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`${collectionName} record not found`);
      }
      const currentData = docSnap.data();

      await deleteDoc(docRef);

      // Publish appropriate event based on collection type
      if (collectionName === COLLECTIONS.INCOMES) {
        await eventBus.publish({
          type: "income:deleted",
          record: currentData as unknown as IncomeRecord,
        });
      } else if (collectionName === COLLECTIONS.EXPENSES) {
        await eventBus.publish({
          type: "expense:deleted",
          record: currentData as unknown as ExpenseRecord,
        });
      }
    } catch (error) {
      console.error(`Error deleting ${collectionName} record:`, error);
      throw error;
    }
  }

  private async getRecords<T extends BaseRecord>(
    collectionName: CollectionType,
    filters?: Partial<T>,
  ): Promise<T[]> {
    try {
      let q = query(
        this.getCollectionRef(collectionName),
        orderBy("date", "desc"),
      );

      // Apply additional filters if provided
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            q = query(q, where(key, "==", value));
          }
        });
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as T,
      );
    } catch (error) {
      console.error(`Error getting ${collectionName} records:`, error);
      throw error;
    }
  }

  // Income Records
  async getIncomeRecords(
    filters?: Partial<IncomeRecord>,
  ): Promise<IncomeRecord[]> {
    const records = await this.getRecords<IncomeRecord>(
      COLLECTIONS.INCOMES,
      filters,
    );
    return records.map(
      (record) =>
        ({
          ...record,
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: record.updatedAt || new Date().toISOString(),
        }) as IncomeRecord,
    );
  }

  async addIncomeRecord(
    incomeData: Omit<IncomeRecord, "id" | "createdAt" | "updatedAt" | "userId">,
  ): Promise<IncomeRecord> {
    return this.addRecord(COLLECTIONS.INCOMES, incomeData);
  }

  async updateIncomeRecord(
    id: string,
    data: Partial<IncomeRecord>,
  ): Promise<IncomeRecord> {
    return this.updateRecord<IncomeRecord>(COLLECTIONS.INCOMES, id, data);
  }

  async deleteIncomeRecord(id: string): Promise<void> {
    return this.deleteRecord(COLLECTIONS.INCOMES, id);
  }

  // Expense Records
  async getExpenseRecords(
    filters?: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord[]> {
    const records = await this.getRecords<ExpenseRecord>(
      COLLECTIONS.EXPENSES,
      filters,
    );
    return records.map(
      (record) =>
        ({
          ...record,
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: record.updatedAt || new Date().toISOString(),
        }) as ExpenseRecord,
    );
  }

  async addExpenseRecord(
    expenseData: Omit<
      ExpenseRecord,
      "id" | "createdAt" | "updatedAt" | "userId"
    >,
  ): Promise<ExpenseRecord> {
    return this.addRecord(COLLECTIONS.EXPENSES, expenseData);
  }

  async updateExpenseRecord(
    id: string,
    data: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord> {
    return this.updateRecord<ExpenseRecord>(COLLECTIONS.EXPENSES, id, data);
  }

  async deleteExpenseRecord(id: string): Promise<void> {
    return this.deleteRecord(COLLECTIONS.EXPENSES, id);
  }

  // Fixed Estimates
  async getFixedEstimates(
    filters?: Partial<FixedEstimateRecord>,
  ): Promise<FixedEstimateRecord[]> {
    const records = await this.getRecords<FixedEstimateRecord>(
      COLLECTIONS.FIXED_ESTIMATES,
      filters,
    );
    return records.map(
      (record) =>
        ({
          ...record,
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: record.updatedAt || new Date().toISOString(),
        }) as FixedEstimateRecord,
    );
  }

  async addFixedEstimateRecord(
    fixedEstimateData: Omit<
      FixedEstimateRecord,
      "id" | "createdAt" | "updatedAt" | "userId"
    >,
  ): Promise<FixedEstimateRecord> {
    return this.addRecord(COLLECTIONS.FIXED_ESTIMATES, fixedEstimateData);
  }
  async updateFixedEstimate(
    id: string,
    data: Partial<FixedEstimateRecord>,
  ): Promise<FixedEstimateRecord> {
    return this.updateRecord<FixedEstimateRecord>(
      COLLECTIONS.FIXED_ESTIMATES,
      id,
      data,
    );
  }

  async deleteFixedEstimate(id: string): Promise<void> {
    return this.deleteRecord(COLLECTIONS.FIXED_ESTIMATES, id);
  }
}
