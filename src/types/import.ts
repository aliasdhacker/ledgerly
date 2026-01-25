// Import types for DriftMoney (OCR statement imports)

import { SyncableEntity } from './common';

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportBatch extends SyncableEntity {
  accountId: string;
  filename: string;
  importDate: string;
  transactionCount: number;
  status: ImportStatus;
  errorMessage?: string;

  // Deduplication stats
  duplicatesSkipped: number;
  newTransactions: number;
}

// For creating new import batches
export type ImportBatchCreate = {
  accountId: string;
  filename: string;
};

// Import result from OCR pipeline
export interface ImportResult {
  success: boolean;
  batchId: string;
  transactionsImported: number;
  duplicatesSkipped: number;
  errors?: string[];
}

// Raw transaction from OCR (before processing)
export interface RawImportTransaction {
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  date: string;
  category?: string;
  externalId?: string;
}
