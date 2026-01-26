// Account repository for DriftMoney
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
import type { Account, AccountCreate, AccountUpdate, AccountType } from '../types/account';
import type { SyncStatus } from '../types/common';

export interface FindAccountsOptions {
  type?: AccountType;
  isActive?: boolean;
  orderBy?: 'sortOrder' | 'name' | 'balance';
}

export const AccountRepository = {
  findById(id: string): Account | null {
    return queryOne<Account>(
      'SELECT * FROM accounts WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(options: FindAccountsOptions = {}): Account[] {
    let sql = 'SELECT * FROM accounts WHERE sync_status != ?';
    const params: (string | number | null)[] = ['deleted'];

    if (options.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    if (options.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(options.isActive ? 1 : 0);
    }

    const orderBy = options.orderBy || 'sortOrder';
    const orderMap: Record<string, string> = {
      sortOrder: 'sort_order ASC, name ASC',
      name: 'name ASC',
      balance: 'balance DESC',
    };
    sql += ` ORDER BY ${orderMap[orderBy]}`;

    return queryAll<Account>(sql, params);
  },

  findByType(type: AccountType): Account[] {
    return this.findAll({ type });
  },

  create(data: AccountCreate): Account {
    const timestamp = now();
    const account: Account = {
      id: data.id || generateId.account(),
      name: data.name,
      type: data.type,
      balance: data.balance,
      currency: data.currency,
      institutionName: data.institutionName,
      accountNumberLast4: data.accountNumberLast4,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      reconciledBalance: data.reconciledBalance,
      reconciledDate: data.reconciledDate,
      creditLimit: data.creditLimit,
      minimumPayment: data.minimumPayment,
      paymentDueDay: data.paymentDueDay,
      apr: data.apr,
      // Loan fields
      loanPrincipal: data.loanPrincipal,
      loanInterestRate: data.loanInterestRate,
      loanMonthlyPayment: data.loanMonthlyPayment,
      loanStartDate: data.loanStartDate,
      loanEndDate: data.loanEndDate,
      loanPaymentFrequency: data.loanPaymentFrequency,
      loanPaymentDay: data.loanPaymentDay,
      linkedPayableId: data.linkedPayableId,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = entityToRow(account);
    const { sql, params } = buildInsert('accounts', row);
    execute(sql, params);

    return account;
  },

  update(id: string, data: AccountUpdate): Account | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      ...data,
      syncStatus: 'dirty' as SyncStatus,
      updatedAt: timestamp,
    };

    const row = entityToRow(updateData, ['id', 'createdAt']);
    const { sql, params } = buildUpdate('accounts', row, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  updateBalance(id: string, newBalance: number): Account | null {
    return this.update(id, { balance: newBalance });
  },

  // Atomically adjust balance using SQL - prevents race conditions
  // Returns true if the update succeeded, false if account not found
  atomicAdjustBalance(id: string, delta: number): boolean {
    const timestamp = now();
    const result = execute(
      `UPDATE accounts SET
         balance = balance + ?,
         sync_status = 'dirty',
         updated_at = ?
       WHERE id = ? AND sync_status != 'deleted'`,
      [delta, timestamp, id]
    );
    return result.changes > 0;
  },

  // Atomically adjust balance with optimistic locking (version check)
  // Returns true if successful, false if account changed since version was read
  atomicAdjustBalanceWithVersion(
    id: string,
    delta: number,
    expectedUpdatedAt: string
  ): boolean {
    const timestamp = now();
    const result = execute(
      `UPDATE accounts SET
         balance = balance + ?,
         sync_status = 'dirty',
         updated_at = ?
       WHERE id = ? AND updated_at = ? AND sync_status != 'deleted'`,
      [delta, timestamp, id, expectedUpdatedAt]
    );
    return result.changes > 0;
  },

  delete(id: string): void {
    softDelete('accounts', id);
  },

  // Sync helpers
  findDirty(): Account[] {
    return findBySyncStatus<Account>('accounts', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('accounts', ids);
  },

  upsertFromCloud(account: Account & { updatedAt: string }): void {
    const existing = queryOne<Account & { updatedAt: string }>(
      'SELECT * FROM accounts WHERE id = ?',
      [account.id]
    );

    if (existing) {
      // Only update if cloud version is newer
      if (account.updatedAt > existing.updatedAt) {
        const row = entityToRow(
          { ...account, syncStatus: 'synced' as SyncStatus },
          ['id', 'createdAt']
        );
        const { sql, params } = buildUpdate('accounts', row, 'id = ?', [account.id]);
        execute(sql, params);
      }
    } else {
      const row = entityToRow({ ...account, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('accounts', row);
      execute(sql, params);
    }
  },

  // Computed helpers
  getTotalBalance(type?: AccountType): number {
    let sql = 'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE sync_status != ? AND is_active = 1';
    const params: (string | number | null)[] = ['deleted'];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    const result = queryOne<{ total: number }>(sql, params);
    return result?.total ?? 0;
  },

  getNetWorth(): number {
    const bankTotal = this.getTotalBalance('bank');
    const creditTotal = this.getTotalBalance('credit');
    const loanTotal = this.getTotalBalance('loan');
    return bankTotal - creditTotal - loanTotal;
  },
};
