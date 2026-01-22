import * as SQLite from 'expo-sqlite';
import { Bill, Transaction } from '../types';

// Open the database (creates it if it doesn't exist)
const db = SQLite.openDatabaseSync('ledgerly.db');

// Internal interface for raw SQL results (snake_case)
interface BillRow {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  is_paid: number;
  bill_month: string;
  sync_status: string;
  paid_at: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

interface TransactionRow {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: string | null;
  related_bill_id: string | null;
}

// Helper to get current month in YYYY-MM format
const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Helper to get next month in YYYY-MM format
const getNextMonth = (): string => {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Helper to generate UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const DatabaseService = {
  // 1. Initialize Tables (with migration support)
  init: () => {
    // Create table with new schema
    db.execSync(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        due_day INTEGER NOT NULL,
        is_paid INTEGER DEFAULT 0,
        bill_month TEXT NOT NULL,
        sync_status TEXT DEFAULT 'dirty',
        paid_at TEXT
      );
    `);

    // Create settings table for persisting balance and other settings
    db.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);

    // Create transactions table for all financial activity
    db.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        category TEXT,
        related_bill_id TEXT
      );
    `);

    // Migrate transactions table if needed
    try {
      const transTableInfo = db.getAllSync("PRAGMA table_info(transactions)") as { name: string }[];
      const hasRelatedBillId = transTableInfo.some(col => col.name === 'related_bill_id');
      if (!hasRelatedBillId) {
        db.execSync(`ALTER TABLE transactions ADD COLUMN related_bill_id TEXT`);
      }
    } catch {
      // Column likely already exists
    }

    // Check if we need to migrate old data (add bill_month column if missing)
    try {
      const tableInfo = db.getAllSync("PRAGMA table_info(bills)") as { name: string }[];
      const hasBillMonth = tableInfo.some(col => col.name === 'bill_month');
      const hasPaidAt = tableInfo.some(col => col.name === 'paid_at');

      if (!hasBillMonth) {
        const currentMonth = getCurrentMonth();
        db.execSync(`ALTER TABLE bills ADD COLUMN bill_month TEXT DEFAULT '${currentMonth}'`);
        db.runSync(`UPDATE bills SET bill_month = ? WHERE bill_month IS NULL`, [currentMonth]);
      }

      if (!hasPaidAt) {
        db.execSync(`ALTER TABLE bills ADD COLUMN paid_at TEXT`);
      }
    } catch {
      // Column likely already exists or table is new
    }
  },

  // 2. Add a Bill (creates for current month)
  addBill: (bill: Bill) => {
    const statement = db.prepareSync(
      'INSERT INTO bills (id, name, amount, due_day, is_paid, bill_month, sync_status) VALUES ($id, $name, $amount, $dueDay, $isPaid, $billMonth, $syncStatus)'
    );
    try {
      statement.executeSync({
        $id: bill.id,
        $name: bill.name,
        $amount: bill.amount,
        $dueDay: bill.dueDay,
        $isPaid: bill.isPaid ? 1 : 0,
        $billMonth: bill.billMonth || getCurrentMonth(),
        $syncStatus: 'dirty'
      });
    } finally {
      statement.finalizeSync();
    }
  },

  // 3. Get Bills for Current Month (includes carried over unpaid bills)
  getBillsForCurrentMonth: (): Bill[] => {
    const currentMonth = getCurrentMonth();

    // Get all bills for current month OR unpaid bills from previous months
    const result = db.getAllSync(
      `SELECT * FROM bills
       WHERE bill_month = ? OR (bill_month < ? AND is_paid = 0)
       ORDER BY due_day ASC`,
      [currentMonth, currentMonth]
    ) as BillRow[];

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDay: row.due_day,
      isPaid: !!row.is_paid,
      billMonth: row.bill_month,
      syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
    }));
  },

  // 4. Get All Bills (for reference)
  getBills: (): Bill[] => {
    const result = db.getAllSync('SELECT * FROM bills ORDER BY bill_month DESC, due_day ASC') as BillRow[];
    return result.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDay: row.due_day,
      isPaid: !!row.is_paid,
      billMonth: row.bill_month,
      syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
    }));
  },

  // 5. Mark Bill as Paid and Create Next Month's Instance
  markBillPaid: (bill: Bill) => {
    // Mark current bill as paid with timestamp
    const paidAt = new Date().toISOString();
    const today = paidAt.split('T')[0];
    db.runSync(
      'UPDATE bills SET is_paid = 1, sync_status = ?, paid_at = ? WHERE id = ?',
      ['dirty', paidAt, bill.id]
    );

    // Record as a transaction
    const transactionId = generateUUID();
    db.runSync(
      'INSERT INTO transactions (id, description, amount, type, date, category, related_bill_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transactionId, `Bill: ${bill.name}`, bill.amount, 'bill_paid', today, 'Bills', bill.id]
    );

    // Create next month's instance of this bill
    const nextMonth = getNextMonth();

    // Check if next month's bill already exists
    const existing = db.getAllSync(
      'SELECT id FROM bills WHERE name = ? AND bill_month = ?',
      [bill.name, nextMonth]
    );

    if (existing.length === 0) {
      const newBill: Bill = {
        id: generateUUID(),
        name: bill.name,
        amount: bill.amount,
        dueDay: bill.dueDay,
        isPaid: false,
        billMonth: nextMonth,
        syncStatus: 'dirty',
      };
      DatabaseService.addBill(newBill);
    }
  },

  // 6. Mark Bill as Unpaid (undo payment)
  markBillUnpaid: (id: string) => {
    db.runSync(
      'UPDATE bills SET is_paid = 0, sync_status = ?, paid_at = NULL WHERE id = ?',
      ['dirty', id]
    );
    // Remove the associated transaction
    db.runSync('DELETE FROM transactions WHERE related_bill_id = ?', [id]);
  },

  // 7. Delete a bill
  deleteBill: (id: string) => {
    db.runSync('DELETE FROM bills WHERE id = ?', [id]);
  },

  // 8. Get bills paid this week
  getBillsPaidThisWeek: (): Bill[] => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const result = db.getAllSync(
      `SELECT * FROM bills WHERE is_paid = 1 AND paid_at >= ? ORDER BY paid_at DESC`,
      [startOfWeek.toISOString()]
    ) as BillRow[];

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDay: row.due_day,
      isPaid: !!row.is_paid,
      billMonth: row.bill_month,
      syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
    }));
  },

  // 9. Get setting value
  getSetting: (key: string): string | null => {
    const result = db.getAllSync(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    ) as SettingRow[];
    return result.length > 0 ? result[0].value : null;
  },

  // 10. Set setting value
  setSetting: (key: string, value: string) => {
    db.runSync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  },

  // 11. Add a transaction
  addTransaction: (transaction: Transaction) => {
    const statement = db.prepareSync(
      'INSERT INTO transactions (id, description, amount, type, date, category, related_bill_id) VALUES ($id, $description, $amount, $type, $date, $category, $relatedBillId)'
    );
    try {
      statement.executeSync({
        $id: transaction.id,
        $description: transaction.description,
        $amount: transaction.amount,
        $type: transaction.type,
        $date: transaction.date,
        $category: transaction.category || null,
        $relatedBillId: transaction.relatedBillId || null,
      });
    } finally {
      statement.finalizeSync();
    }
  },

  // 12. Get transactions for current month
  getTransactionsForCurrentMonth: (): Transaction[] => {
    const currentMonth = getCurrentMonth();
    const startOfMonth = `${currentMonth}-01`;
    const nextMonth = getNextMonth();
    const startOfNextMonth = `${nextMonth}-01`;

    const result = db.getAllSync(
      `SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC`,
      [startOfMonth, startOfNextMonth]
    ) as TransactionRow[];

    return result.map((row) => ({
      id: row.id,
      description: row.description,
      amount: row.amount,
      type: row.type as 'income' | 'bill_paid' | 'expense' | 'credit',
      date: row.date,
      category: row.category || undefined,
      relatedBillId: row.related_bill_id || undefined,
    }));
  },

  // 13. Get all transactions
  getAllTransactions: (): Transaction[] => {
    const result = db.getAllSync(
      'SELECT * FROM transactions ORDER BY date DESC, id DESC'
    ) as TransactionRow[];

    return result.map((row) => ({
      id: row.id,
      description: row.description,
      amount: row.amount,
      type: row.type as 'income' | 'bill_paid' | 'expense' | 'credit',
      date: row.date,
      category: row.category || undefined,
      relatedBillId: row.related_bill_id || undefined,
    }));
  },

  // 14. Delete a transaction
  deleteTransaction: (id: string) => {
    db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
  },

  // 15. Get transaction totals for current month
  getTransactionTotals: (): { expenses: number; credits: number } => {
    const currentMonth = getCurrentMonth();
    const startOfMonth = `${currentMonth}-01`;
    const nextMonth = getNextMonth();
    const startOfNextMonth = `${nextMonth}-01`;

    const expenses = db.getAllSync(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?`,
      [startOfMonth, startOfNextMonth]
    ) as { total: number }[];

    const credits = db.getAllSync(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'credit' AND date >= ? AND date < ?`,
      [startOfMonth, startOfNextMonth]
    ) as { total: number }[];

    return {
      expenses: expenses[0]?.total || 0,
      credits: credits[0]?.total || 0,
    };
  },

  // 16. Calculate running balance from all transactions
  getRunningBalance: (): number => {
    const result = db.getAllSync(
      `SELECT
        COALESCE(SUM(CASE WHEN type IN ('income', 'credit') THEN amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN type IN ('expense', 'bill_paid') THEN amount ELSE 0 END), 0) as debits
       FROM transactions`
    ) as { credits: number; debits: number }[];

    const { credits, debits } = result[0] || { credits: 0, debits: 0 };
    return credits - debits;
  },

  // Helper: Get current month string
  getCurrentMonth,

  // Helper: Generate UUID (exposed for external use)
  generateUUID,
};
