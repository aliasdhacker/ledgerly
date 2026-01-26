// Legacy data migration for DriftMoney
// Migrates from old schema (bills, transactions, debts) to new schema
import { getDb } from './connection';
import { execute, queryAll, getSetting, setSetting, now } from './helpers';
import { generateId } from '../utils/idUtils';

interface LegacyBill {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  is_paid: number;
  bill_month: string;
  paid_at: string | null;
}

interface LegacyTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: string | null;
  related_bill_id: string | null;
}

interface LegacyDebt {
  id: string;
  company: string;
  balance: number;
  last_updated: string;
  notes: string | null;
  is_recurring: number | null;
  payment_due_day: number | null;
  payment_frequency: string | null;
  minimum_payment: number | null;
  next_payment_date: string | null;
}

interface LegacyDebtTransaction {
  id: string;
  debt_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  balance_after: number;
}

export function migrateLegacyData(): { success: boolean; message: string } {
  const migrationKey = 'legacy_migration_complete';

  // Check if migration already done
  if (getSetting(migrationKey) === 'true') {
    return { success: true, message: 'Legacy migration already complete' };
  }

  const db = getDb();
  const timestamp = now();

  try {
    // Check if legacy tables exist
    const tables = db.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ) as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    const hasLegacyBills = tableNames.includes('bills');
    const hasLegacyDebts = tableNames.includes('debts');
    const hasLegacyDebtTransactions = tableNames.includes('debt_transactions');

    if (!hasLegacyBills && !hasLegacyDebts) {
      setSetting(migrationKey, 'true');
      return { success: true, message: 'No legacy data to migrate' };
    }

    // 1. Create a default "Main Account" for bank transactions
    const mainAccountId = generateId.account();
    execute(
      `INSERT INTO accounts (id, name, type, balance, currency, is_active, sort_order, sync_status, created_at, updated_at)
       VALUES (?, 'Main Account', 'bank', 0, 'USD', 1, 0, 'dirty', ?, ?)`,
      [mainAccountId, timestamp, timestamp]
    );

    // 2. Migrate bills → payables
    if (hasLegacyBills) {
      const legacyBills = queryAll<LegacyBill>('SELECT * FROM bills');

      for (const bill of legacyBills) {
        // Create recurrence rule for monthly bills
        const recurrenceRule = JSON.stringify({
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: bill.due_day,
        });

        // Parse due date from bill_month and due_day
        const dueDate = `${bill.bill_month}-${String(bill.due_day).padStart(2, '0')}`;

        execute(
          `INSERT INTO payables (id, name, amount, due_date, is_paid, paid_date, paid_from_account_id, is_recurring, recurrence_rule_json, sync_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'dirty', ?, ?)`,
          [
            bill.id,
            bill.name,
            bill.amount,
            dueDate,
            bill.is_paid,
            bill.paid_at?.split('T')[0] || null,
            bill.is_paid ? mainAccountId : null,
            recurrenceRule,
            timestamp,
            timestamp,
          ]
        );
      }
    }

    // 3. Migrate debts → accounts (credit type)
    const debtIdToAccountId: Record<string, string> = {};

    if (hasLegacyDebts) {
      const legacyDebts = queryAll<LegacyDebt>('SELECT * FROM debts');

      for (const debt of legacyDebts) {
        const accountId = generateId.account();
        debtIdToAccountId[debt.id] = accountId;

        execute(
          `INSERT INTO accounts (id, name, type, balance, currency, is_active, sort_order, minimum_payment, payment_due_day, sync_status, created_at, updated_at)
           VALUES (?, ?, 'credit', ?, 'USD', 1, 1, ?, ?, 'dirty', ?, ?)`,
          [
            accountId,
            debt.company,
            debt.balance,
            debt.minimum_payment,
            debt.payment_due_day,
            timestamp,
            timestamp,
          ]
        );
      }
    }

    // 4. Migrate debt_transactions → transactions on credit accounts
    if (hasLegacyDebtTransactions) {
      const legacyDebtTrans = queryAll<LegacyDebtTransaction>(
        'SELECT * FROM debt_transactions'
      );

      for (const trans of legacyDebtTrans) {
        const accountId = debtIdToAccountId[trans.debt_id];
        if (!accountId) continue;

        // Map legacy types to new types
        // initial/debit = credit increases balance (charge)
        // credit = debit decreases balance (payment)
        const newType = trans.type === 'credit' ? 'debit' : 'credit';

        execute(
          `INSERT INTO transactions (id, account_id, type, amount, description, date, is_split, is_reconciled, sync_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'dirty', ?, ?)`,
          [
            trans.id,
            accountId,
            newType,
            trans.amount,
            trans.description,
            trans.date,
            timestamp,
            timestamp,
          ]
        );
      }
    }

    // 5. Migrate old transactions → transactions on main account
    // Note: Old transactions table has different columns than new one
    const hasOldTransactions = tableNames.includes('transactions');
    if (hasOldTransactions) {
      // Check if it's the old schema by looking for 'related_bill_id' column
      const columns = db.getAllSync(
        "PRAGMA table_info(transactions)"
      ) as { name: string }[];
      const hasRelatedBillId = columns.some((c) => c.name === 'related_bill_id');

      if (hasRelatedBillId) {
        // This is old schema - need to migrate
        const legacyTrans = queryAll<LegacyTransaction>(
          'SELECT id, description, amount, type, date, category, related_bill_id FROM transactions'
        );

        // Clear old transactions first (will be recreated in new format)
        execute('DELETE FROM transactions');

        for (const trans of legacyTrans) {
          // Map old types to new: income/credit → credit, expense/bill_paid → debit
          const newType =
            trans.type === 'income' || trans.type === 'credit'
              ? 'credit'
              : 'debit';

          execute(
            `INSERT INTO transactions (id, account_id, type, amount, description, date, linked_payable_id, is_split, is_reconciled, sync_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'dirty', ?, ?)`,
            [
              trans.id,
              mainAccountId,
              newType,
              trans.amount,
              trans.description,
              trans.date,
              trans.related_bill_id,
              timestamp,
              timestamp,
            ]
          );
        }
      }
    }

    // 6. Calculate and update main account balance
    const balanceResult = db.getFirstSync(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as balance
       FROM transactions WHERE account_id = ?`,
      [mainAccountId]
    ) as { balance: number } | null;

    if (balanceResult) {
      execute('UPDATE accounts SET balance = ? WHERE id = ?', [
        balanceResult.balance,
        mainAccountId,
      ]);
    }

    // Mark migration complete
    setSetting(migrationKey, 'true');

    return {
      success: true,
      message: 'Legacy data migrated successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Check if legacy tables exist (for UI to show migration prompt)
export function hasLegacyData(): boolean {
  const db = getDb();
  const tables = db.getAllSync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('bills', 'debts')"
  ) as { name: string }[];

  if (tables.length === 0) return false;

  // Check if migration already done
  if (getSetting('legacy_migration_complete') === 'true') return false;

  // Check if there's actual data
  let hasData = false;
  for (const table of tables) {
    const count = db.getFirstSync(
      `SELECT COUNT(*) as count FROM ${table.name}`
    ) as { count: number };
    if (count.count > 0) {
      hasData = true;
      break;
    }
  }

  return hasData;
}
