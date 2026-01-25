// useDraft hook for DriftMoney
// The main "Safe to Spend" hook - the core value of the app

import { useState, useCallback, useEffect } from 'react';
import { DraftService } from '../../services/v2';
import type { DraftResult, DraftCalculationOptions } from '../../services/v2/DraftService';

interface UseDraftState {
  draft: DraftResult | null;
  loading: boolean;
  error: string | null;
}

interface UseDraftReturn extends UseDraftState {
  refresh: () => void;
  calculate: (options?: DraftCalculationOptions) => DraftResult;
  getSafeToSpend: () => number;
  getAvailableBalance: () => number;
  getCreditDebt: () => number;
  getNetWorth: () => number;
}

export function useDraft(options: DraftCalculationOptions = {}): UseDraftReturn {
  const [state, setState] = useState<UseDraftState>({
    draft: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const draft = DraftService.calculate(options);
      setState({ draft, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to calculate draft',
      }));
    }
  }, [options.targetDate, options.includeOverdue, JSON.stringify(options.accountIds)]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const calculate = useCallback((opts?: DraftCalculationOptions) => {
    return DraftService.calculate(opts || options);
  }, [options]);

  const getSafeToSpend = useCallback(() => {
    return DraftService.getSafeToSpend(options.targetDate);
  }, [options.targetDate]);

  const getAvailableBalance = useCallback(() => {
    return DraftService.getAvailableBalance();
  }, []);

  const getCreditDebt = useCallback(() => {
    return DraftService.getCreditDebt();
  }, []);

  const getNetWorth = useCallback(() => {
    return DraftService.getNetWorth();
  }, []);

  return {
    ...state,
    refresh,
    calculate,
    getSafeToSpend,
    getAvailableBalance,
    getCreditDebt,
    getNetWorth,
  };
}

// Simple hook for just the safe-to-spend number
export function useSafeToSpend(targetDate?: string): {
  safeToSpend: number;
  loading: boolean;
} {
  const [safeToSpend, setSafeToSpend] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const value = DraftService.getSafeToSpend(targetDate);
    if (!cancelled) {
      setSafeToSpend(value);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [targetDate]);

  return { safeToSpend, loading };
}

// Hook for quick financial overview
export function useFinancialOverview(): {
  availableBalance: number;
  creditDebt: number;
  netWorth: number;
  upcomingPayables: number;
  overduePayables: number;
  loading: boolean;
} {
  const [data, setData] = useState({
    availableBalance: 0,
    creditDebt: 0,
    netWorth: 0,
    upcomingPayables: 0,
    overduePayables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const overview = {
      availableBalance: DraftService.getAvailableBalance(),
      creditDebt: DraftService.getCreditDebt(),
      netWorth: DraftService.getNetWorth(),
      upcomingPayables: DraftService.getUpcomingTotal(30),
      overduePayables: DraftService.getOverdueTotal(),
    };
    if (!cancelled) {
      setData(overview);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading };
}

// Hook for "until payday" calculation
export function useUntilPayday(payday: number): {
  safeToSpend: number;
  daysUntilPayday: number;
  payablesUntilPayday: number;
  loading: boolean;
} {
  const [data, setData] = useState({
    safeToSpend: 0,
    daysUntilPayday: 0,
    payablesUntilPayday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const result = DraftService.calculateUntilPayday(payday);
    if (!cancelled) {
      setData(result);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [payday]);

  return { ...data, loading };
}
