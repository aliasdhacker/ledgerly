// Goal repository for DriftMoney (savings goals)
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
import type { Goal, GoalCreate, GoalUpdate } from '../types/goal';
import type { SyncStatus } from '../types/common';

export interface FindGoalsOptions {
  isCompleted?: boolean;
  linkedAccountId?: string;
}

export const GoalRepository = {
  findById(id: string): Goal | null {
    return queryOne<Goal>(
      'SELECT * FROM goals WHERE id = ? AND sync_status != ?',
      [id, 'deleted']
    );
  },

  findAll(options: FindGoalsOptions = {}): Goal[] {
    let sql = 'SELECT * FROM goals WHERE sync_status != ?';
    const params: (string | number | null)[] = ['deleted'];

    if (options.isCompleted !== undefined) {
      sql += ' AND is_completed = ?';
      params.push(options.isCompleted ? 1 : 0);
    }

    if (options.linkedAccountId) {
      sql += ' AND linked_account_id = ?';
      params.push(options.linkedAccountId);
    }

    sql += ' ORDER BY is_completed ASC, target_date ASC, name ASC';

    return queryAll<Goal>(sql, params);
  },

  findByAccount(linkedAccountId: string): Goal[] {
    return this.findAll({ linkedAccountId });
  },

  findActive(): Goal[] {
    return this.findAll({ isCompleted: false });
  },

  findCompleted(): Goal[] {
    return this.findAll({ isCompleted: true });
  },

  create(data: GoalCreate): Goal {
    const timestamp = now();
    const goal: Goal = {
      id: data.id || generateId.goal(),
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      targetDate: data.targetDate,
      linkedAccountId: data.linkedAccountId,
      icon: data.icon,
      color: data.color,
      isCompleted: false,
      syncStatus: 'dirty',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const row = entityToRow(goal);
    const { sql, params } = buildInsert('goals', row);
    execute(sql, params);

    return goal;
  },

  update(id: string, data: GoalUpdate): Goal | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const timestamp = now();
    const updateData = {
      ...data,
      syncStatus: 'dirty' as SyncStatus,
      updatedAt: timestamp,
    };

    const row = entityToRow(updateData, ['id', 'createdAt']);
    const { sql, params } = buildUpdate('goals', row, 'id = ?', [id]);
    execute(sql, params);

    return this.findById(id);
  },

  updateAmount(id: string, amount: number): Goal | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const isNowCompleted = amount >= existing.targetAmount;
    const completedDate = isNowCompleted && !existing.isCompleted
      ? new Date().toISOString().split('T')[0]
      : existing.completedDate;

    return this.update(id, {
      currentAmount: amount,
      isCompleted: isNowCompleted,
      completedDate,
    });
  },

  addToAmount(id: string, addition: number): Goal | null {
    const existing = this.findById(id);
    if (!existing) return null;

    return this.updateAmount(id, existing.currentAmount + addition);
  },

  markCompleted(id: string): Goal | null {
    return this.update(id, {
      isCompleted: true,
      completedDate: new Date().toISOString().split('T')[0],
    });
  },

  delete(id: string): void {
    softDelete('goals', id);
  },

  // Sync helpers
  findDirty(): Goal[] {
    return findBySyncStatus<Goal>('goals', 'dirty');
  },

  markSynced(ids: string[]): void {
    markSynced('goals', ids);
  },

  upsertFromCloud(goal: Goal & { updatedAt: string }): void {
    const existing = queryOne<Goal & { updatedAt: string }>(
      'SELECT * FROM goals WHERE id = ?',
      [goal.id]
    );

    if (existing) {
      if (goal.updatedAt > existing.updatedAt) {
        const row = entityToRow(
          { ...goal, syncStatus: 'synced' as SyncStatus },
          ['id', 'createdAt']
        );
        const { sql, params } = buildUpdate('goals', row, 'id = ?', [goal.id]);
        execute(sql, params);
      }
    } else {
      const row = entityToRow({ ...goal, syncStatus: 'synced' as SyncStatus });
      const { sql, params } = buildInsert('goals', row);
      execute(sql, params);
    }
  },

  // Analytics helpers
  getTotalSaved(): number {
    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(current_amount), 0) as total FROM goals WHERE sync_status != ?',
      ['deleted']
    );
    return result?.total ?? 0;
  },

  getTotalTarget(): number {
    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(target_amount), 0) as total FROM goals WHERE sync_status != ? AND is_completed = 0',
      ['deleted']
    );
    return result?.total ?? 0;
  },
};
