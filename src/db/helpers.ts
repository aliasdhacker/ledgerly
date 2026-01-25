// Database helpers for DriftMoney
import { getDb } from './connection';
import type { SyncStatus } from '../types/common';

// Convert snake_case to camelCase
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert camelCase to snake_case
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Convert a database row (snake_case) to a TypeScript object (camelCase)
export function rowToEntity<T>(row: Record<string, unknown>): T {
  const entity: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = snakeToCamel(key);
    // Convert SQLite integers to booleans where appropriate
    if (typeof value === 'number' && (camelKey.startsWith('is') || camelKey === 'rollover')) {
      entity[camelKey] = value === 1;
    } else {
      entity[camelKey] = value;
    }
  }
  return entity as T;
}

// Convert a TypeScript object (camelCase) to database columns (snake_case)
export function entityToRow<T extends object>(
  entity: T,
  excludeKeys: string[] = []
): Record<string, SQLiteBindValue> {
  const row: Record<string, SQLiteBindValue> = {};
  for (const [key, value] of Object.entries(entity)) {
    if (excludeKeys.includes(key)) continue;
    const snakeKey = camelToSnake(key);
    // Convert booleans to SQLite integers
    if (typeof value === 'boolean') {
      row[snakeKey] = value ? 1 : 0;
    } else if (value !== undefined && value !== null) {
      row[snakeKey] = value as SQLiteBindValue;
    } else if (value === null) {
      row[snakeKey] = null;
    }
  }
  return row;
}

// Get current ISO timestamp
export function now(): string {
  return new Date().toISOString();
}

// Safely parse JSON with optional validation
// Returns defaultValue on parse error or validation failure
// Validator should match the project's ValidationResult interface (success: boolean, errors: Record<string, string>)
export function safeJsonParse<T>(
  json: string | null | undefined,
  defaultValue: T,
  validator?: (data: unknown) => { success: boolean; errors?: Record<string, string> }
): T {
  if (!json) return defaultValue;

  try {
    const parsed = JSON.parse(json);

    if (validator) {
      const result = validator(parsed);
      if (!result.success) {
        console.warn('JSON validation failed:', result.errors);
        return defaultValue;
      }
    }

    return parsed as T;
  } catch (error) {
    console.warn('JSON parse failed:', error);
    return defaultValue;
  }
}

// Build INSERT statement dynamically
export function buildInsert(
  table: string,
  data: Record<string, SQLiteBindValue>
): { sql: string; params: SQLiteBindValue[] } {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const params = Object.values(data);
  return { sql, params };
}

// Build UPDATE statement dynamically
export function buildUpdate(
  table: string,
  data: Record<string, SQLiteBindValue>,
  whereClause: string,
  whereParams: SQLiteBindValue[]
): { sql: string; params: SQLiteBindValue[] } {
  const setClauses = Object.keys(data)
    .map((col) => `${col} = ?`)
    .join(', ');
  const sql = `UPDATE ${table} SET ${setClauses} WHERE ${whereClause}`;
  const params = [...Object.values(data), ...whereParams];
  return { sql, params };
}

// SQLite bind value type
type SQLiteBindValue = string | number | null | boolean | Uint8Array;

// Result from execute() with affected row count and last insert ID
export interface ExecuteResult {
  changes: number;
  lastInsertRowId: number;
}

// Execute a query and return all rows converted to entities
export function queryAll<T>(sql: string, params: SQLiteBindValue[] = []): T[] {
  const db = getDb();
  const rows = db.getAllSync(sql, params) as Record<string, unknown>[];
  return rows.map((row) => rowToEntity<T>(row));
}

// Execute a query and return a single row converted to entity
export function queryOne<T>(sql: string, params: SQLiteBindValue[] = []): T | null {
  const db = getDb();
  const row = db.getFirstSync(sql, params) as Record<string, unknown> | null;
  return row ? rowToEntity<T>(row) : null;
}

// Execute a statement (INSERT, UPDATE, DELETE) and return result info
export function execute(sql: string, params: SQLiteBindValue[] = []): ExecuteResult {
  const db = getDb();
  const result = db.runSync(sql, params);
  return {
    changes: result.changes,
    lastInsertRowId: result.lastInsertRowId,
  };
}

// Execute operations within a transaction - rolls back on error
export function withTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.runSync('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.runSync('COMMIT');
    return result;
  } catch (error) {
    db.runSync('ROLLBACK');
    throw error;
  }
}

// Soft delete - marks record as deleted instead of removing
export function softDelete(table: string, id: string): void {
  execute(
    `UPDATE ${table} SET sync_status = 'deleted', updated_at = ? WHERE id = ?`,
    [now(), id]
  );
}

// Hard delete - actually removes the record
export function hardDelete(table: string, id: string): void {
  execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

// Find records by sync status
export function findBySyncStatus<T>(
  table: string,
  status: SyncStatus
): T[] {
  return queryAll<T>(`SELECT * FROM ${table} WHERE sync_status = ?`, [status]);
}

// Mark records as synced
export function markSynced(table: string, ids: string[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  execute(
    `UPDATE ${table} SET sync_status = 'synced', updated_at = ? WHERE id IN (${placeholders})`,
    [now(), ...ids]
  );
}

// Get or set a setting
export function getSetting(key: string): string | null {
  const result = queryOne<{ key: string; value: string }>(
    'SELECT * FROM settings WHERE key = ?',
    [key]
  );
  return result?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// Delete all user data (keeps schema intact)
export function deleteAllData(): void {
  const db = getDb();
  db.execSync(`
    DELETE FROM transaction_splits;
    DELETE FROM transfers;
    DELETE FROM transactions;
    DELETE FROM payables;
    DELETE FROM budgets;
    DELETE FROM goals;
    DELETE FROM import_batches;
    DELETE FROM categories;
    DELETE FROM accounts;
    DELETE FROM settings WHERE key != 'db_version';
  `);
}
