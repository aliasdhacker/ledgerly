// Payable types for DriftMoney (bills - recurring and one-off)

import { SyncableEntity, RecurrenceRule } from './common';

export interface Payable extends SyncableEntity {
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;

  // Links
  paidFromAccountId?: string;
  linkedTransactionId?: string;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentPayableId?: string;

  // Metadata
  categoryId?: string;
  notes?: string;
  payee?: string;

  // Auto-pay
  autoPayAccountId?: string;
}

// For creating new payables
export type PayableCreate = Omit<Payable, keyof SyncableEntity | 'isPaid' | 'paidDate' | 'linkedTransactionId'> & {
  id?: string;
};

// For updating payables
export type PayableUpdate = Partial<Omit<Payable, 'id' | 'createdAt' | 'parentPayableId'>>;

// For marking as paid
export interface PayablePayment {
  payableId: string;
  paidFromAccountId: string;
  paidDate?: string;
  actualAmount?: number; // If different from payable amount
  notes?: string;
}

// Payable with computed status
export interface PayableWithStatus extends Payable {
  isOverdue: boolean;
  daysUntilDue: number;
  daysOverdue: number;
}
