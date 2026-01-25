// useTransactions hook for DriftMoney
// Provides transaction data and operations to React components

import { useState, useCallback, useEffect } from 'react';
import { TransactionService } from '../../services/v2';
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionWithRelations,
} from '../../types/transaction';
import type { TransactionSummary, TransactionFilters } from '../../services/v2/TransactionService';

interface UseTransactionsState {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  loading: boolean;
  error: string | null;
}

interface UseTransactionsReturn extends UseTransactionsState {
  refresh: () => void;
  getById: (id: string) => Transaction | null;
  getWithRelations: (id: string) => TransactionWithRelations | null;
  create: (data: TransactionCreate) => { success: boolean; data?: Transaction; errors?: string[] };
  update: (id: string, data: TransactionUpdate) => { success: boolean; data?: Transaction; errors?: string[] };
  remove: (id: string) => { success: boolean; errors?: string[] };
  markReconciled: (id: string) => Transaction | null;
}

export function useTransactions(filters: TransactionFilters = {}): UseTransactionsReturn {
  const [state, setState] = useState<UseTransactionsState>({
    transactions: [],
    summary: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const transactions = TransactionService.getAll(filters);
      const summary = TransactionService.getSummary(
        filters.accountId,
        filters.startDate,
        filters.endDate
      );
      setState({ transactions, summary, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load transactions',
      }));
    }
  }, [filters.accountId, filters.startDate, filters.endDate, filters.categoryId, filters.type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback((id: string) => {
    return TransactionService.getById(id);
  }, []);

  const getWithRelations = useCallback((id: string) => {
    return TransactionService.getWithRelations(id);
  }, []);

  const create = useCallback((data: TransactionCreate) => {
    const result = TransactionService.create(data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const update = useCallback((id: string, data: TransactionUpdate) => {
    const result = TransactionService.update(id, data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const success = TransactionService.delete(id);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  const markReconciled = useCallback((id: string) => {
    const transaction = TransactionService.markReconciled(id);
    if (transaction) {
      refresh();
    }
    return transaction;
  }, [refresh]);

  return {
    ...state,
    refresh,
    getById,
    getWithRelations,
    create,
    update,
    remove,
    markReconciled,
  };
}

// Hook for recent transactions
export function useRecentTransactions(limit = 20): {
  transactions: Transaction[];
  loading: boolean;
} {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const data = TransactionService.getRecent(limit);
    if (!cancelled) {
      setTransactions(data);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { transactions, loading };
}

// Hook for transactions by account
export function useAccountTransactions(accountId: string, limit?: number): {
  transactions: Transaction[];
  loading: boolean;
  refresh: () => void;
} {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const data = TransactionService.getByAccount(accountId, limit);
    setTransactions(data);
    setLoading(false);
  }, [accountId, limit]);

  useEffect(() => {
    let cancelled = false;
    const data = TransactionService.getByAccount(accountId, limit);
    if (!cancelled) {
      setTransactions(data);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [accountId, limit]);

  return { transactions, loading, refresh };
}
