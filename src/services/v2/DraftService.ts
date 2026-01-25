// Draft Service for DriftMoney
// "Safe to Spend" calculation - the core value proposition of the app
// Answers: "How much money do I actually have right now?"

import { AccountRepository, PayableRepository } from '../../repositories';
import { AccountService } from './AccountService';
import { PayableService } from './PayableService';

export interface DraftResult {
  // Core calculation
  availableBalance: number;      // Total bank balances
  upcomingPayables: number;      // Unpaid bills due before target date
  safeToSpend: number;           // availableBalance - upcomingPayables

  // Supporting data
  overduePayables: number;       // Bills past due (included in upcoming)
  creditDebt: number;            // Total credit card balances
  netWorth: number;              // bank - credit

  // Breakdown
  breakdown: {
    bankAccounts: { name: string; balance: number }[];
    upcomingBills: { name: string; amount: number; dueDate: string; isOverdue: boolean }[];
  };
}

export interface DraftCalculationOptions {
  targetDate?: string;           // Default: end of month
  includeOverdue?: boolean;      // Include overdue bills in calculation (default: true)
  accountIds?: string[];         // Specific accounts to include (default: all active bank accounts)
}

export const DraftService = {
  /**
   * Main "Safe to Spend" calculation
   * Answers: How much money can I safely spend right now?
   */
  calculate(options: DraftCalculationOptions = {}): DraftResult {
    const targetDate = options.targetDate || this.getEndOfMonth();
    const includeOverdue = options.includeOverdue !== false;

    // Get bank account balances
    const bankAccounts = AccountService.getBankAccounts(true);
    const filteredAccounts = options.accountIds
      ? bankAccounts.filter((a) => options.accountIds!.includes(a.id))
      : bankAccounts;

    const availableBalance = filteredAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Get upcoming payables
    const today = new Date().toISOString().split('T')[0];
    const upcomingPayables = PayableRepository.findAll({
      isPaid: false,
      startDate: today,
      endDate: targetDate,
    });

    // Get overdue payables
    const overduePayables = PayableRepository.findOverdue();

    // Calculate totals
    const upcomingTotal = upcomingPayables.reduce((sum, p) => sum + p.amount, 0);
    const overdueTotal = overduePayables.reduce((sum, p) => sum + p.amount, 0);

    const totalPayables = includeOverdue
      ? upcomingTotal + overdueTotal
      : upcomingTotal;

    // Credit card debt
    const creditAccounts = AccountService.getCreditAccounts(true);
    const creditDebt = creditAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Safe to spend
    const safeToSpend = Math.max(0, availableBalance - totalPayables);

    // Build breakdown
    const allPayables = includeOverdue
      ? [...overduePayables, ...upcomingPayables]
      : upcomingPayables;

    return {
      availableBalance,
      upcomingPayables: totalPayables,
      safeToSpend,
      overduePayables: overdueTotal,
      creditDebt,
      netWorth: availableBalance - creditDebt,
      breakdown: {
        bankAccounts: filteredAccounts.map((a) => ({
          name: a.name,
          balance: a.balance,
        })),
        upcomingBills: allPayables.map((p) => {
          const payableWithStatus = PayableService.addStatusFields(p);
          return {
            name: p.name,
            amount: p.amount,
            dueDate: p.dueDate,
            isOverdue: payableWithStatus.isOverdue,
          };
        }),
      },
    };
  },

  /**
   * Quick safe-to-spend number
   */
  getSafeToSpend(targetDate?: string): number {
    return this.calculate({ targetDate }).safeToSpend;
  },

  /**
   * Get available balance (all bank accounts)
   */
  getAvailableBalance(): number {
    return AccountRepository.getTotalBalance('bank');
  },

  /**
   * Get total credit debt
   */
  getCreditDebt(): number {
    return AccountRepository.getTotalBalance('credit');
  },

  /**
   * Get net worth (bank - credit)
   */
  getNetWorth(): number {
    return AccountRepository.getNetWorth();
  },

  /**
   * Get upcoming payables total
   */
  getUpcomingTotal(days = 30): number {
    return PayableRepository.getUpcomingTotal(days);
  },

  /**
   * Get overdue payables total
   */
  getOverdueTotal(): number {
    return PayableRepository.getOverdueTotal();
  },

  /**
   * Calculate safe-to-spend for a specific date range
   * Useful for "what can I spend this week?"
   */
  calculateForRange(startDate: string, endDate: string): {
    safeToSpend: number;
    payablesInRange: number;
  } {
    const availableBalance = this.getAvailableBalance();
    const overdue = this.getOverdueTotal();

    const payablesInRange = PayableRepository.findAll({
      isPaid: false,
      startDate,
      endDate,
    }).reduce((sum, p) => sum + p.amount, 0);

    const safeToSpend = Math.max(0, availableBalance - overdue - payablesInRange);

    return {
      safeToSpend,
      payablesInRange,
    };
  },

  /**
   * Calculate for "this week" (next 7 days)
   */
  calculateThisWeek(): {
    safeToSpend: number;
    payablesThisWeek: number;
  } {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const result = this.calculateForRange(
      today.toISOString().split('T')[0],
      nextWeek.toISOString().split('T')[0]
    );

    return {
      safeToSpend: result.safeToSpend,
      payablesThisWeek: result.payablesInRange,
    };
  },

  /**
   * Calculate for "this month" (until end of month)
   */
  calculateThisMonth(): DraftResult {
    return this.calculate({ targetDate: this.getEndOfMonth() });
  },

  /**
   * Calculate until next payday
   * @param payday Day of month (1-31)
   */
  calculateUntilPayday(payday: number): {
    safeToSpend: number;
    daysUntilPayday: number;
    payablesUntilPayday: number;
  } {
    const today = new Date();
    const currentDay = today.getDate();

    let nextPayday: Date;
    if (currentDay < payday) {
      // Payday is later this month
      nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
    } else {
      // Payday is next month
      nextPayday = new Date(today.getFullYear(), today.getMonth() + 1, payday);
    }

    const daysUntilPayday = Math.ceil(
      (nextPayday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const result = this.calculateForRange(
      today.toISOString().split('T')[0],
      nextPayday.toISOString().split('T')[0]
    );

    return {
      ...result,
      daysUntilPayday,
      payablesUntilPayday: result.payablesInRange,
    };
  },

  // Helpers

  /**
   * Get end of current month as ISO date string
   */
  getEndOfMonth(): string {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return endOfMonth.toISOString().split('T')[0];
  },

  /**
   * Get end of next month as ISO date string
   */
  getEndOfNextMonth(): string {
    const today = new Date();
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return endOfNextMonth.toISOString().split('T')[0];
  },
};
