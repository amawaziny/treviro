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
import {
  FINANCIAL_COLLECTIONS_PATH,
  FINANCIAL_COLLECTIONS,
} from "@/lib/constants";
import { formatPath } from "../utils";

type CollectionType =
  (typeof FINANCIAL_COLLECTIONS)[keyof typeof FINANCIAL_COLLECTIONS];

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
      formatPath(FINANCIAL_COLLECTIONS_PATH, {
        userId: this.userId,
        collectionName,
      }),
    ) as CollectionReference<T>;
  }

  // Generic helper to get document reference with user path
  private getDocRef(
    collectionName: CollectionType,
    id: string,
  ): DocumentReference<DocumentData> {
    if (!db) throw new Error("Firestore not initialized");
    return doc(
      db,
      formatPath(FINANCIAL_COLLECTIONS_PATH, {
        userId: this.userId,
        collectionName,
      }),
      id,
    );
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
        createdAt: now,
        updatedAt: now,
      } as T;

      await setDoc(
        this.getDocRef(collectionName, id),
        recordData as DocumentData,
      );

      // Publish appropriate event based on collection type
      if (collectionName === FINANCIAL_COLLECTIONS.INCOMES) {
        await eventBus.publish({
          type: "income:added",
          record: recordData as unknown as IncomeRecord,
        });
      } else if (collectionName === FINANCIAL_COLLECTIONS.EXPENSES) {
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
      if (collectionName === FINANCIAL_COLLECTIONS.INCOMES) {
        await eventBus.publish({
          type: "income:updated",
          record: updatedData as unknown as IncomeRecord,
        });
      } else if (collectionName === FINANCIAL_COLLECTIONS.EXPENSES) {
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
      if (collectionName === FINANCIAL_COLLECTIONS.INCOMES) {
        await eventBus.publish({
          type: "income:deleted",
          record: currentData as unknown as IncomeRecord,
        });
      } else if (collectionName === FINANCIAL_COLLECTIONS.EXPENSES) {
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
  async getIncomes(filters?: Partial<IncomeRecord>): Promise<IncomeRecord[]> {
    const records = await this.getRecords<IncomeRecord>(
      FINANCIAL_COLLECTIONS.INCOMES,
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

  async getIncomesWithin(start: string, end: string): Promise<IncomeRecord[]> {
    const q = query(
      this.getCollectionRef(FINANCIAL_COLLECTIONS.INCOMES),
      where("date", ">=", start),
      where("date", "<=", end),
    );
    const querySnapshot = await getDocs(q);

    const records = querySnapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date().toISOString(),
          updatedAt: doc.data().updatedAt || new Date().toISOString(),
        }) as IncomeRecord,
    );
    return records;
  }

  async addIncome(
    incomeData: Omit<IncomeRecord, "id" | "createdAt" | "updatedAt" | "userId">,
  ): Promise<IncomeRecord> {
    return this.addRecord(FINANCIAL_COLLECTIONS.INCOMES, incomeData);
  }

  async updateIncome(
    id: string,
    data: Partial<IncomeRecord>,
  ): Promise<IncomeRecord> {
    return this.updateRecord<IncomeRecord>(
      FINANCIAL_COLLECTIONS.INCOMES,
      id,
      data,
    );
  }

  async deleteIncome(id: string): Promise<void> {
    return this.deleteRecord(FINANCIAL_COLLECTIONS.INCOMES, id);
  }

  async findExpenseById(id: string): Promise<ExpenseRecord | null> {
    const records = await this.getExpenses({ id });
    return records[0] || null;
  }

  // Expense Records
  async getExpenses(
    filters?: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord[]> {
    const records = await this.getRecords<ExpenseRecord>(
      FINANCIAL_COLLECTIONS.EXPENSES,
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

  // Expense Records
  async getExpensesWithin(
    start: string,
    end: string,
  ): Promise<ExpenseRecord[]> {
    const q = query(
      this.getCollectionRef(FINANCIAL_COLLECTIONS.EXPENSES),
      where("date", ">=", start),
      where("date", "<=", end),
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date().toISOString(),
          updatedAt: doc.data().updatedAt || new Date().toISOString(),
        }) as ExpenseRecord,
    );
  }

  async addExpense(
    expenseData: Omit<
      ExpenseRecord,
      "id" | "createdAt" | "updatedAt" | "userId"
    >,
  ): Promise<ExpenseRecord> {
    return this.addRecord(FINANCIAL_COLLECTIONS.EXPENSES, expenseData);
  }

  async updateExpense(
    id: string,
    data: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord> {
    return this.updateRecord<ExpenseRecord>(
      FINANCIAL_COLLECTIONS.EXPENSES,
      id,
      data,
    );
  }

  async deleteExpense(id: string): Promise<void> {
    return this.deleteRecord(FINANCIAL_COLLECTIONS.EXPENSES, id);
  }

  // Fixed Estimates
  async getFixedEstimates(
    filters?: Partial<FixedEstimateRecord>,
  ): Promise<FixedEstimateRecord[]> {
    const records = await this.getRecords<FixedEstimateRecord>(
      FINANCIAL_COLLECTIONS.FIXED_ESTIMATES,
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

  async addFixedEstimate(
    fixedEstimateData: Omit<
      FixedEstimateRecord,
      "id" | "createdAt" | "updatedAt" | "userId"
    >,
  ): Promise<FixedEstimateRecord> {
    return this.addRecord(
      FINANCIAL_COLLECTIONS.FIXED_ESTIMATES,
      fixedEstimateData,
    );
  }
  async updateFixedEstimate(
    id: string,
    data: Partial<FixedEstimateRecord>,
  ): Promise<FixedEstimateRecord> {
    return this.updateRecord<FixedEstimateRecord>(
      FINANCIAL_COLLECTIONS.FIXED_ESTIMATES,
      id,
      data,
    );
  }

  async deleteFixedEstimate(id: string): Promise<void> {
    return this.deleteRecord(FINANCIAL_COLLECTIONS.FIXED_ESTIMATES, id);
  }
}
