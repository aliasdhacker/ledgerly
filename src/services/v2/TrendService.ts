// Trend Service for DriftMoney
// Analytics and trend calculations for financial insights

import { TransactionRepository, CategoryRepository, AccountRepository } from '../../repositories';
import { queryAll } from '../../db';
import { TransactionType } from '../../types/common';
import type { Category } from '../../types/category';

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  transactionCount: number;
  percentOfTotal: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM format
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface CashFlowSummary {
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  averageDailySpending: number;
  highestSpendingDay: { date: string; amount: number } | null;
  lowestSpendingDay: { date: string; amount: number } | null;
}

export interface SpendingByDayOfWeek {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  dayName: string;
  totalAmount: number;
  averageAmount: number;
  transactionCount: number;
}

export interface AccountTrend {
  accountId: string;
  accountName: string;
  startBalance: number;
  endBalance: number;
  change: number;
  changePercent: number;
}

export interface PeriodComparison {
  period1: CashFlowSummary;
  period2: CashFlowSummary;
  expenseChange: number;
  expenseChangePercent: number;
  incomeChange: number;
  incomeChangePercent: number;
}

export const TrendService = {
  /**
   * Get spending breakdown by category for a date range
   */
  getSpendingByCategory(startDate: string, endDate: string): CategorySpending[] {
    const transactions = TransactionRepository.findAll({
      startDate,
      endDate,
      type: TransactionType.DEBIT,
    });

    const categories = CategoryRepository.findAll();
    const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    // Group by category
    const categoryTotals = new Map<string, { amount: number; count: number }>();
    let totalSpending = 0;

    for (const t of transactions) {
      const categoryId = t.categoryId || 'uncategorized';
      const existing = categoryTotals.get(categoryId) || { amount: 0, count: 0 };
      existing.amount += t.amount;
      existing.count += 1;
      categoryTotals.set(categoryId, existing);
      totalSpending += t.amount;
    }

    // Convert to array with category info
    const result: CategorySpending[] = [];
    for (const [categoryId, data] of categoryTotals) {
      const category = categoryMap.get(categoryId);
      result.push({
        categoryId,
        categoryName: category?.name || 'Uncategorized',
        categoryIcon: category?.icon || 'help-circle',
        categoryColor: category?.color || '#888888',
        amount: data.amount,
        transactionCount: data.count,
        percentOfTotal: totalSpending > 0 ? Math.round((data.amount / totalSpending) * 100) : 0,
      });
    }

    // Sort by amount descending
    return result.sort((a, b) => b.amount - a.amount);
  },

  /**
   * Get monthly income vs expenses trend
   */
  getMonthlyTrend(months = 6): MonthlyTrend[] {
    const result: MonthlyTrend[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = date.toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const transactions = TransactionRepository.findAll({
        startDate: monthStart,
        endDate: monthEnd,
      });

      let income = 0;
      let expenses = 0;

      for (const t of transactions) {
        if (t.type === TransactionType.CREDIT) {
          income += t.amount;
        } else {
          expenses += t.amount;
        }
      }

      result.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        income,
        expenses,
        net: income - expenses,
        transactionCount: transactions.length,
      });
    }

    return result;
  },

  /**
   * Get cash flow summary for a period
   */
  getCashFlowSummary(startDate: string, endDate: string): CashFlowSummary {
    const transactions = TransactionRepository.findAll({ startDate, endDate });

    let totalIncome = 0;
    let totalExpenses = 0;
    const dailySpending = new Map<string, number>();

    for (const t of transactions) {
      if (t.type === TransactionType.CREDIT) {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
        const existing = dailySpending.get(t.date) || 0;
        dailySpending.set(t.date, existing + t.amount);
      }
    }

    // Calculate days in period
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Find highest and lowest spending days
    let highestDay: { date: string; amount: number } | null = null;
    let lowestDay: { date: string; amount: number } | null = null;

    for (const [date, amount] of dailySpending) {
      if (!highestDay || amount > highestDay.amount) {
        highestDay = { date, amount };
      }
      if (!lowestDay || amount < lowestDay.amount) {
        lowestDay = { date, amount };
      }
    }

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      averageDailySpending: days > 0 ? Math.round(totalExpenses / days) : 0,
      highestSpendingDay: highestDay,
      lowestSpendingDay: lowestDay,
    };
  },

  /**
   * Get spending patterns by day of week
   */
  getSpendingByDayOfWeek(startDate: string, endDate: string): SpendingByDayOfWeek[] {
    const transactions = TransactionRepository.findAll({
      startDate,
      endDate,
      type: TransactionType.DEBIT,
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = new Map<number, { total: number; count: number }>();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayTotals.set(i, { total: 0, count: 0 });
    }

    // Group by day of week
    for (const t of transactions) {
      const dayOfWeek = new Date(t.date).getDay();
      const existing = dayTotals.get(dayOfWeek)!;
      existing.total += t.amount;
      existing.count += 1;
    }

    // Calculate weeks in period for averaging
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    return Array.from(dayTotals.entries()).map(([dayOfWeek, data]) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      totalAmount: data.total,
      averageAmount: Math.round(data.total / weeks),
      transactionCount: data.count,
    }));
  },

  /**
   * Get top spending categories for a period
   */
  getTopCategories(startDate: string, endDate: string, limit = 5): CategorySpending[] {
    return this.getSpendingByCategory(startDate, endDate).slice(0, limit);
  },

  /**
   * Get spending comparison between two periods
   */
  comparePeriods(
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
  ): PeriodComparison {
    const period1 = this.getCashFlowSummary(period1Start, period1End);
    const period2 = this.getCashFlowSummary(period2Start, period2End);

    const expenseChange = period2.totalExpenses - period1.totalExpenses;
    const incomeChange = period2.totalIncome - period1.totalIncome;

    return {
      period1,
      period2,
      expenseChange,
      expenseChangePercent: period1.totalExpenses > 0
        ? Math.round((expenseChange / period1.totalExpenses) * 100)
        : 0,
      incomeChange,
      incomeChangePercent: period1.totalIncome > 0
        ? Math.round((incomeChange / period1.totalIncome) * 100)
        : 0,
    };
  },

  /**
   * Compare current month to previous month
   */
  compareToLastMonth(): PeriodComparison {
    const today = new Date();

    // Current month
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const currentMonthEnd = today.toISOString().split('T')[0];

    // Previous month
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0];
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      .toISOString()
      .split('T')[0];

    return this.comparePeriods(prevMonthStart, prevMonthEnd, currentMonthStart, currentMonthEnd);
  },

  /**
   * Get account balance trends over time
   * Uses single aggregation query to avoid N+1
   */
  getAccountTrends(startDate: string, endDate: string): AccountTrend[] {
    // Get all active accounts
    const accounts = AccountRepository.findAll({ isActive: true });

    // Single query to get aggregated transaction sums per account
    const transactionSums = queryAll<{
      accountId: string;
      creditSum: number;
      debitSum: number;
    }>(
      `SELECT
         account_id as accountId,
         COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as creditSum,
         COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as debitSum
       FROM transactions
       WHERE sync_status != 'deleted'
         AND date >= ?
         AND date <= ?
       GROUP BY account_id`,
      [startDate, endDate]
    );

    // Create a map for quick lookup
    const sumsByAccount = new Map(
      transactionSums.map((s) => [s.accountId, { creditSum: s.creditSum, debitSum: s.debitSum }])
    );

    return accounts.map((account) => {
      const sums = sumsByAccount.get(account.id) || { creditSum: 0, debitSum: 0 };

      // Calculate the change during this period
      let change: number;
      if (account.type === 'bank') {
        // Bank: credits increase, debits decrease
        change = sums.creditSum - sums.debitSum;
      } else {
        // Credit card: debits increase (charges), credits decrease (payments)
        change = sums.debitSum - sums.creditSum;
      }

      const startBalance = account.balance - change;
      const changePercent =
        startBalance !== 0 ? Math.round((change / Math.abs(startBalance)) * 100) : 0;

      return {
        accountId: account.id,
        accountName: account.name,
        startBalance,
        endBalance: account.balance,
        change,
        changePercent,
      };
    });
  },

  // Quick access methods

  /**
   * Get this month's spending by category
   */
  getThisMonthByCategory(): CategorySpending[] {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const monthEnd = today.toISOString().split('T')[0];
    return this.getSpendingByCategory(monthStart, monthEnd);
  },

  /**
   * Get this month's total spending
   */
  getThisMonthSpending(): number {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const monthEnd = today.toISOString().split('T')[0];
    return this.getCashFlowSummary(monthStart, monthEnd).totalExpenses;
  },

  /**
   * Get this month's total income
   */
  getThisMonthIncome(): number {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const monthEnd = today.toISOString().split('T')[0];
    return this.getCashFlowSummary(monthStart, monthEnd).totalIncome;
  },
};
