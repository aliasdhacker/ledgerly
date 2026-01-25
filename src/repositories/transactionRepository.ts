// Transaction repository for DriftMoney
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
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionSplit,
} from '../types/transaction';
import type { SyncStatus, TransactionType } from '../types/common';

export interface FindTransactionsOptions {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: TransactionType;
  limit?: number;
  offset?: number;
}

export const TransactionRepository = {
  findById(id: string): Transaction | null {
    return queryOne<Transaction>(
      'SELECT * FROM transactions WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(options: FindTransactionsOptions = {}): Transaction[] {
    let sql = 'SELECT * FROM transactions WHERE sync_status != ?';
    const params: (string | number | null)[] = ['deleted'];

    if (options.accountId) {
      sql += ' AND account_id = ?';
      params.push(options.accountId);
    }

    if (options.startDate) {
      sql += ' AND date >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      sql += ' AND date <= ?';
      params.push(options.endDate);
    }

    if (options.categoryId) {
      sql += ' AND category_id = ?';
      params.push(options.categoryId);
    }

    if (options.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    return queryAll<Transaction>(sql, params);
  },

  findByAccount(accountId: string, limit?: number): Transaction[] {
    return this.findAll({ accountId, limit });
  },

  findByDateRange(startDate: string, endDate: string): Transaction[] {
    return this.findAll({ startDate, endDate });
  },

  create(data: TransactionCreate): Transaction {
    const timestamp = now();
    const transaction: Transaction = {
      id: data.id || generateId.transaction(),
      accountId: data.accountId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date,
      categoryId: data.categoryId,
      notes: data.notes,
      linkedPayableId: data.linkedPayableId,
      transferId: data.transferId,
      isSplit: !!(data.splits && data.splits.length > 0),
      parentTransactionId: data.parentTransactionId,
      importBatchId: data.importBatchId,
      externalId: data.externalId,
      isReconciled: false,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = entityToRow(transaction);
    const { sql, params } = buildInsert('transactions', row);
    execute(sql, params);

    // Create splits if provided
    if (data.splits && data.splits.length > 0) {
      for (const split of data.splits) {
        this.createSplit(transaction.id, split);
      }
    }

    return transaction;
  },

  update(id: string, data: TransactionUpdate): Transaction | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      ...data,
      syncStatus: 'dirty' as SyncStatus,
      updatedAt: timestamp,
    };

    const row = entityToRow(updateData, ['id', 'createdAt', 'accountId']);
    const { sql, params } = buildUpdate('transactions', row, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  delete(id: string): void {
    // Delete splits first
    execute('DELETE FROM transaction_splits WHERE transaction_id = ?', [id]);
    softDelete('transactions', id);
  },

  // Split operations
  createSplit(
    transactionId: string,
    data: Omit<TransactionSplit, 'id' | 'transactionId'>
  ): TransactionSplit {
    const split: TransactionSplit = {
      id: generateId.split(),
      transactionId,
      categoryId: data.categoryId,
      amount: data.amount,
      notes: data.notes,
    };

    const row = entityToRow(split);
    const { sql, params } = buildInsert('transaction_splits', row);
    execute(sql, params);

    return split;
  },

  findSplits(transactionId: string): TransactionSplit[] {
    return queryAll<TransactionSplit>(
      'SELECT * FROM transaction_splits WHERE transaction_id = ?',
      [transactionId]
    );
  },

  deleteSplits(transactionId: string): void {
    execute('DELETE FROM transaction_splits WHERE transaction_id = ?', [transactionId]);
  },

  // Sync helpers
  findDirty(): Transaction[] {
    return findBySyncStatus<Transaction>('transactions', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('transactions', ids);
  },

  upsertFromCloud(transaction: Transaction & { updatedAt: string }): void {
    const existing = queryOne<Transaction & { updatedAt: string }>(
      'SELECT * FROM transactions WHERE id = ?',
      [transaction.id]
    );

    if (existing) {
      if (transaction.updatedAt > existing.updatedAt) {
        const row = entityToRow(
          { ...transaction, syncStatus: 'synced' as SyncStatus },
          ['id', 'createdAt']
        );
        const { sql, params } = buildUpdate('transactions', row, 'id = ?', [
          transaction.id,
        ]);
        execute(sql, params);
      }
    } else {
      const row = entityToRow({ ...transaction, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('transactions', row);
      execute(sql, params);
    }
  },

  // Analytics helpers
  sumByType(
    accountId: string,
    type: TransactionType,
    startDate?: string,
    endDate?: string
  ): number {
    let sql =
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = ? AND type = ? AND sync_status != ?';
    const params: (string | number | null)[] = [accountId, type, 'deleted'];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    const result = queryOne<{ total: number }>(sql, params);
    return result?.total ?? 0;
  },

  countByAccount(accountId: string): number {
    const result = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = ? AND sync_status != ?',
      [accountId, 'deleted']
    );
    return result?.count ?? 0;
  },
};
