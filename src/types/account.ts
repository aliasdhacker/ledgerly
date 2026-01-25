// Account types for DriftMoney

import { SyncableEntity, Currency } from './common';

export type AccountType = 'bank' | 'credit';

export interface Account extends SyncableEntity {
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  institutionName?: string;
  accountNumberLast4?: string;
  isActive: boolean;
  sortOrder: number;

  // Reconciliation
  reconciledBalance?: number;
  reconciledDate?: string;

  // Credit accounts only
  creditLimit?: number;
  minimumPayment?: number;
  paymentDueDay?: number;
  apr?: number;
}

// Computed properties (not stored in DB)
export interface AccountWithComputed extends Account {
  availableCredit?: number; // creditLimit - balance (for credit accounts)
  isOverdue?: boolean; // past payment due day with balance
}

// For creating new accounts
export type AccountCreate = Omit<Account, keyof SyncableEntity> & { id?: string };

// For updating accounts
export type AccountUpdate = Partial<Omit<Account, 'id' | 'createdAt'>>;
