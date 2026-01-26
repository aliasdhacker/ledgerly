// DriftMoney App Configuration Constants
// Centralized location for magic numbers and app-wide settings

/**
 * Time-based constants for various features
 */
export const TIME_CONSTANTS = {
  /** Default number of days to look ahead for upcoming payables */
  UPCOMING_PAYABLES_DAYS: 30,

  /** Days threshold for showing "due soon" warning on payables */
  DUE_SOON_WARNING_DAYS: 7,

  /** Default lookback period for trends analysis */
  TRENDS_DEFAULT_DAYS: 30,

  /** Number of days to show on home screen upcoming section */
  HOME_UPCOMING_DAYS: 14,

  /** Days in a week (for calculations) */
  DAYS_PER_WEEK: 7,

  /** Days in a biweekly period */
  DAYS_PER_BIWEEK: 14,

  /** Milliseconds per day */
  MS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Pagination and list limits
 */
export const LIST_LIMITS = {
  /** Default number of transactions to show */
  DEFAULT_TRANSACTIONS: 50,

  /** Number of recent transactions on home screen */
  HOME_RECENT_TRANSACTIONS: 5,

  /** Number of payables to show in preview */
  HOME_UPCOMING_PAYABLES: 3,

  /** Max transactions to load at once */
  MAX_TRANSACTIONS_BATCH: 100,
} as const;

/**
 * Validation limits
 */
export const VALIDATION_LIMITS = {
  /** Maximum length for names */
  MAX_NAME_LENGTH: 100,

  /** Maximum length for descriptions */
  MAX_DESCRIPTION_LENGTH: 255,

  /** Maximum length for notes */
  MAX_NOTES_LENGTH: 500,

  /** Minimum day of month */
  MIN_DAY_OF_MONTH: 1,

  /** Maximum day of month */
  MAX_DAY_OF_MONTH: 31,

  /** Maximum recurrence interval */
  MAX_RECURRENCE_INTERVAL: 365,
} as const;

/**
 * Financial thresholds
 */
export const FINANCIAL_THRESHOLDS = {
  /** Credit utilization warning threshold (percentage) */
  CREDIT_UTILIZATION_WARNING: 70,

  /** Credit utilization danger threshold (percentage) */
  CREDIT_UTILIZATION_DANGER: 90,

  /** Default budget alert threshold (percentage) */
  DEFAULT_BUDGET_ALERT: 80,
} as const;
