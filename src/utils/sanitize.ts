// Input sanitization utilities for DriftMoney

import { VALIDATION_LIMITS } from '../constants';

/**
 * Trims whitespace and limits string length
 */
export function sanitizeString(
  value: string | undefined | null,
  maxLength: number = VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH
): string {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

/**
 * Sanitizes a name field (required, trimmed, limited length)
 */
export function sanitizeName(value: string | undefined | null): string {
  return sanitizeString(value, VALIDATION_LIMITS.MAX_NAME_LENGTH);
}

/**
 * Sanitizes a description field
 */
export function sanitizeDescription(value: string | undefined | null): string {
  return sanitizeString(value, VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH);
}

/**
 * Sanitizes a notes field (longer limit)
 */
export function sanitizeNotes(value: string | undefined | null): string {
  return sanitizeString(value, VALIDATION_LIMITS.MAX_NOTES_LENGTH);
}

/**
 * Ensures a number is within bounds
 */
export function clampNumber(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Sanitizes a day of month value (1-31)
 */
export function sanitizeDayOfMonth(value: number | undefined | null): number {
  if (value === undefined || value === null) return 1;
  return clampNumber(
    value,
    VALIDATION_LIMITS.MIN_DAY_OF_MONTH,
    VALIDATION_LIMITS.MAX_DAY_OF_MONTH
  );
}

/**
 * Normalizes a date string to YYYY-MM-DD format
 * Handles timezone issues by parsing as local date
 */
export function normalizeDate(dateString: string | undefined | null): string {
  if (!dateString) {
    return new Date().toISOString().split('T')[0];
  }

  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Parse and convert to YYYY-MM-DD
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return date.toISOString().split('T')[0];
}

/**
 * Creates a date at midnight local time from a date string
 * Prevents timezone-related off-by-one errors
 */
export function parseLocalDate(dateString: string): Date {
  // Parse as local date by appending T00:00:00
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
