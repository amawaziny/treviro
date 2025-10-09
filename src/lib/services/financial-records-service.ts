import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  getDoc
} from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import type { 
  IncomeType,
  ExpenseCategory,
  FixedEstimateType,
  FixedEstimatePeriod
} from "@/lib/types";

const COLLECTIONS = {
  INCOME: 'incomeRecords',
  EXPENSES: 'expenseRecords',
  FIXED_ESTIMATES: 'fixedEstimates'
} as const;

type CollectionType = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// Base interface that enforces common fields across all record types
interface BaseRecord {
  id: string;
  userId: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

// Extend the record interfaces to include BaseRecord

export interface IncomeRecord extends BaseRecord {
  type: IncomeType;
  source?: string;
  isRecurring?: boolean;
  recurrencePeriod?: string;
}

export interface ExpenseRecord extends BaseRecord {
  category: ExpenseCategory;
  isInstallment?: boolean;
  numberOfInstallments?: number;
  _originalAmount?: number;
  _requiredAmount?: number;
  installmentMonthIndex?: number;
}

export interface FixedEstimateRecord extends BaseRecord {
  type: FixedEstimateType;
  name?: string;
  period: FixedEstimatePeriod;
  isExpense: boolean;
}


export type FinancialRecord = IncomeRecord | ExpenseRecord | FixedEstimateRecord;

export class FinancialRecordsService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Generic helper to get collection reference with user path
  private getCollectionRef(collectionName: CollectionType) {
    return collection(db, `users/${this.userId}/${collectionName}`);
  }

  // Generic helper to get document reference with user path
  private getDocRef(collectionName: CollectionType, id: string) {
    return doc(db, `users/${this.userId}/${collectionName}`, id);
  }

  // Generic CRUD operations
  private async addRecord<T extends BaseRecord>(
    collectionName: CollectionType,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
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
      } as unknown as T;

      await setDoc(this.getDocRef(collectionName, id), recordData);
      return recordData;
    } catch (error) {
      console.error(`Error adding ${collectionName} record:`, error);
      throw error;
    }
  }

  private async updateRecord<T extends BaseRecord>(
    collectionName: CollectionType,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
  ): Promise<T> {
    try {
      const docRef = this.getDocRef(collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`${collectionName} record not found`);
      }

      const updatedData = {
        ...docSnap.data(),
        ...data,
        updatedAt: new Date().toISOString(),
      } as unknown as T;

      await setDoc(docRef, updatedData, { merge: true });
      return updatedData;
    } catch (error) {
      console.error(`Error updating ${collectionName} record:`, error);
      throw error;
    }
  }

  private async deleteRecord(collectionName: CollectionType, id: string): Promise<void> {
    try {
      await deleteDoc(this.getDocRef(collectionName, id));
    } catch (error) {
      console.error(`Error deleting ${collectionName} record:`, error);
      throw error;
    }
  }

  private async getRecords<T extends BaseRecord>(
    collectionName: CollectionType,
    filters?: Record<string, any>
  ): Promise<T[]> {
    try {
      let q = query(
        this.getCollectionRef(collectionName),
        orderBy('date', 'desc')
      );

      // Apply additional filters if provided
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            q = query(q, where(key, '==', value));
          }
        });
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Error getting ${collectionName} records:`, error);
      throw error;
    }
  }

  // Income Records
  async getIncomeRecords(filters?: Partial<IncomeRecord>): Promise<IncomeRecord[]> {
    const records = await this.getRecords<IncomeRecord>(COLLECTIONS.INCOME, filters);
    return records.map(record => ({
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt
    }));
  }

  async addIncomeRecord(data: Omit<IncomeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeRecord> {
    return this.addRecord<IncomeRecord>(COLLECTIONS.INCOME, data);
  }

  async updateIncomeRecord(id: string, data: Partial<IncomeRecord>): Promise<IncomeRecord> {
    return this.updateRecord<IncomeRecord>(COLLECTIONS.INCOME, id, data);
  }

  async deleteIncomeRecord(id: string): Promise<void> {
    return this.deleteRecord(COLLECTIONS.INCOME, id);
  }

  // Expense Records
  async getExpenseRecords(filters?: Partial<ExpenseRecord>): Promise<ExpenseRecord[]> {
    const records = await this.getRecords<ExpenseRecord>(COLLECTIONS.EXPENSES, filters);
    return records.map(record => ({
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt
    }));
  }

  async addExpenseRecord(data: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseRecord> {
    return this.addRecord<ExpenseRecord>(COLLECTIONS.EXPENSES, data);
  }

  async updateExpenseRecord(id: string, data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    return this.updateRecord<ExpenseRecord>(COLLECTIONS.EXPENSES, id, data);
  }

  async deleteExpenseRecord(id: string): Promise<void> {
    return this.deleteRecord(COLLECTIONS.EXPENSES, id);
  }

  // Fixed Estimate Records
  async getFixedEstimates(filters?: Partial<FixedEstimateRecord>): Promise<FixedEstimateRecord[]> {
    const records = await this.getRecords<FixedEstimateRecord>(COLLECTIONS.FIXED_ESTIMATES, filters);
    return records.map(record => ({
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt
    }));
  }

  async addFixedEstimate(data: Omit<FixedEstimateRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<FixedEstimateRecord> {
    return this.addRecord<FixedEstimateRecord>(COLLECTIONS.FIXED_ESTIMATES, data);
  }

  async updateFixedEstimate(id: string, data: Partial<FixedEstimateRecord>): Promise<FixedEstimateRecord> {
    return this.updateRecord<FixedEstimateRecord>(COLLECTIONS.FIXED_ESTIMATES, id, data);
  }

  async deleteFixedEstimate(id: string): Promise<void> {
    return this.deleteRecord(COLLECTIONS.FIXED_ESTIMATES, id);
  }
}
