// Budget types for DriftMoney

import { SyncableEntity, RecurrenceFrequency } from './common';

export interface Budget extends SyncableEntity {
  name: string;
  categoryId?: string; // null = overall budget
  amount: number;
  period: RecurrenceFrequency;
  startDate: string;
  endDate?: string;

  // Rollover
  rollover: boolean;
  rolledAmount: number;

  // Alerts
  alertThreshold?: number; // Percentage (e.g., 80 = alert at 80%)
}

// For creating new budgets
export type BudgetCreate = Omit<Budget, keyof SyncableEntity | 'rolledAmount'> & {
  id?: string;
};

// For updating budgets
export type BudgetUpdate = Partial<Omit<Budget, 'id' | 'createdAt'>>;

// Computed budget progress
export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  projectedEndOfPeriod: number;
  periodStart: string;
  periodEnd: string;
}
