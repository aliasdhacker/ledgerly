// Account repository

import { Account, AccountCreate, AccountUpdate, AccountType, Currency } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId } from '../../utils';

interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  institution_name: string | null;
  account_number_last4: string | null;
  is_active: number;
  sort_order: number;
  reconciled_balance: number | null;
  reconciled_date: string | null;
  credit_limit: number | null;
  minimum_payment: number | null;
  payment_due_day: number | null;
  apr: number | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToAccount = (row: AccountRow): Account => ({
  id: row.id,
  name: row.name,
  type: row.type as AccountType,
  balance: row.balance,
  currency: row.currency as Currency,
  institutionName: row.institution_name || undefined,
  accountNumberLast4: row.account_number_last4 || undefined,
  isActive: !!row.is_active,
  sortOrder: row.sort_order,
  reconciledBalance: row.reconciled_balance ?? undefined,
  reconciledDate: row.reconciled_date || undefined,
  creditLimit: row.credit_limit ?? undefined,
  minimumPayment: row.minimum_payment ?? undefined,
  paymentDueDay: row.payment_due_day ?? undefined,
  apr: row.apr ?? undefined,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const accountRepo = {
  // Get all accounts
  getAll: (): Account[] => {
    const rows = queryAll<AccountRow>(
      "SELECT * FROM accounts WHERE sync_status != 'deleted' ORDER BY sort_order ASC, name ASC"
    );
    return rows.map(rowToAccount);
  },

  // Get active accounts
  getActive: (): Account[] => {
    const rows = queryAll<AccountRow>(
      "SELECT * FROM accounts WHERE is_active = 1 AND sync_status != 'deleted' ORDER BY sort_order ASC, name ASC"
    );
    return rows.map(rowToAccount);
  },

  // Get by type
  getByType: (type: AccountType): Account[] => {
    const rows = queryAll<AccountRow>(
      "SELECT * FROM accounts WHERE type = ? AND sync_status != 'deleted' ORDER BY sort_order ASC, name ASC",
      [type]
    );
    return rows.map(rowToAccount);
  },

  // Get bank accounts
  getBankAccounts: (): Account[] => accountRepo.getByType('bank'),

  // Get credit accounts
  getCreditAccounts: (): Account[] => accountRepo.getByType('credit'),

  // Get by ID
  getById: (id: string): Account | null => {
    const row = queryOne<AccountRow>(
      "SELECT * FROM accounts WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToAccount(row) : null;
  },

  // Create account
  create: (data: AccountCreate): Account => {
    const id = data.id || generateId.account();
    const timestamp = now();

    execute(
      `INSERT INTO accounts (
        id, name, type, balance, currency, institution_name, account_number_last4,
        is_active, sort_order, reconciled_balance, reconciled_date,
        credit_limit, minimum_payment, payment_due_day, apr,
        sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dirty', ?, ?)`,
      [
        id, data.name, data.type, data.balance, data.currency,
        data.institutionName || null, data.accountNumberLast4 || null,
        data.isActive ? 1 : 0, data.sortOrder,
        data.reconciledBalance ?? null, data.reconciledDate || null,
        data.creditLimit ?? null, data.minimumPayment ?? null,
        data.paymentDueDay ?? null, data.apr ?? null,
        timestamp, timestamp
      ]
    );

    return accountRepo.getById(id)!;
  },

  // Update account
  update: (id: string, data: AccountUpdate): Account | null => {
    const existing = accountRepo.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.balance !== undefined) { updates.push('balance = ?'); params.push(data.balance); }
    if (data.currency !== undefined) { updates.push('currency = ?'); params.push(data.currency); }
    if (data.institutionName !== undefined) { updates.push('institution_name = ?'); params.push(data.institutionName || null); }
    if (data.accountNumberLast4 !== undefined) { updates.push('account_number_last4 = ?'); params.push(data.accountNumberLast4 || null); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }
    if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(data.sortOrder); }
    if (data.reconciledBalance !== undefined) { updates.push('reconciled_balance = ?'); params.push(data.reconciledBalance ?? null); }
    if (data.reconciledDate !== undefined) { updates.push('reconciled_date = ?'); params.push(data.reconciledDate || null); }
    if (data.creditLimit !== undefined) { updates.push('credit_limit = ?'); params.push(data.creditLimit ?? null); }
    if (data.minimumPayment !== undefined) { updates.push('minimum_payment = ?'); params.push(data.minimumPayment ?? null); }
    if (data.paymentDueDay !== undefined) { updates.push('payment_due_day = ?'); params.push(data.paymentDueDay ?? null); }
    if (data.apr !== undefined) { updates.push('apr = ?'); params.push(data.apr ?? null); }

    if (updates.length === 0) return existing;

    updates.push('sync_status = ?', 'updated_at = ?');
    params.push('dirty', now(), id);

    execute(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`, params);

    return accountRepo.getById(id);
  },

  // Update balance only (internal use)
  updateBalance: (id: string, newBalance: number): void => {
    execute(
      "UPDATE accounts SET balance = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [newBalance, now(), id]
    );
  },

  // Adjust balance by amount (for transactions)
  adjustBalance: (id: string, amount: number): void => {
    execute(
      "UPDATE accounts SET balance = balance + ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [amount, now(), id]
    );
  },

  // Delete account (soft delete)
  delete: (id: string): boolean => {
    const existing = accountRepo.getById(id);
    if (!existing) return false;

    softDelete('accounts', id);
    return true;
  },

  // Get total bank balance
  getTotalBankBalance: (): number => {
    const result = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE type = 'bank' AND is_active = 1 AND sync_status != 'deleted'"
    );
    return result?.total || 0;
  },

  // Get total credit balance (debt)
  getTotalCreditBalance: (): number => {
    const result = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE type = 'credit' AND is_active = 1 AND sync_status != 'deleted'"
    );
    return result?.total || 0;
  },

  // Get dirty records for sync
  getDirty: (): Account[] => {
    const rows = getDirty<AccountRow>('accounts');
    return rows.map(rowToAccount);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('accounts', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (account: Account): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM accounts WHERE id = ?',
      [account.id]
    );

    if (existing) {
      if (account.updatedAt > existing.updated_at) {
        execute(
          `UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ?, 
           institution_name = ?, account_number_last4 = ?, is_active = ?, sort_order = ?,
           reconciled_balance = ?, reconciled_date = ?, credit_limit = ?, minimum_payment = ?,
           payment_due_day = ?, apr = ?, sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [
            account.name, account.type, account.balance, account.currency,
            account.institutionName || null, account.accountNumberLast4 || null,
            account.isActive ? 1 : 0, account.sortOrder,
            account.reconciledBalance ?? null, account.reconciledDate || null,
            account.creditLimit ?? null, account.minimumPayment ?? null,
            account.paymentDueDay ?? null, account.apr ?? null,
            account.updatedAt, account.id
          ]
        );
      }
    } else {
      execute(
        `INSERT INTO accounts (
          id, name, type, balance, currency, institution_name, account_number_last4,
          is_active, sort_order, reconciled_balance, reconciled_date,
          credit_limit, minimum_payment, payment_due_day, apr,
          sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [
          account.id, account.name, account.type, account.balance, account.currency,
          account.institutionName || null, account.accountNumberLast4 || null,
          account.isActive ? 1 : 0, account.sortOrder,
          account.reconciledBalance ?? null, account.reconciledDate || null,
          account.creditLimit ?? null, account.minimumPayment ?? null,
          account.paymentDueDay ?? null, account.apr ?? null,
          account.createdAt, account.updatedAt
        ]
      );
    }
  },
};
