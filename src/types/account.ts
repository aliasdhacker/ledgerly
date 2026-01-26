// Account types for DriftMoney

import { SyncableEntity, Currency, RecurrenceFrequency } from './common';

export type AccountType = 'bank' | 'credit' | 'loan';

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

  // Loan accounts only
  loanPrincipal?: number;
  loanInterestRate?: number;
  loanMonthlyPayment?: number;
  loanStartDate?: string;
  loanEndDate?: string;
  loanPaymentFrequency?: RecurrenceFrequency;
  loanPaymentDay?: number; // Day of month (1-31) or day of week (0-6)
  linkedPayableId?: string; // Auto-created payable for loan payments
}

// Computed properties (not stored in DB)
export interface AccountWithComputed extends Account {
  availableCredit?: number; // creditLimit - balance (for credit accounts)
  isOverdue?: boolean; // past payment due day with balance

  // Loan computed properties
  loanRemainingBalance?: number; // Current balance (what's still owed)
  loanPrincipalPaid?: number; // loanPrincipal - current balance
  loanPercentPaid?: number; // Percentage of principal paid off (0-100)
}

// For creating new accounts
export type AccountCreate = Omit<Account, keyof SyncableEntity> & { id?: string };

// For updating accounts
export type AccountUpdate = Partial<Omit<Account, 'id' | 'createdAt'>>;
