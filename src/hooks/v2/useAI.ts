// AI hooks for DriftMoney
// Provides AI-powered features to React components

import { useState, useCallback, useEffect } from 'react';
import { AIService } from '../../services/v2';
import { CategoryRepository } from '../../repositories';
import type {
  AIHealthStatus,
  CategorySuggestion,
  SpendingAnomaly,
  BudgetRecommendation,
  SpendingInsight,
  AIConfig,
} from '../../types/ai';
import type { Transaction } from '../../types/transaction';

// ============================================================================
// AI Status Hook
// ============================================================================

interface UseAIStatusReturn {
  enabled: boolean;
  available: boolean;
  health: AIHealthStatus | null;
  loading: boolean;
  error: string | null;
  enable: () => void;
  disable: () => void;
  checkHealth: () => Promise<void>;
  config: AIConfig;
  updateConfig: (config: Partial<AIConfig>) => void;
}

export function useAIStatus(): UseAIStatusReturn {
  const [enabled, setEnabled] = useState(false);
  const [health, setHealth] = useState<AIHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AIConfig>(AIService.getConfig());

  useEffect(() => {
    setEnabled(AIService.isEnabled());
    setConfig(AIService.getConfig());
    setLoading(false);
  }, []);

  const enable = useCallback(() => {
    AIService.enable();
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    AIService.disable();
    setEnabled(false);
  }, []);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await AIService.checkHealth();
      setHealth(status);
      if (!status.available) {
        setError(status.error || 'AI service unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AIConfig>) => {
    AIService.setConfig(newConfig);
    setConfig(AIService.getConfig());
  }, []);

  return {
    enabled,
    available: health?.available ?? false,
    health,
    loading,
    error,
    enable,
    disable,
    checkHealth,
    config,
    updateConfig,
  };
}

// ============================================================================
// AI Category Suggestion Hook
// ============================================================================

interface UseCategorySuggestionReturn {
  suggestion: CategorySuggestion | null;
  loading: boolean;
  error: string | null;
  getSuggestion: (description: string, amount: number, type: 'debit' | 'credit') => Promise<void>;
  clear: () => void;
}

