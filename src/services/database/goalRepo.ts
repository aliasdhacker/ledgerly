// Goal repository

import { Goal, GoalCreate, GoalUpdate } from '../../types';
import { queryAll, queryOne, execute, now, softDelete, getDirty, markManySynced } from './baseRepo';
import { generateId, today } from '../../utils';

interface GoalRow {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  linked_account_id: string | null;
  icon: string | null;
  color: string | null;
  is_completed: number;
  completed_date: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

const rowToGoal = (row: GoalRow): Goal => ({
  id: row.id,
  name: row.name,
  targetAmount: row.target_amount,
  currentAmount: row.current_amount,
  targetDate: row.target_date || undefined,
  linkedAccountId: row.linked_account_id || undefined,
  icon: row.icon || undefined,
  color: row.color || undefined,
  isCompleted: !!row.is_completed,
  completedDate: row.completed_date || undefined,
  syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const goalRepo = {
  // Get all goals
  getAll: (): Goal[] => {
    const rows = queryAll<GoalRow>(
      "SELECT * FROM goals WHERE sync_status != 'deleted' ORDER BY is_completed ASC, target_date ASC"
    );
    return rows.map(rowToGoal);
  },

  // Get active goals (not completed)
  getActive: (): Goal[] => {
    const rows = queryAll<GoalRow>(
      "SELECT * FROM goals WHERE is_completed = 0 AND sync_status != 'deleted' ORDER BY target_date ASC"
    );
    return rows.map(rowToGoal);
  },

  // Get completed goals
  getCompleted: (): Goal[] => {
    const rows = queryAll<GoalRow>(
      "SELECT * FROM goals WHERE is_completed = 1 AND sync_status != 'deleted' ORDER BY completed_date DESC"
    );
    return rows.map(rowToGoal);
  },

  // Get by ID
  getById: (id: string): Goal | null => {
    const row = queryOne<GoalRow>(
      "SELECT * FROM goals WHERE id = ? AND sync_status != 'deleted'",
      [id]
    );
    return row ? rowToGoal(row) : null;
  },

  // Create goal
  create: (data: GoalCreate): Goal => {
    const id = data.id || generateId.goal();
    const timestamp = now();

    execute(
      `INSERT INTO goals (
        id, name, target_amount, current_amount, target_date, linked_account_id,
        icon, color, is_completed, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'dirty', ?, ?)`,
      [
        id, data.name, data.targetAmount, data.currentAmount || 0,
        data.targetDate || null, data.linkedAccountId || null,
        data.icon || null, data.color || null, timestamp, timestamp
      ]
    );

    return goalRepo.getById(id)!;
  },

  // Update goal
  update: (id: string, data: GoalUpdate): Goal | null => {
    const existing = goalRepo.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.targetAmount !== undefined) { updates.push('target_amount = ?'); params.push(data.targetAmount); }
    if (data.currentAmount !== undefined) { updates.push('current_amount = ?'); params.push(data.currentAmount); }
    if (data.targetDate !== undefined) { updates.push('target_date = ?'); params.push(data.targetDate || null); }
    if (data.linkedAccountId !== undefined) { updates.push('linked_account_id = ?'); params.push(data.linkedAccountId || null); }
    if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon || null); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color || null); }
    if (data.isCompleted !== undefined) { updates.push('is_completed = ?'); params.push(data.isCompleted ? 1 : 0); }
    if (data.completedDate !== undefined) { updates.push('completed_date = ?'); params.push(data.completedDate || null); }

    if (updates.length === 0) return existing;

    updates.push('sync_status = ?', 'updated_at = ?');
    params.push('dirty', now(), id);

    execute(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`, params);

    return goalRepo.getById(id);
  },

  // Add to current amount
  addAmount: (id: string, amount: number): Goal | null => {
    const existing = goalRepo.getById(id);
    if (!existing || existing.isCompleted) return null;

    const newAmount = existing.currentAmount + amount;
    
    execute(
      "UPDATE goals SET current_amount = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [newAmount, now(), id]
    );

    // Check if goal is now complete
    if (newAmount >= existing.targetAmount) {
      goalRepo.markCompleted(id);
    }

    return goalRepo.getById(id);
  },

  // Mark as completed
  markCompleted: (id: string): Goal | null => {
    const existing = goalRepo.getById(id);
    if (!existing || existing.isCompleted) return null;

    execute(
      "UPDATE goals SET is_completed = 1, completed_date = ?, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [today(), now(), id]
    );

    return goalRepo.getById(id);
  },

  // Mark as not completed
  markNotCompleted: (id: string): Goal | null => {
    const existing = goalRepo.getById(id);
    if (!existing || !existing.isCompleted) return null;

    execute(
      "UPDATE goals SET is_completed = 0, completed_date = NULL, sync_status = 'dirty', updated_at = ? WHERE id = ?",
      [now(), id]
    );

    return goalRepo.getById(id);
  },

  // Delete goal (soft delete)
  delete: (id: string): boolean => {
    const existing = goalRepo.getById(id);
    if (!existing) return false;

    softDelete('goals', id);
    return true;
  },

  // Get total target amount for active goals
  getTotalTarget: (): number => {
    const result = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(target_amount), 0) as total FROM goals WHERE is_completed = 0 AND sync_status != 'deleted'"
    );
    return result?.total || 0;
  },

  // Get total current amount for active goals
  getTotalCurrent: (): number => {
    const result = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(current_amount), 0) as total FROM goals WHERE is_completed = 0 AND sync_status != 'deleted'"
    );
    return result?.total || 0;
  },

  // Get dirty records for sync
  getDirty: (): Goal[] => {
    const rows = getDirty<GoalRow>('goals');
    return rows.map(rowToGoal);
  },

  // Mark as synced
  markSynced: (ids: string[]): void => {
    markManySynced('goals', ids);
  },

  // Upsert from cloud
  upsertFromCloud: (goal: Goal): void => {
    const existing = queryOne<{ updated_at: string }>(
      'SELECT updated_at FROM goals WHERE id = ?',
      [goal.id]
    );

    if (existing) {
      if (goal.updatedAt > existing.updated_at) {
        execute(
          `UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, target_date = ?,
           linked_account_id = ?, icon = ?, color = ?, is_completed = ?, completed_date = ?,
           sync_status = 'synced', updated_at = ? WHERE id = ?`,
          [
            goal.name, goal.targetAmount, goal.currentAmount, goal.targetDate || null,
            goal.linkedAccountId || null, goal.icon || null, goal.color || null,
            goal.isCompleted ? 1 : 0, goal.completedDate || null,
            goal.updatedAt, goal.id
          ]
        );
      }
    } else {
      execute(
        `INSERT INTO goals (
          id, name, target_amount, current_amount, target_date, linked_account_id,
          icon, color, is_completed, completed_date, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
        [
          goal.id, goal.name, goal.targetAmount, goal.currentAmount,
          goal.targetDate || null, goal.linkedAccountId || null,
          goal.icon || null, goal.color || null, goal.isCompleted ? 1 : 0,
          goal.completedDate || null, goal.createdAt, goal.updatedAt
        ]
      );
    }
  },
};
