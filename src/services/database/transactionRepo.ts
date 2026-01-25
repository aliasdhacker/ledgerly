// Transaction repository

import { Transaction, TransactionCreate, TransactionUpdate, TransactionType, TransactionSplit } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId } from '../../utils';
import { accountRepo } from './accountRepo';

interface TransactionRow {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
  notes: string | null;
  linked_payable_id: string | null;
  transfer_id: string | null;
  is_split: number;
  parent_transaction_id: string | null;
  import_batch_id: string | null;
  external_id: string | null;
  is_reconciled: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

interface SplitRow {
  id: string;
  transaction_id: string;
  category_id: string;
  amount: number;
  notes: string | null;
}

const rowToTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  accountId: row.account_id,
  type: row.type as TransactionType,
  amount: row.amount,
  description: row.description,
  date: row.date,
  categoryId: row.category_id || undefined,
  notes: row.notes || undefined,
  linkedPayableId: row.linked_payable_id || undefined,
  transferId: row.transfer_id || undefined,
  isSplit: !!row.is_split,
  parentTransactionId: row.parent_transaction_id || undefined,
  importBatchId: row.import_batch_id || undefined,
  externalId: row.external_id || undefined,
  isReconciled: !!row.is_reconciled,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToSplit = (row: SplitRow): TransactionSplit => ({
  id: row.id,
  transactionId: row.transaction_id,
  categoryId: row.category_id,
  amount: row.amount,
  notes: row.notes || undefined,
});

export const transactionRepo = {
  // Get all transactions
  getAll: (): Transaction[] => {
    const rows = queryAll<TransactionRow>(
      "SELECT * FROM transactions WHERE sync_status != 'deleted' ORDER BY date DESC, created_at DESC"
    );
    return rows.map(rowToTransaction);
  },

  // Get by account
  getByAccount: (accountId: string): Transaction[] => {
    const rows = queryAll<TransactionRow>(
      "SELECT * FROM transactions WHERE account_id = ? AND sync_status != 'deleted' ORDER BY date DESC, created_at DESC",
      [accountId]
    );
    return rows.map(rowToTransaction);
  },

  // Get by date range
  getByDateRange: (startDate: string, endDate: string, accountId?: string): Transaction[] => {
    let sql = "SELECT * FROM transactions WHERE date >= ? AND date <= ? AND sync_status != 'deleted'";
    const params: unknown[] = [startDate, endDate];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    const rows = queryAll<TransactionRow>(sql, params);
    return rows.map(rowToTransaction);
  },

  // Get by ID
  getById: (id: string): Transaction | null => {
    const row = queryOne<TransactionRow>(
      "SELECT * FROM transactions WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToTransaction(row) : null;
  },

  // Check for duplicate (by external ID)
  existsByExternalId: (accountId: string, externalId: string): boolean => {
    const result = queryOne<{ id: string }>(
      "SELECT id FROM transactions WHERE account_id = ? AND external_id = ? AND sync_status != 'deleted'",
      [accountId, externalId]
    );
    return result !== null;
  },

  // Create transaction
  create: (data: TransactionCreate): Transaction => {
    const id = data.id || generateId.transaction();
    const timestamp = now();
    const hasSplits = data.splits && data.splits.length > 0;

    execute(
      `INSERT INTO transactions (
        id, account_id, type, amount, description, date, category_id, notes,
        linked_payable_id, transfer_id, is_split, parent_transaction_id,
        import_batch_id, external_id, is_reconciled, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'dirty', ?, ?)`,
      [
        id, data.accountId, data.type, data.amount, data.description, data.date,
        data.categoryId || null, data.notes || null,
        data.linkedPayableId || null, data.transferId || null,
        hasSplits ? 1 : 0, data.parentTransactionId || null,
        data.importBatchId || null, data.externalId || null,
        timestamp, timestamp
      ]
    );

    // Create splits if provided
    if (hasSplits) {
      for (const split of data.splits!) {
        const splitId = generateId.split();
        execute(
          `INSERT INTO transaction_splits (id, transaction_id, category_id, amount, notes)
           VALUES (?, ?, ?, ?, ?)`,
          [splitId, id, split.categoryId, split.amount, split.notes || null]
        );
      }
    }

    // Update account balance
    const balanceChange = data.type === TransactionType.CREDIT ? data.amount : -data.amount;
    accountRepo.adjustBalance(data.accountId, balanceChange);

    return transactionRepo.getById(id)!;
  },

  // Update transaction
  update: (id: string, data: TransactionUpdate): Transaction | null => {
    const existing = transactionRepo.getById(id);
    if (!existing) return null;

    // If amount or type changed, need to adjust account balance
    const oldBalanceEffect = existing.type === TransactionType.CREDIT ? existing.amount : -existing.amount;
    
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.date !== undefined) { updates.push('date = ?'); params.push(data.date); }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId || null); }
    if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes || null); }
    if (data.linkedPayableId !== undefined) { updates.push('linked_payable_id = ?'); params.push(data.linkedPayableId || null); }
    if (data.isReconciled !== undefined) { updates.push('is_reconciled = ?'); params.push(data.isReconciled ? 1 : 0); }

    if (updates.length === 0) return existing;

    updates.push('sync_status = ?', 'updated_at = ?');
    params.push('dirty', now(), id);

    execute(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, params);

    // Adjust account balance if amount or type changed
    const newType = data.type ?? existing.type;
    const newAmount = data.amount ?? existing.amount;
    const newBalanceEffect = newType === TransactionType.CREDIT ? newAmount : -newAmount;
    
    if (newBalanceEffect !== oldBalanceEffect) {
      const adjustment = newBalanceEffect - oldBalanceEffect;
      accountRepo.adjustBalance(existing.accountId, adjustment);
    }

    return transactionRepo.getById(id);
  },

  // Delete transaction (soft delete)
  delete: (id: string): boolean => {
    const existing = transactionRepo.getById(id);
    if (!existing) return false;

    // Reverse the balance effect
    const balanceChange = existing.type === TransactionType.CREDIT ? -existing.amount : existing.amount;
    accountRepo.adjustBalance(existing.accountId, balanceChange);

    // Delete splits
    execute('DELETE FROM transaction_splits WHERE transaction_id = ?', [id]);

    softDelete('transactions', id);
    return true;
  },

  // Get splits for transaction
  getSplits: (transactionId: string): TransactionSplit[] => {
    const rows = queryAll<SplitRow>(
      'SELECT * FROM transaction_splits WHERE transaction_id = ?',
      [transactionId]
    );
    return rows.map(rowToSplit);
  },

  // Get recent transactions (last N)
  getRecent: (limit: number = 10, accountId?: string): Transaction[] => {
    let sql = "SELECT * FROM transactions WHERE sync_status != 'deleted'";
    const params: unknown[] = [];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    sql += ' ORDER BY date DESC, created_at DESC LIMIT ?';
    params.push(limit);

    const rows = queryAll<TransactionRow>(sql, params);
    return rows.map(rowToTransaction);
  },

  // Get by category
  getByCategory: (categoryId: string, startDate?: string, endDate?: string): Transaction[] => {
    let sql = "SELECT * FROM transactions WHERE category_id = ? AND sync_status != 'deleted'";
    const params: unknown[] = [categoryId];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY date DESC';

    const rows = queryAll<TransactionRow>(sql, params);
    return rows.map(rowToTransaction);
  },

  // Get totals by type for date range
  getTotals: (startDate: string, endDate: string, accountId?: string): { credits: number; debits: number } => {
    let sql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as debits
      FROM transactions 
      WHERE date >= ? AND date <= ? AND sync_status != 'deleted'
    `;
    const params: unknown[] = [startDate, endDate];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    const result = queryOne<{ credits: number; debits: number }>(sql, params);
    return result || { credits: 0, debits: 0 };
  },

  // Get dirty records for sync
  getDirty: (): Transaction[] => {
    const rows = getDirty<TransactionRow>('transactions');
    return rows.map(rowToTransaction);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('transactions', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (transaction: Transaction): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM transactions WHERE id = ?',
      [transaction.id]
    );

    if (existing) {
      if (transaction.updatedAt > existing.updated_at) {
        execute(
          `UPDATE transactions SET account_id = ?, type = ?, amount = ?, description = ?, date = ?,
           category_id = ?, notes = ?, linked_payable_id = ?, transfer_id = ?, is_split = ?,
           parent_transaction_id = ?, import_batch_id = ?, external_id = ?, is_reconciled = ?,
           sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [
            transaction.accountId, transaction.type, transaction.amount, transaction.description,
            transaction.date, transaction.categoryId || null, transaction.notes || null,
            transaction.linkedPayableId || null, transaction.transferId || null,
            transaction.isSplit ? 1 : 0, transaction.parentTransactionId || null,
            transaction.importBatchId || null, transaction.externalId || null,
            transaction.isReconciled ? 1 : 0, transaction.updatedAt, transaction.id
          ]
        );
      }
    } else {
      execute(
        `INSERT INTO transactions (
          id, account_id, type, amount, description, date, category_id, notes,
          linked_payable_id, transfer_id, is_split, parent_transaction_id,
          import_batch_id, external_id, is_reconciled, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [
          transaction.id, transaction.accountId, transaction.type, transaction.amount,
          transaction.description, transaction.date, transaction.categoryId || null,
          transaction.notes || null, transaction.linkedPayableId || null,
          transaction.transferId || null, transaction.isSplit ? 1 : 0,
          transaction.parentTransactionId || null, transaction.importBatchId || null,
          transaction.externalId || null, transaction.isReconciled ? 1 : 0,
          transaction.createdAt, transaction.updatedAt
        ]
      );
    }
  },
};
