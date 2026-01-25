import * as SQLite from 'expo-sqlite';
import { Bill, Transaction, Debt, DebtTransaction, PaymentFrequency } from '../types';

// Open the database (creates it if it doesn't exist)
const db = SQLite.openDatabaseSync('driftmoney.db');

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
  updated_at: string;
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
  sync_status: string;
  updated_at: string;
}

interface DebtRow {
  id: string;
  company: string;
  balance: number;
  last_updated: string;
  notes: string | null;
  sync_status: string;
  is_recurring: number | null;
  payment_due_day: number | null;
  payment_frequency: string | null;
  minimum_payment: number | null;
  next_payment_date: string | null;
  updated_at: string;
}

interface DebtTransactionRow {
  id: string;
  debt_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  balance_after: number;
  sync_status: string;
  updated_at: string;
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
        paid_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
        related_bill_id TEXT,
        sync_status TEXT DEFAULT 'dirty',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create debts table for tracking debt account balances
    db.execSync(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY NOT NULL,
        company TEXT NOT NULL,
        balance REAL NOT NULL,
        last_updated TEXT NOT NULL,
        notes TEXT,
        sync_status TEXT DEFAULT 'dirty',
        is_recurring INTEGER DEFAULT 0,
        payment_due_day INTEGER,
        payment_frequency TEXT,
        minimum_payment REAL,
        next_payment_date TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create debt_transactions table for tracking individual transactions on debt accounts
    db.execSync(`
      CREATE TABLE IF NOT EXISTS debt_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        debt_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        balance_after REAL NOT NULL,
        sync_status TEXT DEFAULT 'dirty',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
      );
    `);

    // Migrate transactions table if needed
    try {
      const transTableInfo = db.getAllSync("PRAGMA table_info(transactions)") as { name: string }[];
      const hasRelatedBillId = transTableInfo.some(col => col.name === 'related_bill_id');
      if (!hasRelatedBillId) {
        db.execSync(`ALTER TABLE transactions ADD COLUMN related_bill_id TEXT`);
      }
      const hasSyncStatus = transTableInfo.some(col => col.name === 'sync_status');
      if (!hasSyncStatus) {
        db.execSync(`ALTER TABLE transactions ADD COLUMN sync_status TEXT DEFAULT 'dirty'`);
      }
      const hasUpdatedAt = transTableInfo.some(col => col.name === 'updated_at');
      if (!hasUpdatedAt) {
        db.execSync(`ALTER TABLE transactions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
        db.runSync(`UPDATE transactions SET updated_at = datetime('now') WHERE updated_at IS NULL`);
      }
    } catch {
      // Column likely already exists
    }

    // Migrate debts table for recurring payment fields
    try {
      const debtTableInfo = db.getAllSync("PRAGMA table_info(debts)") as { name: string }[];
      const hasIsRecurring = debtTableInfo.some(col => col.name === 'is_recurring');
      if (!hasIsRecurring) {
        db.execSync(`ALTER TABLE debts ADD COLUMN is_recurring INTEGER DEFAULT 0`);
        db.execSync(`ALTER TABLE debts ADD COLUMN payment_due_day INTEGER`);
        db.execSync(`ALTER TABLE debts ADD COLUMN payment_frequency TEXT`);
        db.execSync(`ALTER TABLE debts ADD COLUMN minimum_payment REAL`);
        db.execSync(`ALTER TABLE debts ADD COLUMN next_payment_date TEXT`);
      }
      const hasUpdatedAt = debtTableInfo.some(col => col.name === 'updated_at');
      if (!hasUpdatedAt) {
        db.execSync(`ALTER TABLE debts ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
        db.runSync(`UPDATE debts SET updated_at = datetime('now') WHERE updated_at IS NULL`);
      }
    } catch {
      // Columns likely already exist
    }

    // Check if we need to migrate old data (add bill_month column if missing)
    try {
      const tableInfo = db.getAllSync("PRAGMA table_info(bills)") as { name: string }[];
      const hasBillMonth = tableInfo.some(col => col.name === 'bill_month');
      const hasPaidAt = tableInfo.some(col => col.name === 'paid_at');
      const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');

      if (!hasBillMonth) {
        const currentMonth = getCurrentMonth();
        db.execSync(`ALTER TABLE bills ADD COLUMN bill_month TEXT DEFAULT '${currentMonth}'`);
        db.runSync(`UPDATE bills SET bill_month = ? WHERE bill_month IS NULL`, [currentMonth]);
      }

      if (!hasPaidAt) {
        db.execSync(`ALTER TABLE bills ADD COLUMN paid_at TEXT`);
      }

      if (!hasUpdatedAt) {
        db.execSync(`ALTER TABLE bills ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
        db.runSync(`UPDATE bills SET updated_at = datetime('now') WHERE updated_at IS NULL`);
      }
    } catch {
      // Column likely already exists or table is new
    }

    // Migrate debt_transactions table for sync
    try {
      const debtTransTableInfo = db.getAllSync("PRAGMA table_info(debt_transactions)") as { name: string }[];
      const hasSyncStatus = debtTransTableInfo.some(col => col.name === 'sync_status');
      if (!hasSyncStatus) {
        db.execSync(`ALTER TABLE debt_transactions ADD COLUMN sync_status TEXT DEFAULT 'dirty'`);
      }
      const hasUpdatedAt = debtTransTableInfo.some(col => col.name === 'updated_at');
      if (!hasUpdatedAt) {
        db.execSync(`ALTER TABLE debt_transactions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
        db.runSync(`UPDATE debt_transactions SET updated_at = datetime('now') WHERE updated_at IS NULL`);
      }
    } catch {
      // Columns likely already exist
    }
  },

  // 2. Add a Bill (creates for current month)
  addBill: (bill: Bill) => {
    const now = new Date().toISOString();
    const statement = db.prepareSync(
      'INSERT INTO bills (id, name, amount, due_day, is_paid, bill_month, sync_status, updated_at) VALUES ($id, $name, $amount, $dueDay, $isPaid, $billMonth, $syncStatus, $updatedAt)'
    );
    try {
      statement.executeSync({
        $id: bill.id,
        $name: bill.name,
        $amount: bill.amount,
        $dueDay: bill.dueDay,
        $isPaid: bill.isPaid ? 1 : 0,
        $billMonth: bill.billMonth || getCurrentMonth(),
        $syncStatus: 'dirty',
        $updatedAt: now
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
      'UPDATE bills SET is_paid = 1, sync_status = ?, paid_at = ?, updated_at = ? WHERE id = ?',
      ['dirty', paidAt, paidAt, bill.id]
    );

    // Record as a transaction
    const transactionId = generateUUID();
    db.runSync(
      'INSERT INTO transactions (id, description, amount, type, date, category, related_bill_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [transactionId, `Bill: ${bill.name}`, bill.amount, 'bill_paid', today, 'Bills', bill.id, 'dirty', paidAt]
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
    const now = new Date().toISOString();
    db.runSync(
      'UPDATE bills SET is_paid = 0, sync_status = ?, paid_at = NULL, updated_at = ? WHERE id = ?',
      ['dirty', now, id]
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
    const now = new Date().toISOString();
    const statement = db.prepareSync(
      'INSERT INTO transactions (id, description, amount, type, date, category, related_bill_id, sync_status, updated_at) VALUES ($id, $description, $amount, $type, $date, $category, $relatedBillId, $syncStatus, $updatedAt)'
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
        $syncStatus: 'dirty',
        $updatedAt: now,
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

  // ============ DEBT OPERATIONS ============

  // Add a debt account
  addDebt: (debt: Debt) => {
    const now = new Date().toISOString();
    const statement = db.prepareSync(
      'INSERT INTO debts (id, company, balance, last_updated, notes, sync_status, is_recurring, payment_due_day, payment_frequency, minimum_payment, next_payment_date, updated_at) VALUES ($id, $company, $balance, $lastUpdated, $notes, $syncStatus, $isRecurring, $paymentDueDay, $paymentFrequency, $minimumPayment, $nextPaymentDate, $updatedAt)'
    );
    try {
      statement.executeSync({
        $id: debt.id,
        $company: debt.company,
        $balance: debt.balance,
        $lastUpdated: debt.lastUpdated,
        $notes: debt.notes || null,
        $syncStatus: 'dirty',
        $isRecurring: debt.isRecurring ? 1 : 0,
        $paymentDueDay: debt.paymentDueDay || null,
        $paymentFrequency: debt.paymentFrequency || null,
        $minimumPayment: debt.minimumPayment || null,
        $nextPaymentDate: debt.nextPaymentDate || null,
        $updatedAt: now,
      });
    } finally {
      statement.finalizeSync();
    }
  },

  // Get all debts
  getDebts: (): Debt[] => {
    const result = db.getAllSync(
      'SELECT * FROM debts ORDER BY balance DESC'
    ) as DebtRow[];

    return result.map((row) => ({
      id: row.id,
      company: row.company,
      balance: row.balance,
      lastUpdated: row.last_updated,
      notes: row.notes || undefined,
      syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
      isRecurring: !!row.is_recurring,
      paymentDueDay: row.payment_due_day || undefined,
      paymentFrequency: row.payment_frequency as PaymentFrequency | undefined,
      minimumPayment: row.minimum_payment || undefined,
      nextPaymentDate: row.next_payment_date || undefined,
    }));
  },

  // Update debt balance
  updateDebtBalance: (id: string, newBalance: number) => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    db.runSync(
      'UPDATE debts SET balance = ?, last_updated = ?, sync_status = ?, updated_at = ? WHERE id = ?',
      [newBalance, today, 'dirty', now, id]
    );
  },

  // Update debt details
  updateDebt: (debt: Debt) => {
    const now = new Date().toISOString();
    db.runSync(
      'UPDATE debts SET company = ?, balance = ?, last_updated = ?, notes = ?, sync_status = ?, is_recurring = ?, payment_due_day = ?, payment_frequency = ?, minimum_payment = ?, next_payment_date = ?, updated_at = ? WHERE id = ?',
      [
        debt.company,
        debt.balance,
        debt.lastUpdated,
        debt.notes || null,
        'dirty',
        debt.isRecurring ? 1 : 0,
        debt.paymentDueDay || null,
        debt.paymentFrequency || null,
        debt.minimumPayment || null,
        debt.nextPaymentDate || null,
        now,
        debt.id
      ]
    );
  },

  // Delete a debt (also deletes associated transactions due to CASCADE)
  deleteDebt: (id: string) => {
    // First delete associated transactions (in case CASCADE doesn't work)
    db.runSync('DELETE FROM debt_transactions WHERE debt_id = ?', [id]);
    db.runSync('DELETE FROM debts WHERE id = ?', [id]);
  },

  // Get total debt balance
  getTotalDebt: (): number => {
    const result = db.getAllSync(
      'SELECT COALESCE(SUM(balance), 0) as total FROM debts'
    ) as { total: number }[];
    return result[0]?.total || 0;
  },

  // ============ DEBT TRANSACTION OPERATIONS ============

  // Add a debt transaction and update debt balance
  addDebtTransaction: (debtId: string, type: 'initial' | 'debit' | 'credit', amount: number, description: string): DebtTransaction | null => {
    // Get current debt
    const debtResult = db.getAllSync('SELECT * FROM debts WHERE id = ?', [debtId]) as DebtRow[];
    if (debtResult.length === 0) return null;

    const debt = debtResult[0];
    const currentBalance = debt.balance;
    let newBalance: number;

    // Calculate new balance based on transaction type
    if (type === 'initial') {
      newBalance = amount;
    } else if (type === 'debit') {
      // Debit increases the debt
      newBalance = currentBalance + amount;
    } else {
      // Credit decreases the debt (payment)
      newBalance = currentBalance - amount;
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const transactionId = generateUUID();

    // Insert the debt transaction
    const statement = db.prepareSync(
      'INSERT INTO debt_transactions (id, debt_id, type, amount, description, date, balance_after, sync_status, updated_at) VALUES ($id, $debtId, $type, $amount, $description, $date, $balanceAfter, $syncStatus, $updatedAt)'
    );
    try {
      statement.executeSync({
        $id: transactionId,
        $debtId: debtId,
        $type: type,
        $amount: amount,
        $description: description,
        $date: today,
        $balanceAfter: newBalance,
        $syncStatus: 'dirty',
        $updatedAt: now,
      });
    } finally {
      statement.finalizeSync();
    }

    // Update the debt balance
    db.runSync(
      'UPDATE debts SET balance = ?, last_updated = ?, sync_status = ?, updated_at = ? WHERE id = ?',
      [newBalance, today, 'dirty', now, debtId]
    );

    // For credit (payment) transactions, also create a main ledger transaction
    // This affects the running balance - payments reduce available funds
    if (type === 'credit') {
      const mainTransactionId = generateUUID();
      const mainTransStatement = db.prepareSync(
        'INSERT INTO transactions (id, description, amount, type, date, category, sync_status, updated_at) VALUES ($id, $description, $amount, $type, $date, $category, $syncStatus, $updatedAt)'
      );
      try {
        mainTransStatement.executeSync({
          $id: mainTransactionId,
          $description: `Debt Payment: ${debt.company} - ${description}`,
          $amount: amount,
          $type: 'expense', // Payments are expenses from the running balance
          $date: today,
          $category: 'Debt Payment',
          $syncStatus: 'dirty',
          $updatedAt: now,
        });
      } finally {
        mainTransStatement.finalizeSync();
      }

      // If this is a recurring debt and payment was made, update next payment date
      if (debt.is_recurring && debt.payment_frequency && debt.payment_due_day) {
        // Calculate next payment date based on the current next payment date
        // This ensures if you pay early, the next date moves forward from the scheduled date
        const baseDate = debt.next_payment_date
          ? new Date(debt.next_payment_date + 'T00:00:00')
          : new Date();
        const nextDate = DatabaseService.calculateNextPaymentDate(
          debt.payment_frequency as PaymentFrequency,
          debt.payment_due_day,
          baseDate
        );
        db.runSync('UPDATE debts SET next_payment_date = ? WHERE id = ?', [nextDate, debtId]);
      }
    }

    return {
      id: transactionId,
      debtId,
      type,
      amount,
      description,
      date: today,
      balanceAfter: newBalance,
    };
  },

  // Get all transactions for a debt
  getDebtTransactions: (debtId: string): DebtTransaction[] => {
    const result = db.getAllSync(
      'SELECT * FROM debt_transactions WHERE debt_id = ? ORDER BY date DESC, id DESC',
      [debtId]
    ) as DebtTransactionRow[];

    return result.map((row) => ({
      id: row.id,
      debtId: row.debt_id,
      type: row.type as 'initial' | 'debit' | 'credit',
      amount: row.amount,
      description: row.description,
      date: row.date,
      balanceAfter: row.balance_after,
    }));
  },

  // Delete a debt transaction and recalculate balance
  deleteDebtTransaction: (transactionId: string): boolean => {
    // Get the transaction first
    const transResult = db.getAllSync(
      'SELECT * FROM debt_transactions WHERE id = ?',
      [transactionId]
    ) as DebtTransactionRow[];

    if (transResult.length === 0) return false;

    const transaction = transResult[0];

    // Don't allow deleting initial transactions
    if (transaction.type === 'initial') return false;

    // Delete the transaction
    db.runSync('DELETE FROM debt_transactions WHERE id = ?', [transactionId]);

    // Recalculate the debt balance from remaining transactions
    const remainingTransactions = db.getAllSync(
      'SELECT * FROM debt_transactions WHERE debt_id = ? ORDER BY date ASC, id ASC',
      [transaction.debt_id]
    ) as DebtTransactionRow[];

    let balance = 0;
    for (const trans of remainingTransactions) {
      if (trans.type === 'initial') {
        balance = trans.amount;
      } else if (trans.type === 'debit') {
        balance += trans.amount;
      } else {
        balance -= trans.amount;
      }
      // Update balance_after for each transaction
      db.runSync(
        'UPDATE debt_transactions SET balance_after = ? WHERE id = ?',
        [balance, trans.id]
      );
    }

    // Update the debt's current balance
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    db.runSync(
      'UPDATE debts SET balance = ?, last_updated = ?, sync_status = ?, updated_at = ? WHERE id = ?',
      [balance, today, 'dirty', now, transaction.debt_id]
    );

    return true;
  },

  // Add debt with initial transaction
  addDebtWithTransaction: (debt: Debt): Debt => {
    const now = new Date().toISOString();
    // Add the debt first
    const statement = db.prepareSync(
      'INSERT INTO debts (id, company, balance, last_updated, notes, sync_status, is_recurring, payment_due_day, payment_frequency, minimum_payment, next_payment_date, updated_at) VALUES ($id, $company, $balance, $lastUpdated, $notes, $syncStatus, $isRecurring, $paymentDueDay, $paymentFrequency, $minimumPayment, $nextPaymentDate, $updatedAt)'
    );
    try {
      statement.executeSync({
        $id: debt.id,
        $company: debt.company,
        $balance: debt.balance,
        $lastUpdated: debt.lastUpdated,
        $notes: debt.notes || null,
        $syncStatus: 'dirty',
        $isRecurring: debt.isRecurring ? 1 : 0,
        $paymentDueDay: debt.paymentDueDay || null,
        $paymentFrequency: debt.paymentFrequency || null,
        $minimumPayment: debt.minimumPayment || null,
        $nextPaymentDate: debt.nextPaymentDate || null,
        $updatedAt: now,
      });
    } finally {
      statement.finalizeSync();
    }

    // Create the initial transaction
    const transactionId = generateUUID();
    const transStatement = db.prepareSync(
      'INSERT INTO debt_transactions (id, debt_id, type, amount, description, date, balance_after, sync_status, updated_at) VALUES ($id, $debtId, $type, $amount, $description, $date, $balanceAfter, $syncStatus, $updatedAt)'
    );
    try {
      transStatement.executeSync({
        $id: transactionId,
        $debtId: debt.id,
        $type: 'initial',
        $amount: debt.balance,
        $description: 'Initial balance',
        $date: debt.lastUpdated,
        $balanceAfter: debt.balance,
        $syncStatus: 'dirty',
        $updatedAt: now,
      });
    } finally {
      transStatement.finalizeSync();
    }

    return debt;
  },

  // Calculate the next payment date based on frequency and due day
  calculateNextPaymentDate: (frequency: PaymentFrequency, dueDay: number, fromDate?: Date): string => {
    const now = fromDate || new Date();
    let nextDate = new Date(now);

    switch (frequency) {
      case 'daily':
        // Next day
        nextDate.setDate(nextDate.getDate() + 1);
        break;

      case 'weekly':
        // dueDay is 0-6 (Sunday-Saturday)
        const currentDay = nextDate.getDay();
        let daysUntilDue = dueDay - currentDay;
        if (daysUntilDue <= 0) {
          daysUntilDue += 7; // Next week
        }
        nextDate.setDate(nextDate.getDate() + daysUntilDue);
        break;

      case 'biweekly':
        // dueDay is 0-6 (Sunday-Saturday), every 2 weeks
        const currentDayBi = nextDate.getDay();
        let daysUntilDueBi = dueDay - currentDayBi;
        if (daysUntilDueBi <= 0) {
          daysUntilDueBi += 14; // In 2 weeks
        }
        nextDate.setDate(nextDate.getDate() + daysUntilDueBi);
        break;

      case 'monthly':
        // dueDay is 1-31 (day of month)
        const currentDayOfMonth = nextDate.getDate();
        if (currentDayOfMonth >= dueDay) {
          // Move to next month
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        // Handle months with fewer days
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(dueDay, lastDayOfMonth));
        break;
    }

    return nextDate.toISOString().split('T')[0];
  },

  // Update the next payment date for a debt
  updateNextPaymentDate: (debtId: string) => {
    const debts = db.getAllSync('SELECT * FROM debts WHERE id = ?', [debtId]) as DebtRow[];
    if (debts.length === 0) return;

    const debt = debts[0];
    if (!debt.is_recurring || !debt.payment_frequency || !debt.payment_due_day) return;

    const nextDate = DatabaseService.calculateNextPaymentDate(
      debt.payment_frequency as PaymentFrequency,
      debt.payment_due_day
    );

    db.runSync('UPDATE debts SET next_payment_date = ? WHERE id = ?', [nextDate, debtId]);
  },

  // Get recurring debts with payments due within the next N days
  getRecurringDebtsDueWithin: (days: number): Debt[] => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const result = db.getAllSync(
      `SELECT * FROM debts
       WHERE is_recurring = 1
       AND next_payment_date IS NOT NULL
       AND next_payment_date >= ?
       AND next_payment_date <= ?
       ORDER BY next_payment_date ASC`,
      [todayStr, futureDateStr]
    ) as DebtRow[];

    return result.map((row) => ({
      id: row.id,
      company: row.company,
      balance: row.balance,
      lastUpdated: row.last_updated,
      notes: row.notes || undefined,
      syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
      isRecurring: !!row.is_recurring,
      paymentDueDay: row.payment_due_day || undefined,
      paymentFrequency: row.payment_frequency as PaymentFrequency | undefined,
      minimumPayment: row.minimum_payment || undefined,
      nextPaymentDate: row.next_payment_date || undefined,
    }));
  },

  // Get total of upcoming recurring debt payments (within N days)
  getUpcomingDebtPaymentsTotal: (days: number): number => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const result = db.getAllSync(
      `SELECT COALESCE(SUM(minimum_payment), 0) as total
       FROM debts
       WHERE is_recurring = 1
       AND next_payment_date IS NOT NULL
       AND next_payment_date >= ?
       AND next_payment_date <= ?
       AND minimum_payment IS NOT NULL`,
      [todayStr, futureDateStr]
    ) as { total: number }[];

    return result[0]?.total || 0;
  },

  // Delete all data from the database
  deleteAllData: () => {
    // Delete all debt transactions
    db.runSync('DELETE FROM debt_transactions');
    // Delete all debts
    db.runSync('DELETE FROM debts');
    // Delete all transactions
    db.runSync('DELETE FROM transactions');
    // Delete all bills
    db.runSync('DELETE FROM bills');
    // Clear settings except for app configuration
    db.runSync("DELETE FROM settings WHERE key NOT IN ('daily_reminder_enabled', 'daily_reminder_id', 'daily_reminder_hour', 'daily_reminder_minute')");
  },

  // ============ SYNC HELPER METHODS ============

  // Get all bills with dirty sync status
  getDirtyBills: (): Bill[] => {
    const result = db.getAllSync(
      "SELECT * FROM bills WHERE sync_status = 'dirty'"
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

  // Get all transactions with dirty sync status
  getDirtyTransactions: (): Transaction[] => {
    const result = db.getAllSync(
      "SELECT * FROM transactions WHERE sync_status = 'dirty'"
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

  // Get all debts with dirty sync status
  getDirtyDebts: (): Debt[] => {
    const result = db.getAllSync(
      "SELECT * FROM debts WHERE sync_status = 'dirty'"
    ) as DebtRow[];

    return result.map((row) => ({
      id: row.id,
      company: row.company,
      balance: row.balance,
      lastUpdated: row.last_updated,
      notes: row.notes || undefined,
      syncStatus: row.sync_status as 'synced' | 'dirty' | 'deleted',
      isRecurring: !!row.is_recurring,
      paymentDueDay: row.payment_due_day || undefined,
      paymentFrequency: row.payment_frequency as PaymentFrequency | undefined,
      minimumPayment: row.minimum_payment || undefined,
      nextPaymentDate: row.next_payment_date || undefined,
    }));
  },

  // Get all debt transactions with dirty sync status
  getDirtyDebtTransactions: (): DebtTransaction[] => {
    const result = db.getAllSync(
      "SELECT * FROM debt_transactions WHERE sync_status = 'dirty'"
    ) as DebtTransactionRow[];

    return result.map((row) => ({
      id: row.id,
      debtId: row.debt_id,
      type: row.type as 'initial' | 'debit' | 'credit',
      amount: row.amount,
      description: row.description,
      date: row.date,
      balanceAfter: row.balance_after,
    }));
  },

  // Mark bills as synced
  markBillsSynced: (ids: string[]) => {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(
      `UPDATE bills SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids
    );
  },

  // Mark transactions as synced
  markTransactionsSynced: (ids: string[]) => {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(
      `UPDATE transactions SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids
    );
  },

  // Mark debts as synced
  markDebtsSynced: (ids: string[]) => {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(
      `UPDATE debts SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids
    );
  },

  // Mark debt transactions as synced
  markDebtTransactionsSynced: (ids: string[]) => {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(
      `UPDATE debt_transactions SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids
    );
  },

  // Get count of pending changes
  getPendingChangesCount: (): number => {
    const bills = db.getAllSync(
      "SELECT COUNT(*) as count FROM bills WHERE sync_status = 'dirty'"
    ) as { count: number }[];
    const transactions = db.getAllSync(
      "SELECT COUNT(*) as count FROM transactions WHERE sync_status = 'dirty'"
    ) as { count: number }[];
    const debts = db.getAllSync(
      "SELECT COUNT(*) as count FROM debts WHERE sync_status = 'dirty'"
    ) as { count: number }[];
    const debtTransactions = db.getAllSync(
      "SELECT COUNT(*) as count FROM debt_transactions WHERE sync_status = 'dirty'"
    ) as { count: number }[];

    return (
      (bills[0]?.count || 0) +
      (transactions[0]?.count || 0) +
      (debts[0]?.count || 0) +
      (debtTransactions[0]?.count || 0)
    );
  },

  // Upsert bill from cloud
  upsertBillFromCloud: (bill: Bill & { updatedAt: string }) => {
    const existingResult = db.getAllSync(
      'SELECT updated_at FROM bills WHERE id = ?',
      [bill.id]
    ) as { updated_at: string }[];

    if (existingResult.length > 0) {
      // Only update if cloud version is newer
      if (bill.updatedAt > existingResult[0].updated_at) {
        db.runSync(
          'UPDATE bills SET name = ?, amount = ?, due_day = ?, is_paid = ?, bill_month = ?, sync_status = ?, updated_at = ? WHERE id = ?',
          [bill.name, bill.amount, bill.dueDay, bill.isPaid ? 1 : 0, bill.billMonth, 'synced', bill.updatedAt, bill.id]
        );
      }
    } else {
      db.runSync(
        'INSERT INTO bills (id, name, amount, due_day, is_paid, bill_month, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [bill.id, bill.name, bill.amount, bill.dueDay, bill.isPaid ? 1 : 0, bill.billMonth, 'synced', bill.updatedAt]
      );
    }
  },

  // Upsert transaction from cloud
  upsertTransactionFromCloud: (transaction: Transaction & { updatedAt: string }) => {
    const existingResult = db.getAllSync(
      'SELECT updated_at FROM transactions WHERE id = ?',
      [transaction.id]
    ) as { updated_at: string }[];

    if (existingResult.length > 0) {
      if (transaction.updatedAt > existingResult[0].updated_at) {
        db.runSync(
          'UPDATE transactions SET description = ?, amount = ?, type = ?, date = ?, category = ?, related_bill_id = ?, sync_status = ?, updated_at = ? WHERE id = ?',
          [transaction.description, transaction.amount, transaction.type, transaction.date, transaction.category || null, transaction.relatedBillId || null, 'synced', transaction.updatedAt, transaction.id]
        );
      }
    } else {
      db.runSync(
        'INSERT INTO transactions (id, description, amount, type, date, category, related_bill_id, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [transaction.id, transaction.description, transaction.amount, transaction.type, transaction.date, transaction.category || null, transaction.relatedBillId || null, 'synced', transaction.updatedAt]
      );
    }
  },

  // Upsert debt from cloud
  upsertDebtFromCloud: (debt: Debt & { updatedAt: string }) => {
    const existingResult = db.getAllSync(
      'SELECT updated_at FROM debts WHERE id = ?',
      [debt.id]
    ) as { updated_at: string }[];

    if (existingResult.length > 0) {
      if (debt.updatedAt > existingResult[0].updated_at) {
        db.runSync(
          'UPDATE debts SET company = ?, balance = ?, last_updated = ?, notes = ?, sync_status = ?, is_recurring = ?, payment_due_day = ?, payment_frequency = ?, minimum_payment = ?, next_payment_date = ?, updated_at = ? WHERE id = ?',
          [debt.company, debt.balance, debt.lastUpdated, debt.notes || null, 'synced', debt.isRecurring ? 1 : 0, debt.paymentDueDay || null, debt.paymentFrequency || null, debt.minimumPayment || null, debt.nextPaymentDate || null, debt.updatedAt, debt.id]
        );
      }
    } else {
      db.runSync(
        'INSERT INTO debts (id, company, balance, last_updated, notes, sync_status, is_recurring, payment_due_day, payment_frequency, minimum_payment, next_payment_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [debt.id, debt.company, debt.balance, debt.lastUpdated, debt.notes || null, 'synced', debt.isRecurring ? 1 : 0, debt.paymentDueDay || null, debt.paymentFrequency || null, debt.minimumPayment || null, debt.nextPaymentDate || null, debt.updatedAt]
      );
    }
  },

  // Upsert debt transaction from cloud
  upsertDebtTransactionFromCloud: (debtTransaction: DebtTransaction & { updatedAt: string }) => {
    const existingResult = db.getAllSync(
      'SELECT updated_at FROM debt_transactions WHERE id = ?',
      [debtTransaction.id]
    ) as { updated_at: string }[];

    if (existingResult.length > 0) {
      if (debtTransaction.updatedAt > existingResult[0].updated_at) {
        db.runSync(
          'UPDATE debt_transactions SET debt_id = ?, type = ?, amount = ?, description = ?, date = ?, balance_after = ?, sync_status = ?, updated_at = ? WHERE id = ?',
          [debtTransaction.debtId, debtTransaction.type, debtTransaction.amount, debtTransaction.description, debtTransaction.date, debtTransaction.balanceAfter, 'synced', debtTransaction.updatedAt, debtTransaction.id]
        );
      }
    } else {
      db.runSync(
        'INSERT INTO debt_transactions (id, debt_id, type, amount, description, date, balance_after, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [debtTransaction.id, debtTransaction.debtId, debtTransaction.type, debtTransaction.amount, debtTransaction.description, debtTransaction.date, debtTransaction.balanceAfter, 'synced', debtTransaction.updatedAt]
      );
    }
  },
};
