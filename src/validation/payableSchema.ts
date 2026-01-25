// Payable validation schemas

import { PayableCreate, PayableUpdate } from '../types';
import { createValidator, validators } from './validator';

const { required, string, number, positiveNumber, boolean, date, oneOf, minLength, maxLength, min, max } = validators;

const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as const;

export const validatePayableCreate = createValidator<PayableCreate>({
  name: [required, string, minLength(1), maxLength(100)],
  amount: [required, positiveNumber],
  dueDate: [required, date],
  isRecurring: [required, boolean],
  categoryId: [string],
  notes: [string, maxLength(500)],
  payee: [string, maxLength(100)],
  autoPayAccountId: [string],
});

export const validatePayableUpdate = createValidator<PayableUpdate>({
  name: [string, minLength(1), maxLength(100)],
  amount: [positiveNumber],
  dueDate: [date],
  isPaid: [boolean],
  paidDate: [date],
  paidFromAccountId: [string],
  linkedTransactionId: [string],
  isRecurring: [boolean],
  categoryId: [string],
  notes: [string, maxLength(500)],
  payee: [string, maxLength(100)],
  autoPayAccountId: [string],
});

// Recurrence rule validation
export const validateRecurrenceRule = createValidator<{
  frequency: string;
  interval: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  endDate?: string;
}>({
  frequency: [required, oneOf(RECURRENCE_FREQUENCIES)],
  interval: [required, number, min(1), max(365)],
  dayOfMonth: [number, min(1), max(31)],
  dayOfWeek: [number, min(0), max(6)],
  endDate: [date],
});
