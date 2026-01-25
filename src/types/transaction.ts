// Transaction types for DriftMoney

import { SyncableEntity, TransactionType } from './common';

export interface Transaction extends SyncableEntity {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  notes?: string;

  // Links
  linkedPayableId?: string;
  transferId?: string;

  // Splits
  isSplit: boolean;
  parentTransactionId?: string;

  // Import metadata
  importBatchId?: string;
  externalId?: string;
  isReconciled: boolean;
}

export interface TransactionSplit {
  id: string;
  transactionId: string;
  categoryId: string;
  amount: number;
  notes?: string;
}

export interface Transfer extends SyncableEntity {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
  fromTransactionId: string;
  toTransactionId: string;
}

// For creating new transactions
export type TransactionCreate = Omit<Transaction, keyof SyncableEntity | 'isSplit' | 'isReconciled'> & {
  id?: string;
  splits?: Omit<TransactionSplit, 'id' | 'transactionId'>[];
};

// For updating transactions
export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'createdAt' | 'accountId'>>;

// For creating transfers
export interface TransferCreate {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

// Transaction with resolved relations
export interface TransactionWithRelations extends Transaction {
  account?: { id: string; name: string; type: string };
  category?: { id: string; name: string; icon: string; color: string };
  splits?: TransactionSplit[];
}
