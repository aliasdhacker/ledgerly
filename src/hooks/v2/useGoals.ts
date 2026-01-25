// useGoals hook for DriftMoney
// Provides goal data and operations to React components

import { useState, useCallback, useEffect } from 'react';
import { GoalService } from '../../services/v2';
import type { Goal, GoalCreate, GoalUpdate, GoalProgress } from '../../types/goal';
import type { GoalSummary } from '../../services/v2/GoalService';

interface UseGoalsState {
  goals: Goal[];
  progress: GoalProgress[];
  summary: GoalSummary | null;
  loading: boolean;
  error: string | null;
}

interface UseGoalsReturn extends UseGoalsState {
  refresh: () => void;
  getById: (id: string) => Goal | null;
  getProgress: (id: string) => GoalProgress | null;
  getBehindSchedule: () => GoalProgress[];
  create: (data: GoalCreate) => { success: boolean; data?: Goal; errors?: string[] };
  update: (id: string, data: GoalUpdate) => { success: boolean; data?: Goal; errors?: string[] };
  remove: (id: string) => { success: boolean; errors?: string[] };
  addAmount: (id: string, amount: number) => { success: boolean; data?: Goal; errors?: string[] };
  withdrawAmount: (id: string, amount: number) => { success: boolean; data?: Goal; errors?: string[] };
}

export function useGoals(options: { activeOnly?: boolean } = { activeOnly: true }): UseGoalsReturn {
  const [state, setState] = useState<UseGoalsState>({
    goals: [],
    progress: [],
    summary: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const goals = options.activeOnly ? GoalService.getActive() : GoalService.getAll();
      const progress = GoalService.getAllProgress();
      const summary = GoalService.getSummary();
      setState({ goals, progress, summary, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load goals',
      }));
    }
  }, [options.activeOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback((id: string) => {
    return GoalService.getById(id);
  }, []);

  const getProgress = useCallback((id: string) => {
    return GoalService.getProgress(id);
  }, []);

  const getBehindSchedule = useCallback(() => {
    return GoalService.getBehindSchedule();
  }, []);

  const create = useCallback((data: GoalCreate) => {
    const result = GoalService.create(data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const update = useCallback((id: string, data: GoalUpdate) => {
    const result = GoalService.update(id, data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const success = GoalService.delete(id);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  const addAmount = useCallback((id: string, amount: number) => {
    const result = GoalService.addAmount(id, amount);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const withdrawAmount = useCallback((id: string, amount: number) => {
    const result = GoalService.withdrawAmount(id, amount);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  return {
    ...state,
    refresh,
    getById,
    getProgress,
    getBehindSchedule,
    create,
    update,
    remove,
    addAmount,
    withdrawAmount,
  };
}

// Hook for goal progress only
export function useGoalProgress(): {
  progress: GoalProgress[];
  behindSchedule: GoalProgress[];
  summary: GoalSummary | null;
  loading: boolean;
} {
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [behindSchedule, setBehindSchedule] = useState<GoalProgress[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const progressData = GoalService.getAllProgress();
    const behindData = GoalService.getBehindSchedule();
    const summaryData = GoalService.getSummary();
    if (!cancelled) {
      setProgress(progressData);
      setBehindSchedule(behindData);
      setSummary(summaryData);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return { progress, behindSchedule, summary, loading };
}
