// Budget Service for DriftMoney
// Business logic for budgets with progress calculation

import { BudgetRepository, TransactionRepository } from '../../repositories';
import { validateBudgetCreate, validateBudgetUpdate } from '../../validation';
import type { Budget, BudgetCreate, BudgetUpdate, BudgetProgress } from '../../types/budget';
import { TransactionType, RecurrenceFrequency } from '../../types/common';
import type { ServiceResult } from '../../types/common';
import { success, failure } from '../../types/common';

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overBudgetCount: number;
}

export const BudgetService = {
  // CRUD Operations
  getById(id: string): Budget | null {
    return BudgetRepository.findById(id);
  },

  getAll(): Budget[] {
    return BudgetRepository.findAll();
  },

  getActive(): Budget[] {
    return BudgetRepository.findActive();
  },

  getByCategory(categoryId: string): Budget[] {
    return BudgetRepository.findByCategory(categoryId);
  },

  getOverallBudget(): Budget | null {
    return BudgetRepository.findOverallBudget();
  },

  create(data: BudgetCreate): ServiceResult<Budget> {
    const validation = validateBudgetCreate(data);
    if (!validation.success) {
      return failure(Object.values(validation.errors));
    }

    // Check if budget already exists for this category in this period
    if (data.categoryId) {
      const existing = BudgetRepository.findByCategory(data.categoryId)
        .find((b) => b.period === data.period);
      if (existing) {
        return failure(['A budget already exists for this category and period']);
      }
    }

    const budget = BudgetRepository.create(data);
    return success(budget);
  },

  update(id: string, data: BudgetUpdate): ServiceResult<Budget> {
    const validation = validateBudgetUpdate(data);
    if (!validation.success) {
      return failure(Object.values(validation.errors));
    }

    const budget = BudgetRepository.update(id, data);
    if (!budget) {
      return failure(['Budget not found']);
    }

    return success(budget);
  },

  delete(id: string): ServiceResult<void> {
    const budget = BudgetRepository.findById(id);
    if (!budget) {
      return failure(['Budget not found']);
    }
    BudgetRepository.delete(id);
    return success(undefined);
  },

  // Progress Calculation

  /**
   * Calculates progress for a single budget
   */
  getProgress(id: string): BudgetProgress | null {
    const budget = BudgetRepository.findById(id);
    if (!budget) return null;

    const { start, end } = this.getPeriodDates(budget);
    const spent = this.calculateSpent(budget, start, end);

    const effectiveAmount = budget.amount + (budget.rollover ? budget.rolledAmount : 0);
    const remaining = effectiveAmount - spent;
    const percentUsed = effectiveAmount > 0 ? Math.round((spent / effectiveAmount) * 100) : 0;

    // Calculate projected spending at end of period
    const projectedEndOfPeriod = this.calculateProjectedSpending(spent, start, end);

    return {
      budget,
      spent,
      remaining,
      percentUsed,
      isOverBudget: remaining < 0,
      projectedEndOfPeriod,
      periodStart: start,
      periodEnd: end,
    };
  },

  /**
   * Gets progress for all active budgets
   */
  getAllProgress(): BudgetProgress[] {
    const budgets = BudgetRepository.findActive();
    return budgets
      .map((b) => this.getProgress(b.id))
      .filter((p): p is BudgetProgress => p !== null);
  },

  /**
   * Gets budgets that are over the alert threshold
   */
  getAlerts(): BudgetProgress[] {
    return this.getAllProgress().filter((p) => {
      if (!p.budget.alertThreshold) return false;
      return p.percentUsed >= p.budget.alertThreshold;
    });
  },

  // Period Management

  /**
   * Gets the start and end dates for the current period of a budget
   */
  getPeriodDates(budget: Budget): { start: string; end: string } {
    // Normalize to midnight for consistent date calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start: Date;
    let end: Date;

    switch (budget.period) {
      case RecurrenceFrequency.DAILY:
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        break;

      case RecurrenceFrequency.WEEKLY:
        // Week starts on Sunday
        const dayOfWeek = today.getDay();
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        break;

      case RecurrenceFrequency.BIWEEKLY:
        // Two weeks from budget start date, normalized to midnight
        const budgetStart = new Date(budget.startDate + 'T00:00:00');
        const daysDiff = Math.floor((today.getTime() - budgetStart.getTime()) / (24 * 60 * 60 * 1000));
        const periodNumber = Math.floor(daysDiff / 14);
        start = new Date(budgetStart);
        start.setDate(budgetStart.getDate() + periodNumber * 14);
        end = new Date(start);
        end.setDate(start.getDate() + 13);
        break;

      case RecurrenceFrequency.MONTHLY:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;

      case RecurrenceFrequency.YEARLY:
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;

      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  },

  /**
   * Process rollover at end of period
   */
  processRollover(budgetId: string): Budget | null {
    const budget = BudgetRepository.findById(budgetId);
    if (!budget || !budget.rollover) return null;

    const progress = this.getProgress(budgetId);
    if (!progress) return null;

    // Only rollover if under budget
    const rolloverAmount = Math.max(0, progress.remaining);

    return BudgetRepository.updateRolledAmount(budgetId, rolloverAmount);
  },

  // Summary & Analytics

  /**
   * Gets overall budget summary
   */
  getSummary(): BudgetSummary {
    const allProgress = this.getAllProgress();

    return {
      totalBudgeted: allProgress.reduce((sum, p) => sum + p.budget.amount, 0),
      totalSpent: allProgress.reduce((sum, p) => sum + p.spent, 0),
      totalRemaining: allProgress.reduce((sum, p) => sum + p.remaining, 0),
      overBudgetCount: allProgress.filter((p) => p.isOverBudget).length,
    };
  },

  // Helpers

  /**
   * Calculates total spent for a budget in a period
   */
  calculateSpent(budget: Budget, startDate: string, endDate: string): number {
    const transactions = TransactionRepository.findAll({
      categoryId: budget.categoryId || undefined,
      startDate,
      endDate,
      type: TransactionType.DEBIT,
    });

    // If no category, this is an overall budget - sum all debits
    if (!budget.categoryId) {
      const allDebits = TransactionRepository.findAll({
        startDate,
        endDate,
        type: TransactionType.DEBIT,
      });
      return allDebits.reduce((sum, t) => sum + t.amount, 0);
    }

    return transactions.reduce((sum, t) => sum + t.amount, 0);
  },

  /**
   * Projects spending at end of period based on current rate
   */
  calculateProjectedSpending(currentSpent: number, periodStart: string, periodEnd: string): number {
    const today = new Date();
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (daysElapsed <= 0) return 0;

    const dailyRate = currentSpent / daysElapsed;
    return Math.round(dailyRate * totalDays);
  },
};
