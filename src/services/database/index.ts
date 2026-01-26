// Database initialization and migration system for DriftMoney

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'driftmoney_v2.db';
const SCHEMA_VERSION = 2;

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
};

// Get current schema version
const getSchemaVersion = (): number => {
  const db = getDatabase();
  try {
    const result = db.getAllSync(
      "SELECT value FROM app_settings WHERE key = 'schema_version'"
    ) as { value: string }[];
    return result.length > 0 ? parseInt(result[0].value, 10) : 0;
  } catch {
    return 0;
  }
};

// Set schema version
const setSchemaVersion = (version: number): void => {
  const db = getDatabase();
  db.runSync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('schema_version', ?)",
    [version.toString()]
  );
};

// Schema creation SQL
const SCHEMA_V1 = `
  -- App settings table (for schema version tracking)
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  -- Categories
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_category_id TEXT REFERENCES categories(id),
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Accounts (bank, credit, loan)
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'credit', 'loan')),
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    institution_name TEXT,
    account_number_last4 TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    reconciled_balance REAL,
    reconciled_date TEXT,
    credit_limit REAL,
    minimum_payment REAL,
    payment_due_day INTEGER,
    apr REAL,
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Transactions
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    notes TEXT,
    linked_payable_id TEXT REFERENCES payables(id),
    transfer_id TEXT REFERENCES transfers(id),
    is_split INTEGER NOT NULL DEFAULT 0,
    parent_transaction_id TEXT REFERENCES transactions(id),
    import_batch_id TEXT REFERENCES import_batches(id),
    external_id TEXT,
    is_reconciled INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Transaction splits
  CREATE TABLE IF NOT EXISTS transaction_splits (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id),
    amount REAL NOT NULL,
    notes TEXT
  );

  -- Transfers
  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY NOT NULL,
    from_account_id TEXT NOT NULL REFERENCES accounts(id),
    to_account_id TEXT NOT NULL REFERENCES accounts(id),
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    from_transaction_id TEXT NOT NULL REFERENCES transactions(id),
    to_transaction_id TEXT NOT NULL REFERENCES transactions(id),
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Payables (bills - recurring and one-off)
  CREATE TABLE IF NOT EXISTS payables (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    paid_date TEXT,
    paid_from_account_id TEXT REFERENCES accounts(id),
    linked_transaction_id TEXT REFERENCES transactions(id),
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_frequency TEXT,
    recurrence_interval INTEGER,
    recurrence_day_of_month INTEGER,
    recurrence_day_of_week INTEGER,
    recurrence_end_date TEXT,
    parent_payable_id TEXT REFERENCES payables(id),
    category_id TEXT REFERENCES categories(id),
    notes TEXT,
    payee TEXT,
    auto_pay_account_id TEXT REFERENCES accounts(id),
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Budgets
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    amount REAL NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    rollover INTEGER NOT NULL DEFAULT 0,
    rolled_amount REAL NOT NULL DEFAULT 0,
    alert_threshold INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Goals
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    target_date TEXT,
    linked_account_id TEXT REFERENCES accounts(id),
    icon TEXT,
    color TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_date TEXT,
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Import batches
  CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    filename TEXT NOT NULL,
    import_date TEXT NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    new_transactions INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'dirty',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);
  CREATE INDEX IF NOT EXISTS idx_payables_parent ON payables(parent_payable_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
  CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
  CREATE INDEX IF NOT EXISTS idx_categories_system ON categories(is_system);
`;

// Migration V2: Add unique constraint on external_id per account
const MIGRATION_V2 = `
  -- Drop old non-unique index
  DROP INDEX IF EXISTS idx_transactions_external;
  
  -- Create unique index for deduplication (only where external_id is not null)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_unique 
    ON transactions(account_id, external_id) 
    WHERE external_id IS NOT NULL;
`;

// Run migration
const runMigration = (version: number): void => {
  const db = getDatabase();

  switch (version) {
    case 1:
      // Split and execute each statement
      const statements = SCHEMA_V1
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        db.execSync(statement + ';');
      }
      break;
    
    case 2:
      // Add unique constraint for external_id deduplication
      const v2Statements = MIGRATION_V2
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of v2Statements) {
        db.execSync(statement + ';');
      }
      break;
  }
};

// Initialize database with migrations
export const initDatabase = (): void => {
  const db = getDatabase();
  
  // Ensure app_settings exists for version tracking
  db.execSync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const currentVersion = getSchemaVersion();

  // Run pending migrations
  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    console.log(`Running migration to version ${v}...`);
    runMigration(v);
    setSchemaVersion(v);
    console.log(`Migration to version ${v} complete.`);
  }

  console.log(`Database initialized at version ${SCHEMA_VERSION}`);
};

// Reset database (for development/testing)
export const resetDatabase = (): void => {
  const db = getDatabase();
  
  // Drop all tables in reverse dependency order
  const tables = [
    'transaction_splits',
    'transfers',
    'transactions',
    'import_batches',
    'payables',
    'budgets',
    'goals',
    'accounts',
    'categories',
    'app_settings',
  ];

  for (const table of tables) {
    db.execSync(`DROP TABLE IF EXISTS ${table}`);
  }

  // Reinitialize
  initDatabase();
};

// Check if database is initialized
export const isDatabaseInitialized = (): boolean => {
  return getSchemaVersion() >= SCHEMA_VERSION;
};

// Get current database version (for debugging)
export const getDatabaseVersion = (): number => {
  return getSchemaVersion();
};
