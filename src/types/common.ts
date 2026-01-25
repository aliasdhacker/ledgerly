// Common types and base interfaces for DriftMoney

export type SyncStatus = 'synced' | 'dirty' | 'deleted';

export interface SyncableEntity {
  id: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'MXN';

export const DEFAULT_CURRENCY: Currency = 'USD';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  endDate?: string;
}

// Helper to create a new SyncableEntity base
export const createSyncableEntity = (id: string): Omit<SyncableEntity, 'id'> & { id: string } => {
  const now = new Date().toISOString();
  return {
    id,
    syncStatus: 'dirty',
    createdAt: now,
    updatedAt: now,
  };
};
