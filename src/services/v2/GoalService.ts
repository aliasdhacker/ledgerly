// Goal Service for DriftMoney
// Business logic for savings goals with progress tracking

import { GoalRepository, AccountRepository } from '../../repositories';
import { validateGoalCreate, validateGoalUpdate } from '../../validation';
import type { Goal, GoalCreate, GoalUpdate, GoalProgress } from '../../types/goal';

export interface GoalSummary {
  activeGoalsCount: number;
  completedGoalsCount: number;
  totalTargetAmount: number;
  totalSavedAmount: number;
  overallPercentComplete: number;
}

export const GoalService = {
  // CRUD Operations
  getById(id: string): Goal | null {
    return GoalRepository.findById(id);
  },

  getAll(): Goal[] {
    return GoalRepository.findAll();
  },

  getActive(): Goal[] {
    return GoalRepository.findActive();
  },

  getCompleted(): Goal[] {
    return GoalRepository.findCompleted();
  },

  getByAccount(accountId: string): Goal[] {
    return GoalRepository.findByAccount(accountId);
  },

  create(data: GoalCreate): { success: true; goal: Goal } | { success: false; errors: string[] } {
    const validation = validateGoalCreate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    // Verify linked account if provided
    if (data.linkedAccountId) {
      const account = AccountRepository.findById(data.linkedAccountId);
      if (!account) {
        return { success: false, errors: ['Linked account not found'] };
      }
    }

    const goal = GoalRepository.create(data);
    return { success: true, goal };
  },

  update(id: string, data: GoalUpdate): { success: true; goal: Goal } | { success: false; errors: string[] } {
    const validation = validateGoalUpdate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    const goal = GoalRepository.update(id, data);
    if (!goal) {
      return { success: false, errors: ['Goal not found'] };
    }

    return { success: true, goal };
  },

  delete(id: string): boolean {
    const goal = GoalRepository.findById(id);
    if (!goal) return false;
    GoalRepository.delete(id);
    return true;
  },

  // Amount Management

  /**
   * Updates the current saved amount
   */
  updateAmount(id: string, amount: number): { success: true; goal: Goal } | { success: false; errors: string[] } {
    if (amount < 0) {
      return { success: false, errors: ['Amount cannot be negative'] };
    }

    const goal = GoalRepository.updateAmount(id, amount);
    if (!goal) {
      return { success: false, errors: ['Goal not found'] };
    }

    return { success: true, goal };
  },

  /**
   * Adds to the current saved amount
   */
  addAmount(id: string, addition: number): { success: true; goal: Goal } | { success: false; errors: string[] } {
    if (addition <= 0) {
      return { success: false, errors: ['Addition must be positive'] };
    }

    const goal = GoalRepository.addToAmount(id, addition);
    if (!goal) {
      return { success: false, errors: ['Goal not found'] };
    }

    return { success: true, goal };
  },

  /**
   * Subtracts from the current saved amount (withdrawal)
   */
  withdrawAmount(id: string, withdrawal: number): { success: true; goal: Goal } | { success: false; errors: string[] } {
    if (withdrawal <= 0) {
      return { success: false, errors: ['Withdrawal must be positive'] };
    }

    const existing = GoalRepository.findById(id);
    if (!existing) {
      return { success: false, errors: ['Goal not found'] };
    }

    if (withdrawal > existing.currentAmount) {
      return { success: false, errors: ['Withdrawal exceeds current savings'] };
    }

    const goal = GoalRepository.addToAmount(id, -withdrawal);
    if (!goal) {
      return { success: false, errors: ['Failed to update goal'] };
    }

    return { success: true, goal };
  },

  /**
   * Marks a goal as completed
   */
  markCompleted(id: string): Goal | null {
    return GoalRepository.markCompleted(id);
  },

  // Progress Calculation

  /**
   * Calculates progress for a single goal
   */
  getProgress(id: string): GoalProgress | null {
    const goal = GoalRepository.findById(id);
    if (!goal) return null;

    return this.calculateProgress(goal);
  },

  /**
   * Gets progress for all active goals
   */
  getAllProgress(): GoalProgress[] {
    const goals = GoalRepository.findActive();
    return goals.map((g) => this.calculateProgress(g));
  },

  /**
   * Calculates progress metrics for a goal
   */
  calculateProgress(goal: Goal): GoalProgress {
    const percentComplete = goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

    let onTrack = true;
    let requiredMonthlyAmount: number | undefined;
    let estimatedCompletionDate: string | undefined;

    if (goal.targetDate && !goal.isCompleted) {
      const today = new Date();
      const targetDate = new Date(goal.targetDate);
      const monthsRemaining = this.monthsBetween(today, targetDate);

      if (monthsRemaining > 0) {
        requiredMonthlyAmount = Math.ceil(remainingAmount / monthsRemaining);

        // Estimate if on track based on current savings rate
        // (This would ideally use historical data)
        const monthsElapsed = this.monthsSinceStart(goal);
        if (monthsElapsed > 0) {
          const monthlyRate = goal.currentAmount / monthsElapsed;
          if (monthlyRate > 0) {
            const monthsToComplete = remainingAmount / monthlyRate;
            const estimatedDate = new Date();
            estimatedDate.setMonth(estimatedDate.getMonth() + Math.ceil(monthsToComplete));
            estimatedCompletionDate = estimatedDate.toISOString().split('T')[0];
            onTrack = estimatedDate <= targetDate;
          }
        }
      } else if (remainingAmount > 0) {
        // Past target date with remaining amount
        onTrack = false;
      }
    }

    return {
      goal,
      percentComplete,
      remainingAmount,
      onTrack,
      requiredMonthlyAmount,
      estimatedCompletionDate,
    };
  },

  // Summary & Analytics

  /**
   * Gets overall goal summary
   */
  getSummary(): GoalSummary {
    const allGoals = GoalRepository.findAll();
    const activeGoals = allGoals.filter((g) => !g.isCompleted);
    const completedGoals = allGoals.filter((g) => g.isCompleted);

    const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSavedAmount = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    return {
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length,
      totalTargetAmount,
      totalSavedAmount,
      overallPercentComplete: totalTargetAmount > 0
        ? Math.round((totalSavedAmount / totalTargetAmount) * 100)
        : 0,
    };
  },

  /**
   * Gets goals that are behind schedule
   */
  getBehindSchedule(): GoalProgress[] {
    return this.getAllProgress().filter((p) => !p.onTrack);
  },

  /**
   * Gets goals completing soon (within 30 days)
   */
  getCompletingSoon(): Goal[] {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    return GoalRepository.findActive().filter((g) => {
      if (!g.targetDate) return false;
      return g.targetDate <= thirtyDaysStr;
    });
  },

  // Linked Account Sync

  /**
   * Syncs goal amount with linked account balance
   * Useful when goal is tied to a dedicated savings account
   */
  syncWithLinkedAccount(goalId: string): { success: true; goal: Goal } | { success: false; errors: string[] } {
    const goal = GoalRepository.findById(goalId);
    if (!goal) {
      return { success: false, errors: ['Goal not found'] };
    }

    if (!goal.linkedAccountId) {
      return { success: false, errors: ['Goal has no linked account'] };
    }

    const account = AccountRepository.findById(goal.linkedAccountId);
    if (!account) {
      return { success: false, errors: ['Linked account not found'] };
    }

    // Update goal amount to match account balance
    const updatedGoal = GoalRepository.updateAmount(goalId, account.balance);
    if (!updatedGoal) {
      return { success: false, errors: ['Failed to sync goal'] };
    }

    return { success: true, goal: updatedGoal };
  },

  // Helpers

  /**
   * Calculates months between two dates
   */
  monthsBetween(start: Date, end: Date): number {
    const months = (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  },

  /**
   * Calculates months since goal was created
   */
  monthsSinceStart(goal: Goal): number {
    const created = new Date(goal.createdAt);
    const today = new Date();
    return this.monthsBetween(created, today) || 1; // At least 1 to avoid division by zero
  },
};
