// Database connection for DriftMoney
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'driftmoney.db';
export const DB_VERSION = 5;

// Lazy-initialized database connection
let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
    // Ensure settings table exists immediately - needed for migration version tracking
    _db.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
  return _db;
}

// For testing - allows resetting the connection
export function resetDb(): void {
  if (_db) {
    _db.closeSync();
    _db = null;
  }
}
