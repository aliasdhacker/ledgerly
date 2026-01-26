// Export Service for DriftMoney
// CSV and data export functionality

import { TransactionRepository, AccountRepository, PayableRepository, CategoryRepository } from '../../repositories';
import { formatMoney, formatDate } from '../../utils';

export interface ExportOptions {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  includeCategories?: boolean;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  rowCount: number;
}

export const ExportService = {
  /**
   * Export transactions to CSV format
   */
  exportTransactionsCSV(options: ExportOptions = {}): ExportResult {
    const transactions = TransactionRepository.findAll({
      accountId: options.accountId,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const accounts = new Map(AccountRepository.findAll().map((a) => [a.id, a]));
    const categories = options.includeCategories !== false
      ? new Map(CategoryRepository.findAll().map((c) => [c.id, c]))
      : new Map();

    // CSV Header
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Type',
      'Account',
      'Category',
      'Notes',
      'Reconciled',
    ];

    const rows: string[][] = [headers];

    for (const t of transactions) {
      const account = accounts.get(t.accountId);
      const category = t.categoryId ? categories.get(t.categoryId) : null;

      rows.push([
        t.date,
        this.escapeCSV(t.description),
        t.type === 'debit' ? `-${t.amount.toFixed(2)}` : t.amount.toFixed(2),
        t.type.toUpperCase(),
        account?.name || 'Unknown',
        category?.name || '',
        this.escapeCSV(t.notes || ''),
        t.isReconciled ? 'Yes' : 'No',
      ]);
    }

    const csv = rows.map((row) => row.join(',')).join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return {
      data: csv,
      filename: `driftmoney-transactions-${dateStr}.csv`,
      mimeType: 'text/csv',
      rowCount: transactions.length,
    };
  },

  /**
   * Export account statement to CSV
   */
  exportAccountStatementCSV(accountId: string, startDate: string, endDate: string): ExportResult {
    const account = AccountRepository.findById(accountId);
    if (!account) {
      return {
        data: '',
        filename: 'error.csv',
        mimeType: 'text/csv',
        rowCount: 0,
      };
    }

    const transactions = TransactionRepository.findAll({
      accountId,
      startDate,
      endDate,
    });

    const categories = new Map(CategoryRepository.findAll().map((c) => [c.id, c]));

    // Calculate running balance
    // Start with current balance and work backwards to find starting balance
    let runningBalance = account.balance;
    for (const t of [...transactions].reverse()) {
      if (account.type === 'bank') {
        runningBalance -= t.type === 'credit' ? t.amount : -t.amount;
      } else {
        runningBalance -= t.type === 'credit' ? -t.amount : t.amount;
      }
    }

    // Now build the statement forward
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Category'];
    const rows: string[][] = [headers];

    // Opening balance row
    rows.push([startDate, 'Opening Balance', '', '', runningBalance.toFixed(2), '']);

    for (const t of transactions) {
      const category = t.categoryId ? categories.get(t.categoryId) : null;

      if (account.type === 'bank') {
        runningBalance += t.type === 'credit' ? t.amount : -t.amount;
      } else {
        runningBalance += t.type === 'credit' ? -t.amount : t.amount;
      }

      rows.push([
        t.date,
        this.escapeCSV(t.description),
        t.type === 'debit' ? t.amount.toFixed(2) : '',
        t.type === 'credit' ? t.amount.toFixed(2) : '',
        runningBalance.toFixed(2),
        category?.name || '',
      ]);
    }

    // Closing balance row
    rows.push([endDate, 'Closing Balance', '', '', runningBalance.toFixed(2), '']);

    const csv = rows.map((row) => row.join(',')).join('\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const accountName = account.name.replace(/[^a-zA-Z0-9]/g, '-');

    return {
      data: csv,
      filename: `driftmoney-${accountName}-statement-${dateStr}.csv`,
      mimeType: 'text/csv',
      rowCount: transactions.length,
    };
  },

  /**
   * Export payables to CSV
   */
  exportPayablesCSV(options: { includePaid?: boolean } = {}): ExportResult {
    const payables = PayableRepository.findAll({
      isPaid: options.includePaid ? undefined : false,
    });

    const categories = new Map(CategoryRepository.findAll().map((c) => [c.id, c]));
    const accounts = new Map(AccountRepository.findAll().map((a) => [a.id, a]));

    const headers = [
      'Name',
      'Amount',
      'Due Date',
      'Status',
      'Category',
      'Payee',
      'Recurring',
      'Paid From',
      'Paid Date',
      'Notes',
    ];

    const rows: string[][] = [headers];

    for (const p of payables) {
      const category = p.categoryId ? categories.get(p.categoryId) : null;
      const paidFrom = p.paidFromAccountId ? accounts.get(p.paidFromAccountId) : null;

      rows.push([
        this.escapeCSV(p.name),
        p.amount.toFixed(2),
        p.dueDate,
        p.isPaid ? 'Paid' : 'Unpaid',
        category?.name || '',
        this.escapeCSV(p.payee || ''),
        p.isRecurring ? 'Yes' : 'No',
        paidFrom?.name || '',
        p.paidDate || '',
        this.escapeCSV(p.notes || ''),
      ]);
    }

    const csv = rows.map((row) => row.join(',')).join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return {
      data: csv,
      filename: `driftmoney-payables-${dateStr}.csv`,
      mimeType: 'text/csv',
      rowCount: payables.length,
    };
  },

  /**
   * Export all accounts summary to CSV
   */
  exportAccountsSummaryCSV(): ExportResult {
    const accounts = AccountRepository.findAll();

    const headers = [
      'Name',
      'Type',
      'Balance',
      'Currency',
      'Institution',
      'Last 4 Digits',
      'Credit Limit',
      'Available Credit',
      'Active',
    ];

    const rows: string[][] = [headers];

    for (const a of accounts) {
      const availableCredit = a.type === 'credit' && a.creditLimit
        ? (a.creditLimit - a.balance).toFixed(2)
        : '';

      rows.push([
        this.escapeCSV(a.name),
        a.type.toUpperCase(),
        a.balance.toFixed(2),
        a.currency,
        this.escapeCSV(a.institutionName || ''),
        a.accountNumberLast4 || '',
        a.creditLimit?.toFixed(2) || '',
        availableCredit,
        a.isActive ? 'Yes' : 'No',
      ]);
    }

    const csv = rows.map((row) => row.join(',')).join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return {
      data: csv,
      filename: `driftmoney-accounts-${dateStr}.csv`,
      mimeType: 'text/csv',
      rowCount: accounts.length,
    };
  },

  /**
   * Generate a financial summary report as structured data
   * This can be used to generate PDF or display in UI
   */
  generateSummaryReport(startDate: string, endDate: string): {
    period: { start: string; end: string };
    accounts: {
      bank: { count: number; totalBalance: number };
      credit: { count: number; totalBalance: number; totalLimit: number };
      netWorth: number;
    };
    transactions: {
      count: number;
      totalIncome: number;
      totalExpenses: number;
      netCashFlow: number;
    };
    payables: {
      unpaidCount: number;
      unpaidTotal: number;
      overdueCount: number;
      overdueTotal: number;
    };
    topCategories: Array<{ name: string; amount: number; percent: number }>;
  } {
    const bankAccounts = AccountRepository.findAll({ type: 'bank', isActive: true });
    const creditAccounts = AccountRepository.findAll({ type: 'credit', isActive: true });

    const transactions = TransactionRepository.findAll({ startDate, endDate });
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of transactions) {
      if (t.type === 'credit') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    }

    const unpaidPayables = PayableRepository.findAll({ isPaid: false });
    const overduePayables = PayableRepository.findOverdue();

    // Get category spending
    const categoryTotals = new Map<string, number>();
    const categories = new Map(CategoryRepository.findAll().map((c) => [c.id, c]));

    for (const t of transactions) {
      if (t.type === 'debit' && t.categoryId) {
        const existing = categoryTotals.get(t.categoryId) || 0;
        categoryTotals.set(t.categoryId, existing + t.amount);
      }
    }

    const topCategories = Array.from(categoryTotals.entries())
      .map(([id, amount]) => ({
        name: categories.get(id)?.name || 'Unknown',
        amount,
        percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const totalBankBalance = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalCreditBalance = creditAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalCreditLimit = creditAccounts.reduce((sum, a) => sum + (a.creditLimit || 0), 0);

    return {
      period: { start: startDate, end: endDate },
      accounts: {
        bank: { count: bankAccounts.length, totalBalance: totalBankBalance },
        credit: { count: creditAccounts.length, totalBalance: totalCreditBalance, totalLimit: totalCreditLimit },
        netWorth: totalBankBalance - totalCreditBalance,
      },
      transactions: {
        count: transactions.length,
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
      },
      payables: {
        unpaidCount: unpaidPayables.length,
        unpaidTotal: unpaidPayables.reduce((sum, p) => sum + p.amount, 0),
        overdueCount: overduePayables.length,
        overdueTotal: overduePayables.reduce((sum, p) => sum + p.amount, 0),
      },
      topCategories,
    };
  },

  /**
   * Generate summary report as formatted text (for sharing/copying)
   */
  generateSummaryText(startDate: string, endDate: string): string {
    const report = this.generateSummaryReport(startDate, endDate);

    const lines = [
      'DriftMoney Financial Summary',
      `Period: ${formatDate(report.period.start)} to ${formatDate(report.period.end)}`,
      '',
      '=== ACCOUNTS ===',
      `Bank Accounts: ${report.accounts.bank.count} (${formatMoney(report.accounts.bank.totalBalance)})`,
      `Credit Accounts: ${report.accounts.credit.count} (${formatMoney(report.accounts.credit.totalBalance)} / ${formatMoney(report.accounts.credit.totalLimit)} limit)`,
      `Net Worth: ${formatMoney(report.accounts.netWorth)}`,
      '',
      '=== CASH FLOW ===',
      `Transactions: ${report.transactions.count}`,
      `Income: ${formatMoney(report.transactions.totalIncome)}`,
      `Expenses: ${formatMoney(report.transactions.totalExpenses)}`,
      `Net: ${formatMoney(report.transactions.netCashFlow)}`,
      '',
      '=== BILLS ===',
      `Unpaid: ${report.payables.unpaidCount} (${formatMoney(report.payables.unpaidTotal)})`,
      `Overdue: ${report.payables.overdueCount} (${formatMoney(report.payables.overdueTotal)})`,
      '',
      '=== TOP SPENDING CATEGORIES ===',
      ...report.topCategories.map(
        (c, i) => `${i + 1}. ${c.name}: ${formatMoney(c.amount)} (${c.percent}%)`
      ),
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ];

    return lines.join('\n');
  },

  // Helpers

  /**
   * Escape a value for CSV (handle commas, quotes, newlines)
   */
  escapeCSV(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  },
};
