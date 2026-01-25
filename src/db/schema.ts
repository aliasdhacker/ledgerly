// Database schema for DriftMoney v2

export const SCHEMA_V2 = `
-- Settings table (for app metadata)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Accounts (bank accounts, credit cards)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank', 'credit')),
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
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_category_id TEXT REFERENCES categories(id),
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  notes TEXT,
  linked_payable_id TEXT,
  transfer_id TEXT,
  is_split INTEGER NOT NULL DEFAULT 0,
  parent_transaction_id TEXT REFERENCES transactions(id),
  import_batch_id TEXT,
  external_id TEXT,
  is_reconciled INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Transaction splits (for split transactions)
CREATE TABLE IF NOT EXISTS transaction_splits (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount REAL NOT NULL,
  notes TEXT
);

-- Transfers (links two transactions)
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT NOT NULL REFERENCES accounts(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  from_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  to_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Payables (bills - recurring and one-off)
CREATE TABLE IF NOT EXISTS payables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_date TEXT,
  paid_from_account_id TEXT REFERENCES accounts(id),
  linked_transaction_id TEXT REFERENCES transactions(id),
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_rule_json TEXT,
  parent_payable_id TEXT REFERENCES payables(id),
  category_id TEXT REFERENCES categories(id),
  notes TEXT,
  payee TEXT,
  auto_pay_account_id TEXT REFERENCES accounts(id),
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  amount REAL NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  rollover INTEGER NOT NULL DEFAULT 0,
  rolled_amount REAL NOT NULL DEFAULT 0,
  alert_threshold REAL,
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Goals (savings goals)
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  linked_account_id TEXT REFERENCES accounts(id),
  icon TEXT,
  color TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_date TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Import batches (OCR imports)
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  filename TEXT NOT NULL,
  import_date TEXT NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  new_transactions INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sync_status ON transactions(sync_status);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);
CREATE INDEX IF NOT EXISTS idx_payables_is_paid ON payables(is_paid);
CREATE INDEX IF NOT EXISTS idx_payables_sync_status ON payables(sync_status);
CREATE INDEX IF NOT EXISTS idx_accounts_sync_status ON accounts(sync_status);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_goals_linked_account ON goals(linked_account_id);
`;

export const DROP_ALL_TABLES = `
DROP TABLE IF EXISTS transaction_splits;
DROP TABLE IF EXISTS transfers;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS payables;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS import_batches;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS settings;
`;
