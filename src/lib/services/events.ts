import type { IncomeRecord, ExpenseRecord } from "@/lib/types";

export type FinancialRecordEvent =
  | { type: "income:added"; record: IncomeRecord }
  | { type: "income:updated"; record: IncomeRecord }
  | { type: "income:deleted"; recordId: string }
  | { type: "expense:added"; record: ExpenseRecord }
  | { type: "expense:updated"; record: ExpenseRecord }
  | { type: "expense:deleted"; recordId: string };

type EventHandler = (event: FinancialRecordEvent) => Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private handlers: EventHandler[] = [];

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  async publish(event: FinancialRecordEvent): Promise<void> {
    await Promise.all(this.handlers.map((handler) => handler(event)));
  }
}

export const eventBus = EventBus.getInstance();
