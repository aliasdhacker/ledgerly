// Date utility functions for DriftMoney

import { RecurrenceFrequency, RecurrenceRule } from '../types';

// Format: YYYY-MM-DD
export const toDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Format: ISO string
export const toISOString = (date: Date): string => {
  return date.toISOString();
};

// Parse YYYY-MM-DD to Date
export const parseDate = (dateString: string): Date => {
  return new Date(dateString + 'T00:00:00');
};

// Get current date as YYYY-MM-DD
export const today = (): string => {
  return toDateString(new Date());
};

// Get current ISO timestamp
export const now = (): string => {
  return new Date().toISOString();
};

// Get current month as YYYY-MM
export const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Get month string from date
export const getMonth = (dateString: string): string => {
  return dateString.slice(0, 7);
};

// Add days to a date
export const addDays = (dateString: string, days: number): string => {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return toDateString(date);
};

// Add months to a date
export const addMonths = (dateString: string, months: number): string => {
  const date = parseDate(dateString);
  date.setMonth(date.getMonth() + months);
  return toDateString(date);
};

// Get days between two dates
export const daysBetween = (startDate: string, endDate: string): number => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if date is in the past
export const isPast = (dateString: string): boolean => {
  return dateString < today();
};

// Check if date is today
export const isToday = (dateString: string): boolean => {
  return dateString === today();
};

// Check if date is within N days from today
export const isWithinDays = (dateString: string, days: number): boolean => {
  const targetDate = parseDate(dateString);
  const todayDate = new Date();
  const futureDate = new Date();
  futureDate.setDate(todayDate.getDate() + days);
  return targetDate >= todayDate && targetDate <= futureDate;
};

// Get start of week (Sunday)
export const startOfWeek = (dateString: string): string => {
  const date = parseDate(dateString);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return toDateString(date);
};

// Get start of month
export const startOfMonth = (dateString: string): string => {
  return dateString.slice(0, 7) + '-01';
};

// Get end of month
export const endOfMonth = (dateString: string): string => {
  const date = parseDate(dateString);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toDateString(date);
};

// Get start of quarter
export const startOfQuarter = (dateString: string): string => {
  const date = parseDate(dateString);
  const quarter = Math.floor(date.getMonth() / 3);
  date.setMonth(quarter * 3, 1);
  return toDateString(date);
};

// Get start of year
export const startOfYear = (dateString: string): string => {
  return dateString.slice(0, 4) + '-01-01';
};

// Calculate next occurrence based on recurrence rule
export const getNextOccurrence = (
  fromDate: string,
  rule: RecurrenceRule
): string => {
  const date = parseDate(fromDate);
  const interval = rule.interval || 1;

  switch (rule.frequency) {
    case RecurrenceFrequency.DAILY:
      date.setDate(date.getDate() + interval);
      break;

    case RecurrenceFrequency.WEEKLY:
      date.setDate(date.getDate() + 7 * interval);
      break;

    case RecurrenceFrequency.BIWEEKLY:
      date.setDate(date.getDate() + 14 * interval);
      break;

    case RecurrenceFrequency.MONTHLY:
      date.setMonth(date.getMonth() + interval);
      if (rule.dayOfMonth) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(rule.dayOfMonth, lastDay));
      }
      break;

    case RecurrenceFrequency.YEARLY:
      date.setFullYear(date.getFullYear() + interval);
      break;
  }

  const nextDate = toDateString(date);

  // Check if past end date
  if (rule.endDate && nextDate > rule.endDate) {
    return '';
  }

  return nextDate;
};

// Format date for display
export const formatDate = (dateString: string, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  const date = parseDate(dateString);
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    case 'medium':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
};

// Format relative date (e.g., "Today", "Yesterday", "3 days ago")
export const formatRelativeDate = (dateString: string): string => {
  const todayStr = today();
  const days = daysBetween(dateString, todayStr);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === -1) return 'Tomorrow';
  if (days > 1 && days <= 7) return `${days} days ago`;
  if (days < -1 && days >= -7) return `In ${Math.abs(days)} days`;

  return formatDate(dateString, 'medium');
};
