// Transfer repository

import { Transfer, TransferCreate } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId } from '../../utils';
import { accountRepo } from './accountRepo';

interface TransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  description: string | null;
  from_transaction_id: string;
  to_transaction_id: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToTransfer = (row: TransferRow): Transfer => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  amount: row.amount,
  date: row.date,
  description: row.description || undefined,
  fromTransactionId: row.from_transaction_id,
  toTransactionId: row.to_transaction_id,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const transferRepo = {
  // Get all transfers
  getAll: (): Transfer[] => {
    const rows = queryAll<TransferRow>(
      "SELECT * FROM transfers WHERE sync_status != 'deleted' ORDER BY date DESC"
    );
    return rows.map(rowToTransfer);
  },

  // Get by ID
  getById: (id: string): Transfer | null => {
    const row = queryOne<TransferRow>(
      "SELECT * FROM transfers WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToTransfer(row) : null;
  },

  // Get transfers involving an account
  getByAccount: (accountId: string): Transfer[] => {
    const rows = queryAll<TransferRow>(
      "SELECT * FROM transfers WHERE (from_account_id = ? OR to_account_id = ?) AND sync_status != 'deleted' ORDER BY date DESC",
      [accountId, accountId]
    );
    return rows.map(rowToTransfer);
  },

  // Create transfer (creates paired transactions)
  create: (data: TransferCreate): Transfer => {
    const id = generateId.transfer();
    const timestamp = now();
    const fromTransactionId = generateId.transaction();
    const toTransactionId = generateId.transaction();

    const fromAccount = accountRepo.getById(data.fromAccountId);
    const toAccount = accountRepo.getById(data.toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Invalid account IDs for transfer');
    }

    const description = data.description || `Transfer to ${toAccount.name}`;
    const toDescription = data.description || `Transfer from ${fromAccount.name}`;

    // Create "from" transaction (debit from source account)
    execute(
      `INSERT INTO transactions (
        id, account_id, type, amount, description, date, category_id, transfer_id,
        is_split, is_reconciled, sync_status, created_at, updated_at
      ) VALUES (?, ?, 'debit', ?, ?, ?, NULL, ?, 0, 0, 'dirty', ?, ?)`,
      [fromTransactionId, data.fromAccountId, data.amount, description, data.date, id, timestamp, timestamp]
    );

    // Create "to" transaction (credit to destination account)
    execute(
      `INSERT INTO transactions (
        id, account_id, type, amount, description, date, category_id, transfer_id,
        is_split, is_reconciled, sync_status, created_at, updated_at
      ) VALUES (?, ?, 'credit', ?, ?, ?, NULL, ?, 0, 0, 'dirty', ?, ?)`,
      [toTransactionId, data.toAccountId, data.amount, toDescription, data.date, id, timestamp, timestamp]
    );

    // Create transfer record
    execute(
      `INSERT INTO transfers (
        id, from_account_id, to_account_id, amount, date, description,
        from_transaction_id, to_transaction_id, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dirty', ?, ?)`,
      [id, data.fromAccountId, data.toAccountId, data.amount, data.date,
       data.description || null, fromTransactionId, toTransactionId, timestamp, timestamp]
    );

    // Update account balances
    accountRepo.adjustBalance(data.fromAccountId, -data.amount);
    accountRepo.adjustBalance(data.toAccountId, data.amount);

    return transferRepo.getById(id)!;
  },

  // Delete transfer (deletes paired transactions and reverses balances)
  delete: (id: string): boolean => {
    const existing = transferRepo.getById(id);
    if (!existing) return false;

    // Reverse the balance changes
    accountRepo.adjustBalance(existing.fromAccountId, existing.amount);
    accountRepo.adjustBalance(existing.toAccountId, -existing.amount);

    // Delete the paired transactions
    execute("UPDATE transactions SET sync_status = 'deleted', updated_at = ? WHERE transfer_id = ?", [now(), id]);

    // Soft delete the transfer
    softDelete('transfers', id);
    return true;
  },

  // Get dirty records for sync
  getDirty: (): Transfer[] => {
    const rows = getDirty<TransferRow>('transfers');
    return rows.map(rowToTransfer);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('transfers', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (transfer: Transfer): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM transfers WHERE id = ?',
      [transfer.id]
    );

    if (existing) {
      if (transfer.updatedAt > existing.updated_at) {
        execute(
          `UPDATE transfers SET from_account_id = ?, to_account_id = ?, amount = ?, date = ?,
           description = ?, from_transaction_id = ?, to_transaction_id = ?,
           sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [
            transfer.fromAccountId, transfer.toAccountId, transfer.amount, transfer.date,
            transfer.description || null, transfer.fromTransactionId, transfer.toTransactionId,
            transfer.updatedAt, transfer.id
          ]
        );
      }
    } else {
      execute(
        `INSERT INTO transfers (
          id, from_account_id, to_account_id, amount, date, description,
          from_transaction_id, to_transaction_id, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [
          transfer.id, transfer.fromAccountId, transfer.toAccountId, transfer.amount,
          transfer.date, transfer.description || null, transfer.fromTransactionId,
          transfer.toTransactionId, transfer.createdAt, transfer.updatedAt
        ]
      );
    }
  },
};
