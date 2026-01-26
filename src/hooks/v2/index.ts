// v2 Hooks exports for DriftMoney
// React hooks for the new service layer

export { useAccounts, useAccountSummary } from './useAccounts';
export { useTransactions, useRecentTransactions, useAccountTransactions } from './useTransactions';
export { usePayables, useUnpaidPayables, useUpcomingPayables } from './usePayables';
export { useBudgets, useBudgetProgress } from './useBudgets';
export { useGoals, useGoalProgress } from './useGoals';
export { useDraft, useSafeToSpend, useFinancialOverview, useUntilPayday } from './useDraft';
export {
  useSpendingByCategory,
  useMonthlyTrend,
  useCashFlowSummary,
  useSpendingByDayOfWeek,
  useMonthComparison,
  useThisMonthSpending,
  useTopCategories,
} from './useTrends';

// AI Hooks
export {
  useAIStatus,
  useCategorySuggestion,
  useAnomalyDetection,
  useBudgetRecommendations,
  useSpendingInsights,
  useCashFlowForecast,
} from './useAI';
