// useTrends hook for DriftMoney
// Provides trend and analytics data to React components

import { useState, useCallback, useEffect } from 'react';
import { TrendService } from '../../services/v2';
import type {
  CategorySpending,
  MonthlyTrend,
  CashFlowSummary,
  SpendingByDayOfWeek,
  PeriodComparison,
} from '../../services/v2/TrendService';

interface UseTrendsState {
  loading: boolean;
  error: string | null;
}

// Hook for spending by category
export function useSpendingByCategory(startDate: string, endDate: string): {
  categories: CategorySpending[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [state, setState] = useState<UseTrendsState>({ loading: true, error: null });

  const refresh = useCallback(() => {
    try {
      setState({ loading: true, error: null });
      const data = TrendService.getSpendingByCategory(startDate, endDate);
      setCategories(data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load category spending',
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, ...state, refresh };
}

// Hook for monthly trend data
export function useMonthlyTrend(months = 6): {
  trends: MonthlyTrend[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [state, setState] = useState<UseTrendsState>({ loading: true, error: null });

  const refresh = useCallback(() => {
    try {
      setState({ loading: true, error: null });
      const data = TrendService.getMonthlyTrend(months);
      setTrends(data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load monthly trends',
      });
    }
  }, [months]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trends, ...state, refresh };
}

// Hook for cash flow summary
export function useCashFlowSummary(startDate: string, endDate: string): {
  summary: CashFlowSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [state, setState] = useState<UseTrendsState>({ loading: true, error: null });

  const refresh = useCallback(() => {
    try {
      setState({ loading: true, error: null });
      const data = TrendService.getCashFlowSummary(startDate, endDate);
      setSummary(data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load cash flow summary',
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, ...state, refresh };
}

// Hook for spending by day of week
export function useSpendingByDayOfWeek(startDate: string, endDate: string): {
  data: SpendingByDayOfWeek[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<SpendingByDayOfWeek[]>([]);
  const [state, setState] = useState<UseTrendsState>({ loading: true, error: null });

  const refresh = useCallback(() => {
    try {
      setState({ loading: true, error: null });
      const result = TrendService.getSpendingByDayOfWeek(startDate, endDate);
      setData(result);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load day of week data',
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, ...state, refresh };
}

// Hook for month-over-month comparison
export function useMonthComparison(): {
  comparison: PeriodComparison | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [state, setState] = useState<UseTrendsState>({ loading: true, error: null });

  const refresh = useCallback(() => {
    try {
      setState({ loading: true, error: null });
      const data = TrendService.compareToLastMonth();
      setComparison(data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to compare months',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { comparison, ...state, refresh };
}

// Hook for this month's spending summary
export function useThisMonthSpending(): {
  categories: CategorySpending[];
  totalSpending: number;
  totalIncome: number;
  loading: boolean;
} {
  const [data, setData] = useState({
    categories: [] as CategorySpending[],
    totalSpending: 0,
    totalIncome: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categories = TrendService.getThisMonthByCategory();
    const totalSpending = TrendService.getThisMonthSpending();
    const totalIncome = TrendService.getThisMonthIncome();

    setData({ categories, totalSpending, totalIncome });
    setLoading(false);
  }, []);

  return { ...data, loading };
}

// Convenience hook for top categories
export function useTopCategories(startDate: string, endDate: string, limit = 5): {
  categories: CategorySpending[];
  loading: boolean;
} {
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCategories(TrendService.getTopCategories(startDate, endDate, limit));
    setLoading(false);
  }, [startDate, endDate, limit]);

  return { categories, loading };
}
