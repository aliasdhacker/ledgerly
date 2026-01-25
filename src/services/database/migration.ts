// Data migration from old DriftMoney schema to new schema
// Run ONCE when upgrading from v1 to v2

import * as SQLite from 'expo-sqlite';
import { getDatabase, initDatabase } from './index';
import { categoryRepo } from './categoryRepo';
import { accountRepo } from './accountRepo';
import { transactionRepo } from './transactionRepo';
import { payableRepo } from './payableRepo';
import { generateId, today } from '../../utils';
import { TransactionType, RecurrenceFrequency } from '../../types';

const OLD_DB_NAME = 'driftmoney.db';

interface OldBill {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  is_paid: number;
  bill_month: string;
  sync_status: string;
}

interface OldTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: string | null;
  related_bill_id: string | null;
}

interface OldDebt {
  id: string;
  company: string;
  balance: number;
  last_updated: string;
  notes: string | null;
  is_recurring: number;
  payment_due_day: number | null;
  payment_frequency: string | null;
  minimum_payment: number | null;
}

export const migrateFromOldSchema = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if old database exists
    let oldDb: SQLite.SQLiteDatabase;
    try {
      oldDb = SQLite.openDatabaseSync(OLD_DB_NAME);
    } catch {
      return { success: true, message: 'No old database found, nothing to migrate' };
    }

    // Check if old tables exist
    const tables = oldDb.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('bills', 'transactions', 'debts')"
    ) as { name: string }[];

    if (tables.length === 0) {
      return { success: true, message: 'No old tables found, nothing to migrate' };
    }

    // Initialize new database
    initDatabase();
    categoryRepo.initDefaults();

    console.log('Starting migration from old schema...');

    // 1. Create a default checking account for existing transactions
    const defaultAccount = accountRepo.create({
      name: 'Primary Checking',
      type: 'bank',
      balance: 0,
      currency: 'USD',
      isActive: true,
      sortOrder: 0,
    });

    // 2. Migrate debts to credit accounts
    const oldDebts = oldDb.getAllSync('SELECT * FROM debts') as OldDebt[];
    const debtToAccountMap = new Map<string, string>();

    for (const debt of oldDebts) {
      const account = accountRepo.create({
        name: debt.company,
        type: 'credit',
        balance: debt.balance,
        currency: 'USD',
        isActive: true,
        sortOrder: 0,
        minimumPayment: debt.minimum_payment ?? undefined,
        paymentDueDay: debt.payment_due_day ?? undefined,
      });
      debtToAccountMap.set(debt.id, account.id);
    }

    console.log(`Migrated ${oldDebts.length} debts to credit accounts`);

    // 3. Migrate transactions
    const oldTransactions = oldDb.getAllSync(
      'SELECT * FROM transactions ORDER BY date ASC'
    ) as OldTransaction[];

    // Calculate running balance from transactions
    let runningBalance = 0;

    for (const txn of oldTransactions) {
      // Map old type to new type
      let newType: TransactionType;
      let amount = txn.amount;

      switch (txn.type) {
        case 'income':
        case 'credit':
          newType = TransactionType.CREDIT;
          runningBalance += amount;
          break;
        case 'expense':
        case 'bill_paid':
        default:
          newType = TransactionType.DEBIT;
          runningBalance -= amount;
          break;
      }

      // Skip the automatic balance adjustment in transactionRepo.create
      // by inserting directly
      const db = getDatabase();
      const timestamp = new Date().toISOString();

      db.runSync(
        `INSERT INTO transactions (
          id, account_id, type, amount, description, date, category_id, notes,
          is_split, is_reconciled, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'dirty', ?, ?)`,
        [
          txn.id, defaultAccount.id, newType, amount, txn.description, txn.date,
          null, null, timestamp, timestamp
        ]
      );
    }

    // Update default account balance
    accountRepo.updateBalance(defaultAccount.id, runningBalance);

    console.log(`Migrated ${oldTransactions.length} transactions, running balance: ${runningBalance}`);

    // 4. Migrate bills to payables
    const oldBills = oldDb.getAllSync('SELECT * FROM bills') as OldBill[];

    for (const bill of oldBills) {
      // Calculate due date from bill_month and due_day
      const dueDate = `${bill.bill_month}-${String(bill.due_day).padStart(2, '0')}`;

      payableRepo.create({
        name: bill.name,
        amount: bill.amount,
        dueDate: dueDate,
        isRecurring: true,
        recurrenceRule: {
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          dayOfMonth: bill.due_day,
        },
        categoryId: undefined,
      });

      // If bill was paid, mark it as paid
      if (bill.is_paid) {
        const payable = payableRepo.getAll().find(p => p.name === bill.name && p.dueDate === dueDate);
        if (payable) {
          payableRepo.markPaid(payable.id, defaultAccount.id);
        }
      }
    }

    console.log(`Migrated ${oldBills.length} bills to payables`);

    // 5. Mark migration as complete
    const db = getDatabase();
    db.runSync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('migrated_from_v1', ?)",
      [new Date().toISOString()]
    );

    return {
      success: true,
      message: `Migration complete: ${oldDebts.length} debts, ${oldTransactions.length} transactions, ${oldBills.length} bills`
    };

  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Check if migration is needed
export const needsMigration = (): boolean => {
  try {
    const oldDb = SQLite.openDatabaseSync(OLD_DB_NAME);
    const tables = oldDb.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = 'bills'"
    ) as { name: string }[];

    if (tables.length === 0) return false;

    // Check if already migrated
    const db = getDatabase();
    const migrated = db.getAllSync(
      "SELECT value FROM app_settings WHERE key = 'migrated_from_v1'"
    ) as { value: string }[];

    return migrated.length === 0;
  } catch {
    return false;
  }
};
