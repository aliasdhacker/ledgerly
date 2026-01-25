// Goal validation schemas

import { GoalCreate, GoalUpdate } from '../types';
import { createValidator, validators } from './validator';

const { required, string, number, positiveNumber, boolean, date, minLength, maxLength } = validators;

export const validateGoalCreate = createValidator<GoalCreate>({
  name: [required, string, minLength(1), maxLength(100)],
  targetAmount: [required, positiveNumber],
  currentAmount: [positiveNumber],
  targetDate: [date],
  linkedAccountId: [string],
  icon: [string, maxLength(10)],
  color: [string, maxLength(10)],
});

export const validateGoalUpdate = createValidator<GoalUpdate>({
  name: [string, minLength(1), maxLength(100)],
  targetAmount: [positiveNumber],
  currentAmount: [number],
  targetDate: [date],
  linkedAccountId: [string],
  icon: [string, maxLength(10)],
  color: [string, maxLength(10)],
  isCompleted: [boolean],
  completedDate: [date],
});
