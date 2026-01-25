// Payable repository (bills - recurring and one-off)

import { Payable, PayableCreate, PayableUpdate, RecurrenceFrequency } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId, getNextOccurrence, today } from '../../utils';

interface PayableRow {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: number;
  paid_date: string | null;
  paid_from_account_id: string | null;
  linked_transaction_id: string | null;
  is_recurring: number;
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  recurrence_day_of_month: number | null;
  recurrence_day_of_week: number | null;
  recurrence_end_date: string | null;
  parent_payable_id: string | null;
  category_id: string | null;
  notes: string | null;
  payee: string | null;
  auto_pay_account_id: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToPayable = (row: PayableRow): Payable => ({
  id: row.id,
  name: row.name,
  amount: row.amount,
  dueDate: row.due_date,
  isPaid: !!row.is_paid,
  paidDate: row.paid_date || undefined,
  paidFromAccountId: row.paid_from_account_id || undefined,
  linkedTransactionId: row.linked_transaction_id || undefined,
  isRecurring: !!row.is_recurring,
  recurrenceRule: row.recurrence_frequency ? {
    frequency: row.recurrence_frequency as RecurrenceFrequency,
    interval: row.recurrence_interval || 1,
    dayOfMonth: row.recurrence_day_of_month ?? undefined,
    dayOfWeek: row.recurrence_day_of_week ?? undefined,
    endDate: row.recurrence_end_date || undefined,
  } : undefined,
  parentPayableId: row.parent_payable_id || undefined,
  categoryId: row.category_id || undefined,
  notes: row.notes || undefined,
  payee: row.payee || undefined,
  autoPayAccountId: row.auto_pay_account_id || undefined,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const payableRepo = {
  // Get all payables
  getAll: (): Payable[] => {
    const rows = queryAll<PayableRow>(
      "SELECT * FROM payables WHERE sync_status != 'deleted' ORDER BY due_date ASC"
    );
    return rows.map(rowToPayable);
  },

  // Get unpaid payables
  getUnpaid: (): Payable[] => {
    const rows = queryAll<PayableRow>(
      "SELECT * FROM payables WHERE is_paid = 0 AND sync_status != 'deleted' ORDER BY due_date ASC"
    );
    return rows.map(rowToPayable);
  },

  // Get paid payables
  getPaid: (): Payable[] => {
    const rows = queryAll<PayableRow>(
      "SELECT * FROM payables WHERE is_paid = 1 AND sync_status != 'deleted' ORDER BY paid_date DESC"
    );
    return rows.map(rowToPayable);
  },

  // Get overdue payables
  getOverdue: (): Payable[] => {
    const todayStr = today();
    const rows = queryAll<PayableRow>(
      "SELECT * FROM payables WHERE is_paid = 0 AND due_date < ? AND sync_status != 'deleted' ORDER BY due_date ASC",
      [todayStr]
    );
    return rows.map(rowToPayable);
  },

  // Get payables due within N days
  getDueWithin: (days: number): Payable[] => {
    const todayStr = today();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const rows = queryAll<PayableRow>(
      "SELECT * FROM payables WHERE is_paid = 0 AND due_date >= ? AND due_date <= ? AND sync_status != 'deleted' ORDER BY due_date ASC",
      [todayStr, futureDateStr]
    );
    return rows.map(rowToPayable);
  },

  // Get by ID
  getById: (id: string): Payable | null => {
    const row = queryOne<PayableRow>(
      "SELECT * FROM payables WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToPayable(row) : null;
  },

  // Create payable
  create: (data: PayableCreate): Payable => {
    const id = data.id || generateId.payable();
    const timestamp = now();

    execute(
      `INSERT INTO payables (
        id, name, amount, due_date, is_paid, is_recurring,
        recurrence_frequency, recurrence_interval, recurrence_day_of_month,
        recurrence_day_of_week, recurrence_end_date, parent_payable_id,
        category_id, notes, payee, auto_pay_account_id,
        sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dirty', ?, ?)`,
      [
        id, data.name, data.amount, data.dueDate, data.isRecurring ? 1 : 0,
        data.recurrenceRule?.frequency || null,
        data.recurrenceRule?.interval || null,
        data.recurrenceRule?.dayOfMonth ?? null,
        data.recurrenceRule?.dayOfWeek ?? null,
        data.recurrenceRule?.endDate || null,
        data.parentPayableId || null,
        data.categoryId || null, data.notes || null, data.payee || null,
        data.autoPayAccountId || null,
        timestamp, timestamp
      ]
    );

    return payableRepo.getById(id)!;
  },

  // Update payable
  update: (id: string, data: PayableUpdate): Payable | null => {
    const existing = payableRepo.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.dueDate !== undefined) { updates.push('due_date = ?'); params.push(data.dueDate); }
    if (data.isPaid !== undefined) { updates.push('is_paid = ?'); params.push(data.isPaid ? 1 : 0); }
    if (data.paidDate !== undefined) { updates.push('paid_date = ?'); params.push(data.paidDate || null); }
    if (data.paidFromAccountId !== undefined) { updates.push('paid_from_account_id = ?'); params.push(data.paidFromAccountId || null); }
    if (data.linkedTransactionId !== undefined) { updates.push('linked_transaction_id = ?'); params.push(data.linkedTransactionId || null); }
    if (data.isRecurring !== undefined) { updates.push('is_recurring = ?'); params.push(data.isRecurring ? 1 : 0); }
    if (data.recurrenceRule !== undefined) {
      updates.push('recurrence_frequency = ?'); params.push(data.recurrenceRule?.frequency || null);
      updates.push('recurrence_interval = ?'); params.push(data.recurrenceRule?.interval || null);
      updates.push('recurrence_day_of_month = ?'); params.push(data.recurrenceRule?.dayOfMonth ?? null);
      updates.push('recurrence_day_of_week = ?'); params.push(data.recurrenceRule?.dayOfWeek ?? null);
      updates.push('recurrence_end_date = ?'); params.push(data.recurrenceRule?.endDate || null);
    }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId || null); }
    if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes || null); }
    if (data.payee !== undefined) { updates.push('payee = ?'); params.push(data.payee || null); }
    if (data.autoPayAccountId !== undefined) { updates.push('auto_pay_account_id = ?'); params.push(data.autoPayAccountId || null); }

