// Budget repository for DriftMoney
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
import type { Budget, BudgetCreate, BudgetUpdate } from '../types/budget';
import type { RecurrenceFrequency, SyncStatus } from '../types/common';

export interface FindBudgetsOptions {
  categoryId?: string;
  period?: RecurrenceFrequency;
  activeOnly?: boolean;
}

export const BudgetRepository = {
  findById(id: string): Budget | null {
    return queryOne<Budget>(
      'SELECT * FROM budgets WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(options: FindBudgetsOptions = {}): Budget[] {
    let sql = 'SELECT * FROM budgets WHERE sync_status != ?';
    const params: (string | number | null)[] = ['deleted'];

    if (options.categoryId) {
      sql += ' AND category_id = ?';
      params.push(options.categoryId);
    }

    if (options.period) {
      sql += ' AND period = ?';
      params.push(options.period);
    }

    if (options.activeOnly) {
      const today = new Date().toISOString().split('T')[0];
      sql += ' AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)';
      params.push(today, today);
    }

    sql += ' ORDER BY name ASC';

    return queryAll<Budget>(sql, params);
  },

  findByCategory(categoryId: string): Budget[] {
    return this.findAll({ categoryId });
  },

  findByPeriod(period: RecurrenceFrequency): Budget[] {
    return this.findAll({ period });
  },

  findActive(): Budget[] {
    return this.findAll({ activeOnly: true });
  },

  findOverallBudget(): Budget | null {
    return queryOne<Budget>(
      'SELECT * FROM budgets WHERE category_id IS NULL AND sync_status != ?',
      ['deleted']
    );
  },

  create(data: BudgetCreate): Budget {
    const timestamp = now();
    const budget: Budget = {
      id: data.id || generateId.budget(),
      name: data.name,
      categoryId: data.categoryId,
      amount: data.amount,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      rollover: data.rollover,
      rolledAmount: 0,
      alertThreshold: data.alertThreshold,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = entityToRow(budget);
    const { sql, params } = buildInsert('budgets', row);
    execute(sql, params);

    return budget;
  },

  update(id: string, data: BudgetUpdate): Budget | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      ...data,
      syncStatus: 'dirty' as SyncStatus,
      updatedAt: timestamp,
    };

    const row = entityToRow(updateData, ['id', 'createdAt']);
    const { sql, params } = buildUpdate('budgets', row, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  updateRolledAmount(id: string, amount: number): Budget | null {
    return this.update(id, { rolledAmount: amount });
  },

  delete(id: string): void {
    softDelete('budgets', id);
  },

  // Sync helpers
  findDirty(): Budget[] {
    return findBySyncStatus<Budget>('budgets', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('budgets', ids);
  },

  upsertFromCloud(budget: Budget & { updatedAt: string }): void {
    const existing = queryOne<Budget & { updatedAt: string }>(
      'SELECT * FROM budgets WHERE id = ?',
      [budget.id]
    );

    if (existing) {
      if (budget.updatedAt > existing.updatedAt) {
        const row = entityToRow(
          { ...budget, syncStatus: 'synced' as SyncStatus },
          ['id', 'createdAt']
        );
        const { sql, params } = buildUpdate('budgets', row, 'id = ?', [budget.id]);
        execute(sql, params);
      }
    } else {
      const row = entityToRow({ ...budget, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('budgets', row);
      execute(sql, params);
    }
  },
};
