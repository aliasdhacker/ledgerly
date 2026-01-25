// Budget repository

import { Budget, BudgetCreate, BudgetUpdate, RecurrenceFrequency } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId } from '../../utils';

interface BudgetRow {
  id: string;
  name: string;
  category_id: string | null;
  amount: number;
  period: string;
  start_date: string;
  end_date: string | null;
  rollover: number;
  rolled_amount: number;
  alert_threshold: number | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToBudget = (row: BudgetRow): Budget => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id || undefined,
  amount: row.amount,
  period: row.period as RecurrenceFrequency,
  startDate: row.start_date,
  endDate: row.end_date || undefined,
  rollover: !!row.rollover,
  rolledAmount: row.rolled_amount,
  alertThreshold: row.alert_threshold ?? undefined,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const budgetRepo = {
  // Get all budgets
  getAll: (): Budget[] => {
    const rows = queryAll<BudgetRow>(
      "SELECT * FROM budgets WHERE sync_status != 'deleted' ORDER BY name ASC"
    );
    return rows.map(rowToBudget);
  },

  // Get active budgets (not ended)
  getActive: (): Budget[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    const rows = queryAll<BudgetRow>(
      "SELECT * FROM budgets WHERE sync_status != 'deleted' AND start_date <= ? AND (end_date IS NULL OR end_date >= ?) ORDER BY name ASC",
      [todayStr, todayStr]
    );
    return rows.map(rowToBudget);
  },

  // Get by ID
  getById: (id: string): Budget | null => {
    const row = queryOne<BudgetRow>(
      "SELECT * FROM budgets WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToBudget(row) : null;
  },

  // Get by category
  getByCategory: (categoryId: string): Budget | null => {
    const todayStr = new Date().toISOString().split('T')[0];
    const row = queryOne<BudgetRow>(
      "SELECT * FROM budgets WHERE category_id = ? AND sync_status != 'deleted' AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)",
      [categoryId, todayStr, todayStr]
    );
    return row ? rowToBudget(row) : null;
  },

  // Create budget
  create: (data: BudgetCreate): Budget => {
    const id = data.id || generateId.budget();
    const timestamp = now();

    execute(
      `INSERT INTO budgets (
        id, name, category_id, amount, period, start_date, end_date,
        rollover, rolled_amount, alert_threshold, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'dirty', ?, ?)`,
      [
        id, data.name, data.categoryId || null, data.amount, data.period,
        data.startDate, data.endDate || null, data.rollover ? 1 : 0,
        data.alertThreshold ?? null, timestamp, timestamp
      ]
    );

    return budgetRepo.getById(id)!;
  },

  // Update budget
  update: (id: string, data: BudgetUpdate): Budget | null => {
    const existing = budgetRepo.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId || null); }
    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.period !== undefined) { updates.push('period = ?'); params.push(data.period); }
    if (data.startDate !== undefined) { updates.push('start_date = ?'); params.push(data.startDate); }
    if (data.endDate !== undefined) { updates.push('end_date = ?'); params.push(data.endDate || null); }
    if (data.rollover !== undefined) { updates.push('rollover = ?'); params.push(data.rollover ? 1 : 0); }
    if (data.rolledAmount !== undefined) { updates.push('rolled_amount = ?'); params.push(data.rolledAmount); }
    if (data.alertThreshold !== undefined) { updates.push('alert_threshold = ?'); params.push(data.alertThreshold ?? null); }

    if (updates.length === 0) return existing;

    updates.push('sync_status = ?', 'updated_at = ?');
    params.push('dirty', now(), id);

    execute(`UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`, params);

    return budgetRepo.getById(id);
  },

  // Update rolled amount
  updateRolledAmount: (id: string, amount: number): void => {
    execute(
      "UPDATE budgets SET rolled_amount = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [amount, now(), id]
    );
  },

  // Delete budget (soft delete)
  delete: (id: string): boolean => {
    const existing = budgetRepo.getById(id);
    if (!existing) return false;

    softDelete('budgets', id);
    return true;
  },

  // Get dirty records for sync
  getDirty: (): Budget[] => {
    const rows = getDirty<BudgetRow>('budgets');
    return rows.map(rowToBudget);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('budgets', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (budget: Budget): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM budgets WHERE id = ?',
      [budget.id]
    );

    if (existing) {
      if (budget.updatedAt > existing.updated_at) {
        execute(
          `UPDATE budgets SET name = ?, category_id = ?, amount = ?, period = ?,
           start_date = ?, end_date = ?, rollover = ?, rolled_amount = ?,
           alert_threshold = ?, sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [
            budget.name, budget.categoryId || null, budget.amount, budget.period,
            budget.startDate, budget.endDate || null, budget.rollover ? 1 : 0,
            budget.rolledAmount, budget.alertThreshold ?? null,
            budget.updatedAt, budget.id
          ]
        );
      }
    } else {
      execute(
        `INSERT INTO budgets (
          id, name, category_id, amount, period, start_date, end_date,
          rollover, rolled_amount, alert_threshold, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [
          budget.id, budget.name, budget.categoryId || null, budget.amount,
          budget.period, budget.startDate, budget.endDate || null,
          budget.rollover ? 1 : 0, budget.rolledAmount, budget.alertThreshold ?? null,
          budget.createdAt, budget.updatedAt
        ]
      );
    }
  },
};
