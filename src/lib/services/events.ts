import type { IncomeRecord, ExpenseRecord, Transaction } from "@/lib/types";

export type FinancialRecordEvent =
  | { type: "income:added"; record: IncomeRecord }
  | { type: "income:updated"; record: IncomeRecord }
  | { type: "income:deleted"; record: IncomeRecord }
  | { type: "expense:added"; record: ExpenseRecord }
  | { type: "expense:updated"; record: ExpenseRecord }
  | { type: "expense:deleted"; record: ExpenseRecord };

export type InvestmentEvent =
  | { type: "investment:added"; transaction: Transaction }
  | { type: "investment:updated"; transaction: Transaction }
  | { type: "investment:deleted"; transaction: Transaction };

export type TransactionEvent =
  | { type: "transaction:created"; transaction: Transaction }
  | { type: "transaction:updated"; transaction: Transaction }
  | { type: "transaction:deleted"; transaction: Transaction };

type EventType = FinancialRecordEvent | InvestmentEvent | TransactionEvent;
type EventHandler<T extends EventType> = (event: T) => Promise<void> | void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<Function>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe<T extends EventType>(
    eventType: T["type"],
    handler: EventHandler<T>,
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publish<T extends EventType>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(
      Array.from(handlers).map((handler) => {
        try {
          return Promise.resolve(handler(event));
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
          return Promise.resolve();
        }
      }),
    );
  }
}

export const eventBus = EventBus.getInstance();