export function useCategorySuggestion(): UseCategorySuggestionReturn {
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestion = useCallback(async (
    description: string,
    amount: number,
    type: 'debit' | 'credit'
  ) => {
    if (!AIService.isEnabled()) {
      setError('AI features are disabled');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await AIService.categorizeTransaction(description, amount, type);

      if (result) {
        // Try to resolve category ID from name
        const categories = CategoryRepository.findAll();
        const matchedCategory = categories.find(
          c => c.name.toLowerCase() === result.categoryName.toLowerCase()
        );

        setSuggestion({
          ...result,
          categoryId: matchedCategory?.id || null,
        });
      } else {
        setError('Could not get category suggestion');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Categorization failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return { suggestion, loading, error, getSuggestion, clear };
}

// ============================================================================
// Anomaly Detection Hook
// ============================================================================

interface UseAnomalyDetectionReturn {
  anomalies: SpendingAnomaly[];
  loading: boolean;
  error: string | null;
  detectAnomalies: (transactions: Transaction[], categoryAverages: Record<string, number>) => Promise<void>;
  dismissAnomaly: (transactionId: string) => void;
}

export function useAnomalyDetection(): UseAnomalyDetectionReturn {
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectAnomalies = useCallback(async (
    transactions: Transaction[],
    categoryAverages: Record<string, number>
  ) => {
    if (!AIService.isEnabled()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map transactions to the format expected by AI service
      const categories = CategoryRepository.findAll();
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const txnData = transactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        category: t.categoryId ? categoryMap.get(t.categoryId) : undefined,
      }));

      const result = await AIService.detectAnomalies(txnData, categoryAverages);
      setAnomalies(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anomaly detection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissAnomaly = useCallback((transactionId: string) => {
    setAnomalies(prev => prev.filter(a => a.transactionId !== transactionId));
  }, []);

  return { anomalies, loading, error, detectAnomalies, dismissAnomaly };
}

// ============================================================================
// Budget Recommendations Hook
// ============================================================================

interface UseBudgetRecommendationsReturn {
  recommendations: BudgetRecommendation[];
  loading: boolean;
  error: string | null;
  getRecommendations: () => Promise<void>;
}

export function useBudgetRecommendations(): UseBudgetRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(async () => {
    if (!AIService.isEnabled()) {
      setError('AI features are disabled');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get spending data from TrendService
      const { TrendService } = await import('../../services/v2/TrendService');
      const categories = CategoryRepository.findAll();

      // Get last month's spending by category
      const today = new Date();
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);

      const lastMonthSpending = TrendService.getSpendingByCategory(
        lastMonthStart.toISOString().split('T')[0],
        lastMonthEnd.toISOString().split('T')[0]
      );

      const threeMonthSpending = TrendService.getSpendingByCategory(
        threeMonthsAgo.toISOString().split('T')[0],
        lastMonthEnd.toISOString().split('T')[0]
      );

      // Build category spending data
      const categorySpending = categories
        .map(cat => {
          const lastMonth = lastMonthSpending.find(s => s.categoryId === cat.id);
          const threeMonth = threeMonthSpending.find(s => s.categoryId === cat.id);

          const lastMonthAmount = lastMonth?.amount || 0;
          const threeMonthAvg = threeMonth ? threeMonth.amount / 3 : 0;

          // Determine trend
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (threeMonthAvg > 0) {
            const change = (lastMonthAmount - threeMonthAvg) / threeMonthAvg;
            if (change > 0.1) trend = 'up';
            else if (change < -0.1) trend = 'down';
          }

          return {
            category: cat.name,
            lastMonth: lastMonthAmount,
            threeMonthAvg,
            trend,
          };
        })
        .filter(c => c.lastMonth > 0 || c.threeMonthAvg > 0);

      const result = await AIService.getBudgetRecommendations(categorySpending);

      // Resolve category IDs
      const withIds = result.map(r => {
        const cat = categories.find(c => c.name.toLowerCase() === r.categoryName.toLowerCase());
        return { ...r, categoryId: cat?.id || '' };
      });

      setRecommendations(withIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  return { recommendations, loading, error, getRecommendations };
}

// ============================================================================
// Spending Insights Hook
// ============================================================================

interface UseSpendingInsightsReturn {
  insights: SpendingInsight[];
  loading: boolean;
  error: string | null;
  getInsights: () => Promise<void>;
}

export function useSpendingInsights(): UseSpendingInsightsReturn {
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInsights = useCallback(async () => {
    if (!AIService.isEnabled()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { TrendService } = await import('../../services/v2/TrendService');
      const categories = CategoryRepository.findAll();
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      // Get current and previous month data
      const today = new Date();
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      const currentSpending = TrendService.getSpendingByCategory(
        currentMonthStart.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      const previousSpending = TrendService.getSpendingByCategory(
        lastMonthStart.toISOString().split('T')[0],
        lastMonthEnd.toISOString().split('T')[0]
      );

      // Get cash flow
      const cashFlow = TrendService.getCashFlowSummary(
        currentMonthStart.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      // Convert to category name maps
      const currentMap: Record<string, number> = {};
      const previousMap: Record<string, number> = {};

      currentSpending.forEach(s => {
        const name = categoryMap.get(s.categoryId) || 'Other';
        currentMap[name] = s.amount;
      });

      previousSpending.forEach(s => {
        const name = categoryMap.get(s.categoryId) || 'Other';
        previousMap[name] = s.amount;
      });

      const result = await AIService.getSpendingInsights(
        currentMap,
        previousMap,
        cashFlow.totalIncome,
        cashFlow.totalExpenses
      );

      setInsights(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get insights');
    } finally {
      setLoading(false);
    }
  }, []);

  return { insights, loading, error, getInsights };
}

// ============================================================================
// Cash Flow Forecast Hook
// ============================================================================

interface CashFlowForecastResult {
  forecasts: Array<{
    weekNumber: number;
    endDate: string;
    predictedBalance: number;
    inflows: number;
    outflows: number;
    warnings: string[];
  }>;
  summary: {
    lowestBalance: number;
    lowestBalanceDate: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface UseCashFlowForecastReturn {
  forecast: CashFlowForecastResult | null;
  loading: boolean;
  error: string | null;
  getForecast: () => Promise<void>;
}

export function useCashFlowForecast(): UseCashFlowForecastReturn {
  const [forecast, setForecast] = useState<CashFlowForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getForecast = useCallback(async () => {
    if (!AIService.isEnabled()) {
      setError('AI features are disabled');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Dynamic imports to avoid circular dependencies
      const { AccountService } = await import('../../services/v2/AccountService');
      const { PayableService } = await import('../../services/v2/PayableService');
      const { TrendService } = await import('../../services/v2/TrendService');

      // Get current total balance from all accounts
      const summary = AccountService.getSummary();
      // Net worth = bank balances - credit balances - loan balances
      const currentBalance = summary.netWorth;

      // Get upcoming payables for next 4 weeks
      const today = new Date();
      const payables = PayableService.getUpcoming(28);

      const upcomingPayables = payables.map((p) => ({
        name: p.name,
        amount: p.amount,
        dueDate: p.dueDate,
      }));

      // Get average weekly spending
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const cashFlow = TrendService.getCashFlowSummary(
        thirtyDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      const weeklySpendingAvg = (cashFlow.totalExpenses / 30) * 7;

      // Note: Payables are bills/expenses. For expected income, we'd need
      // a separate income tracking feature. For now, the forecast uses
      // historical income from cashFlow as a basis.
      const expectedIncome: Array<{
        description: string;
        amount: number;
        expectedDate: string;
      }> = [];

      const result = await AIService.getCashFlowForecast(
        currentBalance,
        upcomingPayables.filter(p => p.amount > 0), // Only expenses
        weeklySpendingAvg,
        expectedIncome
      );

      if (result) {
        setForecast(result);
      } else {
        setError('Could not generate forecast');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Forecast generation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { forecast, loading, error, getForecast };
}
