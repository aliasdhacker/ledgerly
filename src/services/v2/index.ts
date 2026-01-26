// Service layer exports for DriftMoney v2
// Business logic layer on top of repositories

export { AccountService } from './AccountService';
export type { AccountSummary, CreditAccountInfo } from './AccountService';

export { TransactionService } from './TransactionService';
export type { TransactionSummary, TransactionFilters } from './TransactionService';

export { PayableService } from './PayableService';
export type { PayableSummary } from './PayableService';

export { TransferService } from './TransferService';
export type { TransferResult } from './TransferService';

export { CategoryService } from './CategoryService';
export type { CategoryWithChildren } from './CategoryService';

export { BudgetService } from './BudgetService';
export type { BudgetSummary } from './BudgetService';

export { GoalService } from './GoalService';
export type { GoalSummary } from './GoalService';

export { DraftService } from './DraftService';
export type { DraftResult, DraftCalculationOptions } from './DraftService';

export { TrendService } from './TrendService';
export type {
  CategorySpending,
  MonthlyTrend,
  CashFlowSummary,
  SpendingByDayOfWeek,
  AccountTrend,
  PeriodComparison,
} from './TrendService';

export { ExportService } from './ExportService';
export type { ExportOptions, ExportResult } from './ExportService';

export { AIService } from '../ai';
export type {
  AIConfig,
  AIHealthStatus,
  CategorySuggestion,
  SpendingAnomaly,
  BudgetRecommendation,
  SpendingInsight,
} from '../../types/ai';
