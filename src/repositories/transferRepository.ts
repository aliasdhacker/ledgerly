// Transfer repository for DriftMoney
import {
  queryAll,
  queryOne,
  execute,
  buildInsert,
  entityToRow,
  softDelete,
  markSynced,
  findBySyncStatus,
  now,
} from '../db';
import { generateId } from '../utils/idUtils';
import { TransactionType } from '../types/common';
import type { Transfer, TransferCreate } from '../types/transaction';
import type { SyncStatus } from '../types/common';

export const TransferRepository = {
  findById(id: string): Transfer | null {
    return queryOne<Transfer>(
      'SELECT * FROM transfers WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(): Transfer[] {
    return queryAll<Transfer>(
      'SELECT * FROM transfers WHERE sync_status != ? ORDER BY date DESC',
      ['deleted']
    );
  },

  findByAccount(accountId: string): Transfer[] {
    return queryAll<Transfer>(
      `SELECT * FROM transfers
       WHERE (from_account_id = ? OR to_account_id = ?)
       AND sync_status != ?
       ORDER BY date DESC`,
      [accountId, accountId, 'deleted']
    );
  },

  /**
   * Creates a transfer with two linked transactions:
   * - Debit from source account
   * - Credit to destination account
   */
  createWithTransactions(data: TransferCreate): Transfer {
    const timestamp = now();
    const transferId = generateId.transfer();
    const fromTransactionId = generateId.transaction();
    const toTransactionId = generateId.transaction();

    // Create the "from" transaction (debit - money leaving)
    const fromTransaction = {
      id: fromTransactionId,
      account_id: data.fromAccountId,
      type: TransactionType.DEBIT,
      amount: data.amount,
      description: data.description || 'Transfer out',
      date: data.date,
      transfer_id: transferId,
      is_split: 0,
      is_reconciled: 0,
      sync_status: 'dirty',
      created_at: timestamp,
      updated_at: timestamp,
    };

    // Create the "to" transaction (credit - money arriving)
    const toTransaction = {
      id: toTransactionId,
      account_id: data.toAccountId,
      type: TransactionType.CREDIT,
      amount: data.amount,
      description: data.description || 'Transfer in',
      date: data.date,
      transfer_id: transferId,
      is_split: 0,
      is_reconciled: 0,
      sync_status: 'dirty',
      created_at: timestamp,
      updated_at: timestamp,
    };

    // Create the transfer record
    const transfer: Transfer = {
      id: transferId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      amount: data.amount,
      date: data.date,
      description: data.description,
      fromTransactionId,
      toTransactionId,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Insert all three records
    const { sql: fromSql, params: fromParams } = buildInsert(
      'transactions',
      fromTransaction
    );
    execute(fromSql, fromParams);

    const { sql: toSql, params: toParams } = buildInsert(
      'transactions',
      toTransaction
    );
    execute(toSql, toParams);

    const transferRow = entityToRow(transfer);
    const { sql: transferSql, params: transferParams } = buildInsert(
      'transfers',
      transferRow
    );
    execute(transferSql, transferParams);

    return transfer;
  },

  /**
   * Deletes a transfer and its linked transactions
   */
  delete(id: string): void {
    const transfer = this.findById(id);
    if (!transfer) return;

    // Soft delete the linked transactions
    softDelete('transactions', transfer.fromTransactionId);
    softDelete('transactions', transfer.toTransactionId);

    // Soft delete the transfer
    softDelete('transfers', id);
  },

  // Sync helpers
  findDirty(): Transfer[] {
    return findBySyncStatus<Transfer>('transfers', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('transfers', ids);
  },

  upsertFromCloud(transfer: Transfer & { updatedAt: string }): void {
    const existing = queryOne<Transfer & { updatedAt: string }>(
      'SELECT * FROM transfers WHERE id = ?',
      [transfer.id]
    );

    if (existing) {
      if (transfer.updatedAt > existing.updatedAt) {
        execute(
          `UPDATE transfers SET
             from_account_id = ?, to_account_id = ?, amount = ?, date = ?,
             description = ?, from_transaction_id = ?, to_transaction_id = ?,
             sync_status = 'synced', updated_at = ?
           WHERE id = ?`,
          [
            transfer.fromAccountId,
            transfer.toAccountId,
            transfer.amount,
            transfer.date,
            transfer.description ?? null,
            transfer.fromTransactionId,
            transfer.toTransactionId,
            transfer.updatedAt,
            transfer.id,
          ]
        );
      }
    } else {
      const row = entityToRow({ ...transfer, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('transfers', row);
      execute(sql, params);
    }
  },
};
