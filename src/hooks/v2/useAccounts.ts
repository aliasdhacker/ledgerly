// useAccounts hook for DriftMoney
// Provides account data and operations to React components

import { useState, useCallback, useEffect } from 'react';
import { AccountService } from '../../services/v2';
import type { Account, AccountCreate, AccountUpdate, AccountWithComputed, AccountType } from '../../types/account';
import type { AccountSummary, CreditAccountInfo } from '../../services/v2/AccountService';

interface UseAccountsState {
  accounts: AccountWithComputed[];
  summary: AccountSummary | null;
  loading: boolean;
  error: string | null;
}

interface UseAccountsReturn extends UseAccountsState {
  refresh: () => void;
  getById: (id: string) => AccountWithComputed | null;
  getBankAccounts: () => AccountWithComputed[];
  getCreditAccounts: () => AccountWithComputed[];
  getCreditAccountsInfo: () => CreditAccountInfo[];
  create: (data: AccountCreate) => { success: boolean; account?: Account; errors?: string[] };
  update: (id: string, data: AccountUpdate) => { success: boolean; account?: Account; errors?: string[] };
  remove: (id: string) => boolean;
  adjustBalance: (id: string, adjustment: number) => Account | null;
}

export function useAccounts(options: { type?: AccountType; activeOnly?: boolean } = {}): UseAccountsReturn {
  const [state, setState] = useState<UseAccountsState>({
    accounts: [],
    summary: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const accounts = AccountService.getAll(options);
      const summary = AccountService.getSummary();
      setState({ accounts, summary, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load accounts',
      }));
    }
  }, [options.type, options.activeOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback((id: string) => {
    return AccountService.getById(id);
  }, []);

  const getBankAccounts = useCallback(() => {
    return AccountService.getBankAccounts();
  }, []);

  const getCreditAccounts = useCallback(() => {
    return AccountService.getCreditAccounts();
  }, []);

  const getCreditAccountsInfo = useCallback(() => {
    return AccountService.getCreditAccountsInfo();
  }, []);

  const create = useCallback((data: AccountCreate) => {
    const result = AccountService.create(data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const update = useCallback((id: string, data: AccountUpdate) => {
    const result = AccountService.update(id, data);
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const success = AccountService.delete(id);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  const adjustBalance = useCallback((id: string, adjustment: number) => {
    const account = AccountService.adjustBalance(id, adjustment);
    if (account) {
      refresh();
    }
    return account;
  }, [refresh]);

  return {
    ...state,
    refresh,
    getById,
    getBankAccounts,
    getCreditAccounts,
    getCreditAccountsInfo,
    create,
    update,
    remove,
    adjustBalance,
  };
}

// Simple hook for just the summary
export function useAccountSummary(): AccountSummary | null {
  const [summary, setSummary] = useState<AccountSummary | null>(null);

  useEffect(() => {
    setSummary(AccountService.getSummary());
  }, []);

  return summary;
}
