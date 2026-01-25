// Budget validation schemas

import { BudgetCreate, BudgetUpdate } from '../types';
import { createValidator, validators } from './validator';

const { required, string, number, positiveNumber, boolean, date, oneOf, minLength, maxLength, min, max } = validators;

const PERIODS = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as const;

export const validateBudgetCreate = createValidator<BudgetCreate>({
  name: [required, string, minLength(1), maxLength(100)],
  categoryId: [string],
  amount: [required, positiveNumber],
  period: [required, oneOf(PERIODS)],
  startDate: [required, date],
  endDate: [date],
  rollover: [required, boolean],
  alertThreshold: [number, min(0), max(100)],
});

export const validateBudgetUpdate = createValidator<BudgetUpdate>({
  name: [string, minLength(1), maxLength(100)],
  categoryId: [string],
  amount: [positiveNumber],
  period: [oneOf(PERIODS)],
  startDate: [date],
  endDate: [date],
  rollover: [boolean],
  rolledAmount: [number],
  alertThreshold: [number, min(0), max(100)],
});
