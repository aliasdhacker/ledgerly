// Goal types for DriftMoney (savings goals)

import { SyncableEntity } from './common';

export interface Goal extends SyncableEntity {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  linkedAccountId?: string;
  icon?: string;
  color?: string;
  isCompleted: boolean;
  completedDate?: string;
}

// For creating new goals
export type GoalCreate = Omit<Goal, keyof SyncableEntity | 'currentAmount' | 'isCompleted' | 'completedDate'> & {
  id?: string;
  currentAmount?: number;
};

// For updating goals
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'createdAt'>>;

// Computed goal progress
export interface GoalProgress {
  goal: Goal;
  percentComplete: number;
  remainingAmount: number;
  onTrack: boolean;
  requiredMonthlyAmount?: number;
  estimatedCompletionDate?: string;
}
