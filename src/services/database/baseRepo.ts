// Base repository with common CRUD operations

import { getDatabase } from './index';
import { SyncStatus } from '../../types';

export interface BaseRow {
  id: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

// SQLite bind value type
type SQLiteBindValue = string | number | null | boolean | Uint8Array;

// Helper to get current ISO timestamp
export const now = (): string => new Date().toISOString();

// Generic query helpers
export const queryAll = <T>(sql: string, params: unknown[] = []): T[] => {
  const db = getDatabase();
  return db.getAllSync(sql, params as SQLiteBindValue[]) as T[];
};

export const queryOne = <T>(sql: string, params: unknown[] = []): T | null => {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
};

export const execute = (sql: string, params: unknown[] = []): void => {
  const db = getDatabase();
  db.runSync(sql, params as SQLiteBindValue[]);
};

// Mark record as synced
export const markSynced = (table: string, id: string): void => {
  execute(
    `UPDATE ${table} SET sync_status = 'synced', updated_at = ? WHERE id = ?`,
    [now(), id]
  );
};

// Mark multiple records as synced
export const markManySynced = (table: string, ids: string[]): void => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  execute(
    `UPDATE ${table} SET sync_status = 'synced', updated_at = ? WHERE id IN (${placeholders})`,
    [now(), ...ids]
  );
};

// Soft delete (mark as deleted)
export const softDelete = (table: string, id: string): void => {
  execute(
    `UPDATE ${table} SET sync_status = 'deleted', updated_at = ? WHERE id = ?`,
    [now(), id]
  );
};

// Hard delete
export const hardDelete = (table: string, id: string): void => {
  execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
};

// Get dirty records (need syncing)
export const getDirty = <T>(table: string): T[] => {
  return queryAll<T>(
    `SELECT * FROM ${table} WHERE sync_status = 'dirty'`
  );
};

// Get deleted records (need sync deletion)
export const getDeleted = <T>(table: string): T[] => {
  return queryAll<T>(
    `SELECT * FROM ${table} WHERE sync_status = 'deleted'`
  );
};

// Purge deleted records (call after sync confirms deletion)
export const purgeDeleted = (table: string): number => {
  const deleted = queryAll<{ id: string }>(
    `SELECT id FROM ${table} WHERE sync_status = 'deleted'`
  );
  if (deleted.length === 0) return 0;
  
  execute(`DELETE FROM ${table} WHERE sync_status = 'deleted'`);
  return deleted.length;
};

// Purge specific deleted records by ID
export const purgeDeletedByIds = (table: string, ids: string[]): void => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  execute(
    `DELETE FROM ${table} WHERE id IN (${placeholders}) AND sync_status = 'deleted'`,
    ids
  );
};

// Count records
export const count = (table: string, where?: string, params: unknown[] = []): number => {
  const sql = where
    ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
    : `SELECT COUNT(*) as count FROM ${table}`;
  const result = queryOne<{ count: number }>(sql, params);
  return result?.count || 0;
};

// Check if record exists
export const exists = (table: string, id: string): boolean => {
  const result = queryOne<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ?`,
    [id]
  );
  return result !== null;
};

// Get pending sync count across all main tables
export const getPendingSyncCount = (): number => {
  const tables = ['accounts', 'transactions', 'payables', 'categories', 'budgets', 'goals', 'transfers', 'import_batches'];
  let total = 0;
  
  for (const table of tables) {
    total += count(table, "sync_status IN ('dirty', 'deleted')");
  }
  
  return total;
};
