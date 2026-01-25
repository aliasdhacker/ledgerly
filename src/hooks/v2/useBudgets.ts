// useBudgets hook for DriftMoney
// Provides budget data and operations to React components

import { useState, useCallback, useEffect } from 'react';
import { BudgetService } from '../../services/v2';
import type { Budget, BudgetCreate, BudgetUpdate, BudgetProgress } from '../../types/budget';
import type { BudgetSummary } from '../../services/v2/BudgetService';

interface UseBudgetsState {
  budgets: Budget[];
  progress: BudgetProgress[];
  summary: BudgetSummary | null;
  loading: boolean;
  error: string | null;
}

interface UseBudgetsReturn extends UseBudgetsState {
  refresh: () => void;
  getById: (id: string) => Budget | null;
  getProgress: (id: string) => BudgetProgress | null;
  getAlerts: () => BudgetProgress[];
  create: (data: BudgetCreate) => { success: boolean; data?: Budget; errors?: string[] };
  update: (id: string, data: BudgetUpdate) => { success: boolean; data?: Budget; errors?: string[] };
  remove: (id: string) => { success: boolean; errors?: string[] };
}

export function useBudgets(): UseBudgetsReturn {
  const [state, setState] = useState<UseBudgetsState>({
    budgets: [],
    progress: [],
    summary: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const budgets = BudgetService.getActive();
      const progress = BudgetService.getAllProgress();
      const summary = BudgetService.getSummary();
      setState({ budgets, progress, summary, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load budgets',
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback((id: string) => {
    return BudgetService.getById(id);
  }, []);

  const getProgress = useCallback((id: string) => {
    return BudgetService.getProgress(id);
  }, []);

  const getAlerts = useCallback(() => {
    return BudgetService.getAlerts();
  }, []);

  const create = useCallback((data: BudgetCreate) => {
    const result = BudgetService.create(data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const update = useCallback((id: string, data: BudgetUpdate) => {
    const result = BudgetService.update(id, data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const success = BudgetService.delete(id);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  return {
    ...state,
    refresh,
    getById,
    getProgress,
    getAlerts,
    create,
    update,
    remove,
  };
}

// Hook for budget progress only
export function useBudgetProgress(): {
  progress: BudgetProgress[];
  alerts: BudgetProgress[];
  loading: boolean;
} {
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [alerts, setAlerts] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const progressData = BudgetService.getAllProgress();
    const alertsData = BudgetService.getAlerts();
    if (!cancelled) {
      setProgress(progressData);
      setAlerts(alertsData);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return { progress, alerts, loading };
}
