// Import batch repository for DriftMoney (OCR imports)
import {
  queryAll,
  queryOne,
  execute,
  buildInsert,
  buildUpdate,
  entityToRow,
  softDelete,
  markSynced,
  findBySyncStatus,
  now,
} from '../db';
import { generateId } from '../utils/idUtils';
import type { ImportBatch, ImportBatchCreate, ImportStatus } from '../types/import';
import type { SyncStatus } from '../types/common';

export interface FindImportsOptions {
  accountId?: string;
  status?: ImportStatus;
  limit?: number;
}

export const ImportRepository = {
  findById(id: string): ImportBatch | null {
    return queryOne<ImportBatch>(
      'SELECT * FROM import_batches WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(options: FindImportsOptions = {}): ImportBatch[] {
    let sql = 'SELECT * FROM import_batches WHERE sync_status != ?';
    const params: (string | number | null)[] = ['deleted'];

    if (options.accountId) {
      sql += ' AND account_id = ?';
      params.push(options.accountId);
    }

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY import_date DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return queryAll<ImportBatch>(sql, params);
  },

  findByAccount(accountId: string, limit?: number): ImportBatch[] {
    return this.findAll({ accountId, limit });
  },

  findPending(): ImportBatch[] {
    return this.findAll({ status: 'pending' });
  },

  findProcessing(): ImportBatch[] {
    return this.findAll({ status: 'processing' });
  },

  create(data: ImportBatchCreate): ImportBatch {
    const timestamp = now();
    const importBatch: ImportBatch = {
      id: generateId.import(),
      accountId: data.accountId,
      filename: data.filename,
      importDate: new Date().toISOString().split('T')[0],
      transactionCount: 0,
      status: 'pending',
      duplicatesSkipped: 0,
      newTransactions: 0,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = entityToRow(importBatch);
    const { sql, params } = buildInsert('import_batches', row);
    execute(sql, params);

    return importBatch;
  },

  updateStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string
  ): ImportBatch | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData: Record<string, string | number | null> = {
      status,
      sync_status: 'dirty',
      updated_at: timestamp,
    };

    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }

    const { sql, params } = buildUpdate('import_batches', updateData as Record<string, string | number | null | boolean | Uint8Array>, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  updateCounts(
    id: string,
    transactionCount: number,
    newTransactions: number,
    duplicatesSkipped: number
  ): ImportBatch | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      transaction_count: transactionCount,
      new_transactions: newTransactions,
      duplicates_skipped: duplicatesSkipped,
      sync_status: 'dirty',
      updated_at: timestamp,
    };

    const { sql, params } = buildUpdate('import_batches', updateData, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  markCompleted(
    id: string,
    transactionCount: number,
    newTransactions: number,
    duplicatesSkipped: number
  ): ImportBatch | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      status: 'completed' as ImportStatus,
      transaction_count: transactionCount,
      new_transactions: newTransactions,
      duplicates_skipped: duplicatesSkipped,
      sync_status: 'dirty',
      updated_at: timestamp,
    };

    const { sql, params } = buildUpdate('import_batches', updateData, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  markFailed(id: string, errorMessage: string): ImportBatch | null {
    return this.updateStatus(id, 'failed', errorMessage);
  },

  delete(id: string): void {
    softDelete('import_batches', id);
  },

  // Sync helpers
  findDirty(): ImportBatch[] {
    return findBySyncStatus<ImportBatch>('import_batches', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('import_batches', ids);
  },

  upsertFromCloud(importBatch: ImportBatch & { updatedAt: string }): void {
    const existing = queryOne<ImportBatch & { updatedAt: string }>(
      'SELECT * FROM import_batches WHERE id = ?',
      [importBatch.id]
    );

    if (existing) {
      if (importBatch.updatedAt > existing.updatedAt) {
        const row = entityToRow(
          { ...importBatch, syncStatus: 'synced' as SyncStatus },
          ['id', 'createdAt']
        );
        const { sql, params } = buildUpdate('import_batches', row, 'id = ?', [
          importBatch.id,
        ]);
        execute(sql, params);
      }
    } else {
      const row = entityToRow({ ...importBatch, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('import_batches', row);
      execute(sql, params);
    }
  },

  // Analytics
  getTotalImported(accountId?: string): number {
    let sql =
      'SELECT COALESCE(SUM(new_transactions), 0) as total FROM import_batches WHERE sync_status != ? AND status = ?';
    const params: (string | number | null)[] = ['deleted', 'completed'];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    const result = queryOne<{ total: number }>(sql, params);
    return result?.total ?? 0;
  },
};
