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
    console.log(`[DB] Database is up to date (v${currentVersion})`);
    return;
  }

  console.log(
    `[DB] Running ${pendingMigrations.length} migrations (v${currentVersion} → v${DB_VERSION})`
  );

  for (const migration of pendingMigrations) {
    console.log(`[DB] Running migration v${migration.version}...`);
    migration.up();
    setSetting('db_version', migration.version.toString());
    console.log(`[DB] Migration v${migration.version} complete`);
  }

  console.log(`[DB] All migrations complete. Database is now at v${DB_VERSION}`);
}

export function initializeDatabase(): void {
  runMigrations();
}