    if (updates.length === 0) return existing;

    updates.push('sync_status = ?', 'updated_at = ?');
    params.push('dirty', now(), id);

    execute(`UPDATE payables SET ${updates.join(', ')} WHERE id = ?`, params);

    return payableRepo.getById(id);
  },

  // Mark as paid and create next occurrence if recurring
  markPaid: (id: string, paidFromAccountId: string, transactionId?: string): Payable | null => {
    const existing = payableRepo.getById(id);
    if (!existing || existing.isPaid) return null;

    const paidDate = today();

    execute(
      `UPDATE payables SET is_paid = 1, paid_date = ?, paid_from_account_id = ?, 
       linked_transaction_id = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?`,
      [paidDate, paidFromAccountId, transactionId || null, now(), id]
    );

    // Create next occurrence if recurring
    if (existing.isRecurring && existing.recurrenceRule) {
      const nextDueDate = getNextOccurrence(existing.dueDate, existing.recurrenceRule);
      
      if (nextDueDate) {
        // Check if next occurrence already exists
        const existingNext = queryOne<{ id: string }>(
          "SELECT id FROM payables WHERE parent_payable_id = ? AND due_date = ? AND sync_status != 'deleted'",
          [existing.parentPayableId || existing.id, nextDueDate]
        );

        if (!existingNext) {
          payableRepo.create({
            name: existing.name,
            amount: existing.amount,
            dueDate: nextDueDate,
            isRecurring: true,
            recurrenceRule: existing.recurrenceRule,
            parentPayableId: existing.parentPayableId || existing.id,
            categoryId: existing.categoryId,
            notes: existing.notes,
            payee: existing.payee,
            autoPayAccountId: existing.autoPayAccountId,
          });
        }
      }
    }

    return payableRepo.getById(id);
  },

  // Mark as unpaid
  markUnpaid: (id: string): Payable | null => {
    const existing = payableRepo.getById(id);
    if (!existing || !existing.isPaid) return null;

    execute(
      `UPDATE payables SET is_paid = 0, paid_date = NULL, paid_from_account_id = NULL,
       linked_transaction_id = NULL, sync_status = 'dirty', updated_at = ? WHERE id = ?`,
      [now(), id]
    );

    return payableRepo.getById(id);
  },

  // Delete payable (soft delete)
  delete: (id: string): boolean => {
    const existing = payableRepo.getById(id);
    if (!existing) return false;

    softDelete('payables', id);
    return true;
  },

  // Get total unpaid amount
  getTotalUnpaid: (): number => {
    const result = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE is_paid = 0 AND sync_status != 'deleted'"
    );
    return result?.total || 0;
  },

  // Get total overdue amount
  getTotalOverdue: (): number => {
    const todayStr = today();
    const result = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payables WHERE is_paid = 0 AND due_date < ? AND sync_status != 'deleted'",
      [todayStr]
    );
    return result?.total || 0;
  },

  // Get dirty records for sync
  getDirty: (): Payable[] => {
    const rows = getDirty<PayableRow>('payables');
    return rows.map(rowToPayable);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('payables', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (payable: Payable): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM payables WHERE id = ?',
      [payable.id]
    );

    if (existing) {
      if (payable.updatedAt > existing.updated_at) {
        execute(
          `UPDATE payables SET name = ?, amount = ?, due_date = ?, is_paid = ?, paid_date = ?,
           paid_from_account_id = ?, linked_transaction_id = ?, is_recurring = ?,
           recurrence_frequency = ?, recurrence_interval = ?, recurrence_day_of_month = ?,
           recurrence_day_of_week = ?, recurrence_end_date = ?, parent_payable_id = ?,
           category_id = ?, notes = ?, payee = ?, auto_pay_account_id = ?,
           sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [
            payable.name, payable.amount, payable.dueDate, payable.isPaid ? 1 : 0,
            payable.paidDate || null, payable.paidFromAccountId || null,
            payable.linkedTransactionId || null, payable.isRecurring ? 1 : 0,
            payable.recurrenceRule?.frequency || null,
            payable.recurrenceRule?.interval || null,
            payable.recurrenceRule?.dayOfMonth ?? null,
            payable.recurrenceRule?.dayOfWeek ?? null,
            payable.recurrenceRule?.endDate || null,
            payable.parentPayableId || null, payable.categoryId || null,
            payable.notes || null, payable.payee || null,
            payable.autoPayAccountId || null, payable.updatedAt, payable.id
          ]
        );
      }
    } else {
      execute(
        `INSERT INTO payables (
          id, name, amount, due_date, is_paid, paid_date, paid_from_account_id,
          linked_transaction_id, is_recurring, recurrence_frequency, recurrence_interval,
          recurrence_day_of_month, recurrence_day_of_week, recurrence_end_date,
          parent_payable_id, category_id, notes, payee, auto_pay_account_id,
          sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [
          payable.id, payable.name, payable.amount, payable.dueDate,
          payable.isPaid ? 1 : 0, payable.paidDate || null,
          payable.paidFromAccountId || null, payable.linkedTransactionId || null,
          payable.isRecurring ? 1 : 0, payable.recurrenceRule?.frequency || null,
          payable.recurrenceRule?.interval || null,
          payable.recurrenceRule?.dayOfMonth ?? null,
          payable.recurrenceRule?.dayOfWeek ?? null,
          payable.recurrenceRule?.endDate || null, payable.parentPayableId || null,
          payable.categoryId || null, payable.notes || null, payable.payee || null,
          payable.autoPayAccountId || null, payable.createdAt, payable.updatedAt
        ]
      );
    }
  },
};
