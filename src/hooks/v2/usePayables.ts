// usePayables hook for DriftMoney
// Provides payable (bill) data and operations to React components

import { useState, useCallback, useEffect } from 'react';
import { PayableService } from '../../services/v2';
import type { Payable, PayableCreate, PayableUpdate, PayablePayment, PayableWithStatus } from '../../types/payable';
import type { Transaction } from '../../types/transaction';
import type { PayableSummary } from '../../services/v2/PayableService';

interface UsePayablesState {
  payables: PayableWithStatus[];
  summary: PayableSummary | null;
  loading: boolean;
  error: string | null;
}

interface MarkPaidResult {
  payable: Payable;
  transaction: Transaction;
  nextPayable?: Payable;
}

interface UsePayablesReturn extends UsePayablesState {
  refresh: () => void;
  getById: (id: string) => PayableWithStatus | null;
  getUpcoming: (days?: number) => PayableWithStatus[];
  getOverdue: () => PayableWithStatus[];
  create: (data: PayableCreate) => { success: boolean; data?: Payable; errors?: string[] };
  update: (id: string, data: PayableUpdate) => { success: boolean; data?: Payable; errors?: string[] };
  remove: (id: string) => { success: boolean; errors?: string[] };
  markPaid: (payment: PayablePayment) => { success: boolean; data?: MarkPaidResult; errors?: string[] };
  markUnpaid: (id: string) => { success: boolean; data?: Payable; errors?: string[] };
}

export function usePayables(options: { isPaid?: boolean; categoryId?: string } = {}): UsePayablesReturn {
  const [state, setState] = useState<UsePayablesState>({
    payables: [],
    summary: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const payables = PayableService.getAll(options);
      const summary = PayableService.getSummary();
      setState({ payables, summary, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load payables',
      }));
    }
  }, [options.isPaid, options.categoryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback((id: string) => {
    return PayableService.getById(id);
  }, []);

  const getUpcoming = useCallback((days = 30) => {
    return PayableService.getUpcoming(days);
  }, []);

  const getOverdue = useCallback(() => {
    return PayableService.getOverdue();
  }, []);

  const create = useCallback((data: PayableCreate) => {
    const result = PayableService.create(data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const update = useCallback((id: string, data: PayableUpdate) => {
    const result = PayableService.update(id, data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const success = PayableService.delete(id);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  const markPaid = useCallback((payment: PayablePayment) => {
    const result = PayableService.markPaid(payment);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const markUnpaid = useCallback((id: string) => {
    const result = PayableService.markUnpaid(id);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  return {
    ...state,
    refresh,
    getById,
    getUpcoming,
    getOverdue,
    create,
    update,
    remove,
    markPaid,
    markUnpaid,
  };
}

// Hook for unpaid payables only
export function useUnpaidPayables(): {
  payables: PayableWithStatus[];
  loading: boolean;
  refresh: () => void;
} {
  const [payables, setPayables] = useState<PayableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const data = PayableService.getUnpaid();
    setPayables(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const data = PayableService.getUnpaid();
    if (!cancelled) {
      setPayables(data);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return { payables, loading, refresh };
}

// Hook for upcoming payables with days parameter
export function useUpcomingPayables(days = 30): {
  payables: PayableWithStatus[];
  total: number;
  loading: boolean;
} {
  const [payables, setPayables] = useState<PayableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const upcoming = PayableService.getUpcoming(days);
    if (!cancelled) {
      setPayables(upcoming);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [days]);

  const total = payables.reduce((sum, p) => sum + p.amount, 0);

  return { payables, total, loading };
}
