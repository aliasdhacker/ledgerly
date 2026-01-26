// Database migrations for DriftMoney
import { getDb, DB_VERSION } from './connection';
import { SCHEMA_V2 } from './schema';
import { getSetting, setSetting } from './helpers';

type Migration = {
  version: number;
  up: () => void;
};

const migrations: Migration[] = [
  {
    version: 1,
    up: () => {
      // Initial schema - creates settings table and v1 tables
      // This was the original Ledgerly schema with bills, transactions, debts
      const db = getDb();
      db.execSync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    up: () => {
      // V2 schema - new account-centric architecture
      const db = getDb();
      db.execSync(SCHEMA_V2);
    },
  },
  {
    version: 3,
    up: () => {
      // Add loan account support - must recreate table to modify CHECK constraint
      const db = getDb();
      db.execSync(`
        -- Create new accounts table with loan support
        CREATE TABLE accounts_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('bank', 'credit', 'loan')),
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
          loan_principal REAL,
          loan_interest_rate REAL,
          loan_monthly_payment REAL,
          loan_start_date TEXT,
          loan_end_date TEXT,
          loan_payment_frequency TEXT,
          loan_payment_day INTEGER,
          linked_payable_id TEXT REFERENCES payables(id),
          sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Copy existing data
        INSERT INTO accounts_new (
          id, name, type, balance, currency, institution_name, account_number_last4,
          is_active, sort_order, reconciled_balance, reconciled_date,
          credit_limit, minimum_payment, payment_due_day, apr,
          sync_status, created_at, updated_at
        )
        SELECT
          id, name, type, balance, currency, institution_name, account_number_last4,
          is_active, sort_order, reconciled_balance, reconciled_date,
          credit_limit, minimum_payment, payment_due_day, apr,
          sync_status, created_at, updated_at
        FROM accounts;

        -- Drop old table and rename new one
        DROP TABLE accounts;
        ALTER TABLE accounts_new RENAME TO accounts;

        -- Recreate indexes
        CREATE INDEX IF NOT EXISTS idx_accounts_sync_status ON accounts(sync_status);
      `);
    },
  },
  {
    version: 4,
    up: () => {
      // Fix for databases that ran incomplete v3 migration
      // Check if loan columns exist, if not recreate table properly
      const db = getDb();

      // Check if we need to fix the table (loan_principal column missing means v3 was incomplete)
      const tableInfo = db.getAllSync("PRAGMA table_info(accounts)") as { name: string }[];
      const hasLoanPrincipal = tableInfo.some(col => col.name === 'loan_principal');

      if (!hasLoanPrincipal) {
        // V3 migration was incomplete, recreate table with all columns and correct CHECK
        db.execSync(`
          CREATE TABLE accounts_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('bank', 'credit', 'loan')),
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
            loan_principal REAL,
            loan_interest_rate REAL,
            loan_monthly_payment REAL,
            loan_start_date TEXT,
            loan_end_date TEXT,
            loan_payment_frequency TEXT,
            loan_payment_day INTEGER,
            linked_payable_id TEXT REFERENCES payables(id),
            sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          INSERT INTO accounts_new (
            id, name, type, balance, currency, institution_name, account_number_last4,
            is_active, sort_order, reconciled_balance, reconciled_date,
            credit_limit, minimum_payment, payment_due_day, apr,
            sync_status, created_at, updated_at
          )
          SELECT
            id, name, type, balance, currency, institution_name, account_number_last4,
            is_active, sort_order, reconciled_balance, reconciled_date,
            credit_limit, minimum_payment, payment_due_day, apr,
            sync_status, created_at, updated_at
          FROM accounts;

          DROP TABLE accounts;
          ALTER TABLE accounts_new RENAME TO accounts;
          CREATE INDEX IF NOT EXISTS idx_accounts_sync_status ON accounts(sync_status);
        `);
      }
    },
  },
  {
    version: 5,
    up: () => {
      // Force recreate accounts table to fix CHECK constraint
      const db = getDb();
      db.execSync(`
        CREATE TABLE accounts_v5 (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('bank', 'credit', 'loan')),
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
          loan_principal REAL,
          loan_interest_rate REAL,
          loan_monthly_payment REAL,
          loan_start_date TEXT,
          loan_end_date TEXT,
          loan_payment_frequency TEXT,
          loan_payment_day INTEGER,
          linked_payable_id TEXT,
          sync_status TEXT NOT NULL DEFAULT 'dirty' CHECK(sync_status IN ('synced', 'dirty', 'deleted')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO accounts_v5
        SELECT
          id, name, type, balance, currency, institution_name, account_number_last4,
          is_active, sort_order, reconciled_balance, reconciled_date,
          credit_limit, minimum_payment, payment_due_day, apr,
          loan_principal, loan_interest_rate, loan_monthly_payment,
          loan_start_date, loan_end_date, loan_payment_frequency, loan_payment_day,
          linked_payable_id, sync_status, created_at, updated_at
        FROM accounts;

        DROP TABLE accounts;
        ALTER TABLE accounts_v5 RENAME TO accounts;
        CREATE INDEX IF NOT EXISTS idx_accounts_sync_status ON accounts(sync_status);
      `);
    },
  },
];

export function getCurrentVersion(): number {
  try {
    const versionStr = getSetting('db_version');
    return versionStr ? parseInt(versionStr, 10) : 0;
  } catch {
    // Settings table doesn't exist yet
    return 0;
  }
}

export function runMigrations(): void {
  const currentVersion = getCurrentVersion();
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    if (__DEV__) console.log(`[DB] Database is up to date (v${currentVersion})`);
    return;
  }

  if (__DEV__) {
    console.log(
      `[DB] Running ${pendingMigrations.length} migrations (v${currentVersion} → v${DB_VERSION})`
    );
  }

  for (const migration of pendingMigrations) {
    if (__DEV__) console.log(`[DB] Running migration v${migration.version}...`);
    migration.up();
    setSetting('db_version', migration.version.toString());
    if (__DEV__) console.log(`[DB] Migration v${migration.version} complete`);
  }

  if (__DEV__) console.log(`[DB] All migrations complete. Database is now at v${DB_VERSION}`);
}

export function initializeDatabase(): void {
  runMigrations();
}
