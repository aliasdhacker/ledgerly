// Import batch repository

import { ImportBatch, ImportBatchCreate, ImportStatus } from '../../types';
import { queryAll, queryOne, execute, now, getDirty, markManySynced } from './baseRepo';
import { generateId, today } from '../../utils';

interface ImportBatchRow {
  id: string;
  account_id: string;
  filename: string;
  import_date: string;
  transaction_count: number;
  status: string;
  error_message: string | null;
  duplicates_skipped: number;
  new_transactions: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToImportBatch = (row: ImportBatchRow): ImportBatch => ({
  id: row.id,
  accountId: row.account_id,
  filename: row.filename,
  importDate: row.import_date,
  transactionCount: row.transaction_count,
  status: row.status as ImportStatus,
  errorMessage: row.error_message || undefined,
  duplicatesSkipped: row.duplicates_skipped,
  newTransactions: row.new_transactions,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const importRepo = {
  // Get all import batches
  getAll: (): ImportBatch[] => {
    const rows = queryAll<ImportBatchRow>(
      "SELECT * FROM import_batches WHERE sync_status != 'deleted' ORDER BY import_date DESC"
    );
    return rows.map(rowToImportBatch);
  },

  // Get by account
  getByAccount: (accountId: string): ImportBatch[] => {
    const rows = queryAll<ImportBatchRow>(
      "SELECT * FROM import_batches WHERE account_id = ? AND sync_status != 'deleted' ORDER BY import_date DESC",
      [accountId]
    );
    return rows.map(rowToImportBatch);
  },

  // Get by ID
  getById: (id: string): ImportBatch | null => {
    const row = queryOne<ImportBatchRow>(
      "SELECT * FROM import_batches WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToImportBatch(row) : null;
  },

  // Create import batch
  create: (data: ImportBatchCreate): ImportBatch => {
    const id = generateId.import();
    const timestamp = now();

    execute(
      `INSERT INTO import_batches (
        id, account_id, filename, import_date, transaction_count, status,
        duplicates_skipped, new_transactions, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 'pending', 0, 0, 'dirty', ?, ?)`,
      [id, data.accountId, data.filename, today(), timestamp, timestamp]
    );

    return importRepo.getById(id)!;
  },

  // Update status
  updateStatus: (id: string, status: ImportStatus, errorMessage?: string): void => {
    execute(
      "UPDATE import_batches SET status = ?, error_message = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [status, errorMessage || null, now(), id]
    );
  },

  // Update counts
  updateCounts: (id: string, transactionCount: number, duplicatesSkipped: number, newTransactions: number): void => {
    execute(
      `UPDATE import_batches SET transaction_count = ?, duplicates_skipped = ?, 
       new_transactions = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?`,
      [transactionCount, duplicatesSkipped, newTransactions, now(), id]
    );
  },

  // Mark as completed
  markCompleted: (id: string, transactionCount: number, duplicatesSkipped: number, newTransactions: number): void => {
    execute(
      `UPDATE import_batches SET status = 'completed', transaction_count = ?, 
       duplicates_skipped = ?, new_transactions = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?`,
      [transactionCount, duplicatesSkipped, newTransactions, now(), id]
    );
  },

  // Mark as failed
  markFailed: (id: string, errorMessage: string): void => {
    execute(
      "UPDATE import_batches SET status = 'failed', error_message = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [errorMessage, now(), id]
    );
  },

  // Get dirty records for sync
  getDirty: (): ImportBatch[] => {
    const rows = getDirty<ImportBatchRow>('import_batches');
    return rows.map(rowToImportBatch);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('import_batches', ids);
  },
};
