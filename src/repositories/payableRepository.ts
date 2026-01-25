// Payable repository for DriftMoney (bills)
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
import type { Payable, PayableCreate, PayableUpdate } from '../types/payable';
import type { RecurrenceRule, SyncStatus } from '../types/common';

export interface FindPayablesOptions {
  isPaid?: boolean;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  isRecurring?: boolean;
}

// Internal row type with JSON field
interface PayableRow extends Omit<Payable, 'recurrenceRule'> {
  recurrenceRuleJson: string | null;
}

function rowToPayable(row: PayableRow): Payable {
  const { recurrenceRuleJson, ...rest } = row;
  return {
    ...rest,
    recurrenceRule: recurrenceRuleJson
      ? (JSON.parse(recurrenceRuleJson) as RecurrenceRule)
      : undefined,
  };
}

type SQLiteBindValue = string | number | null | boolean | Uint8Array;

function payableToRow(payable: Partial<Payable>): Record<string, SQLiteBindValue> {
  const { recurrenceRule, ...rest } = payable;
  return entityToRow({
    ...rest,
    recurrenceRuleJson: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
  });
}

export const PayableRepository = {
  findById(id: string): Payable | null {
    const row = queryOne<PayableRow>(
      'SELECT * FROM payables WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
    return row ? rowToPayable(row) : null;
  },

  findAll(options: FindPayablesOptions = {}): Payable[] {
    let sql = 'SELECT * FROM payables WHERE sync_status != ?';
    const params: (string | number | null)[] = ['deleted'];

    if (options.isPaid !== undefined) {
      sql += ' AND is_paid = ?';
      params.push(options.isPaid ? 1 : 0);
    }

    if (options.startDate) {
      sql += ' AND due_date >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      sql += ' AND due_date <= ?';
      params.push(options.endDate);
    }

    if (options.categoryId) {
      sql += ' AND category_id = ?';
      params.push(options.categoryId);
    }

    if (options.isRecurring !== undefined) {
      sql += ' AND is_recurring = ?';
      params.push(options.isRecurring ? 1 : 0);
    }

    sql += ' ORDER BY due_date ASC';

    const rows = queryAll<PayableRow>(sql, params);
    return rows.map(rowToPayable);
  },

  findUpcoming(days: number): Payable[] {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return this.findAll({
      isPaid: false,
      startDate: today,
      endDate: futureDateStr,
    });
  },

  findOverdue(): Payable[] {
    const today = new Date().toISOString().split('T')[0];
    const rows = queryAll<PayableRow>(
      `SELECT * FROM payables
       WHERE sync_status != ? AND is_paid = 0 AND due_date < ?
       ORDER BY due_date ASC`,
      ['deleted', today]
    );
    return rows.map(rowToPayable);
  },

  create(data: PayableCreate): Payable {
    const timestamp = now();
    const payable: Payable = {
      id: data.id || generateId.payable(),
      name: data.name,
      amount: data.amount,
      dueDate: data.dueDate,
      isPaid: false,
      paidFromAccountId: data.paidFromAccountId,
      isRecurring: data.isRecurring,
      recurrenceRule: data.recurrenceRule,
      parentPayableId: data.parentPayableId,
      categoryId: data.categoryId,
      notes: data.notes,
      payee: data.payee,
      autoPayAccountId: data.autoPayAccountId,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = payableToRow(payable);
    const { sql, params } = buildInsert('payables', row);
    execute(sql, params);

    return payable;
  },

  update(id: string, data: PayableUpdate): Payable | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      ...data,
      syncStatus: 'dirty' as SyncStatus,
      updatedAt: timestamp,
    };

    const row = payableToRow(updateData);
    // Remove undefined values and excluded keys
    const cleanRow: Record<string, SQLiteBindValue> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        cleanRow[key] = value;
      }
    }

    const { sql, params } = buildUpdate('payables', cleanRow, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  markPaid(
    id: string,
    paidFromAccountId: string,
    paidDate?: string,
    linkedTransactionId?: string
  ): Payable | null {
    return this.update(id, {
      isPaid: true,
      paidDate: paidDate || new Date().toISOString().split('T')[0],
      paidFromAccountId,
      linkedTransactionId,
    });
  },

  markUnpaid(id: string): Payable | null {
    return this.update(id, {
      isPaid: false,
      paidDate: undefined,
      linkedTransactionId: undefined,
    });
  },

  delete(id: string): void {
    softDelete('payables', id);
  },

  // Sync helpers
  findDirty(): Payable[] {
    const rows = findBySyncStatus<PayableRow>('payables', 'dirty');
    return rows.map(rowToPayable);
  },

  markSynced(ids: string[]): void {
    markSynced('payables', ids);
  },

  upsertFromCloud(payable: Payable & { updatedAt: string }): void {
    const existing = queryOne<PayableRow & { updatedAt: string }>(
      'SELECT * FROM payables WHERE id = ?',
      [payable.id]
    );

    if (existing) {
      if (payable.updatedAt > existing.updatedAt) {
        const row = payableToRow({ ...payable, syncStatus: 'synced' as SyncStatus });
        const cleanRow: Record<string, SQLiteBindValue> = {};
        for (const [key, value] of Object.entries(row)) {
          if (key !== 'id' && key !== 'created_at') {
            cleanRow[key] = value;
          }
        }
        const { sql, params } = buildUpdate('payables', cleanRow, 'id = ?', [
          payable.id,
        ]);
        execute(sql, params);
      }
    } else {
      const row = payableToRow({ ...payable, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('payables', row);
      execute(sql, params);
    }
  },

  // Analytics helpers
  getUpcomingTotal(days: number): number {
    const upcoming = this.findUpcoming(days);
    return upcoming.reduce((sum, p) => sum + p.amount, 0);
  },

  getOverdueTotal(): number {
    const overdue = this.findOverdue();
    return overdue.reduce((sum, p) => sum + p.amount, 0);
  },
};
