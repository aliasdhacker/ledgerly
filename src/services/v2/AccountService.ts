// Account Service for DriftMoney
// Business logic layer for account operations

import { AccountRepository } from '../../repositories';
import { validateAccountCreate, validateAccountUpdate } from '../../validation';
import type { Account, AccountCreate, AccountUpdate, AccountWithComputed, AccountType } from '../../types/account';

export interface AccountSummary {
  totalBankBalance: number;
  totalCreditBalance: number;
  netWorth: number;
  accountCount: number;
  activeAccountCount: number;
}

export interface CreditAccountInfo {
  account: AccountWithComputed;
  utilizationPercent: number;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export const AccountService = {
  // CRUD Operations
  getById(id: string): AccountWithComputed | null {
    const account = AccountRepository.findById(id);
    if (!account) return null;
    return this.addComputedFields(account);
  },

  getAll(options: { type?: AccountType; activeOnly?: boolean } = {}): AccountWithComputed[] {
    const accounts = AccountRepository.findAll({
      type: options.type,
      isActive: options.activeOnly,
    });
    return accounts.map((a) => this.addComputedFields(a));
  },

  getBankAccounts(activeOnly = true): AccountWithComputed[] {
    return this.getAll({ type: 'bank', activeOnly });
  },

  getCreditAccounts(activeOnly = true): AccountWithComputed[] {
    return this.getAll({ type: 'credit', activeOnly });
  },

  create(data: AccountCreate): { success: true; account: Account } | { success: false; errors: string[] } {
    const validation = validateAccountCreate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    const account = AccountRepository.create(data);
    return { success: true, account };
  },

  update(id: string, data: AccountUpdate): { success: true; account: Account } | { success: false; errors: string[] } {
    const validation = validateAccountUpdate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    const account = AccountRepository.update(id, data);
    if (!account) {
      return { success: false, errors: ['Account not found'] };
    }

    return { success: true, account };
  },

  delete(id: string): boolean {
    const account = AccountRepository.findById(id);
    if (!account) return false;
    AccountRepository.delete(id);
    return true;
  },

  // Balance Operations
  updateBalance(id: string, newBalance: number): Account | null {
    return AccountRepository.updateBalance(id, newBalance);
  },

  adjustBalance(id: string, adjustment: number): Account | null {
    const account = AccountRepository.findById(id);
    if (!account) return null;
    return AccountRepository.updateBalance(id, account.balance + adjustment);
  },

  // Reconciliation
  reconcile(id: string, statementBalance: number): Account | null {
    const account = AccountRepository.findById(id);
    if (!account) return null;

    return AccountRepository.update(id, {
      reconciledBalance: statementBalance,
      reconciledDate: new Date().toISOString().split('T')[0],
    });
  },

  getUnreconciledDifference(id: string): number | null {
    const account = AccountRepository.findById(id);
    if (!account || account.reconciledBalance === undefined) return null;
    return account.balance - account.reconciledBalance;
  },

  // Summary & Analytics
  getSummary(): AccountSummary {
    const allAccounts = AccountRepository.findAll();
    const activeAccounts = allAccounts.filter((a) => a.isActive);

    return {
      totalBankBalance: AccountRepository.getTotalBalance('bank'),
      totalCreditBalance: AccountRepository.getTotalBalance('credit'),
      netWorth: AccountRepository.getNetWorth(),
      accountCount: allAccounts.length,
      activeAccountCount: activeAccounts.length,
    };
  },

  getCreditAccountsInfo(): CreditAccountInfo[] {
    const creditAccounts = this.getCreditAccounts();
    const today = new Date();
    const currentDay = today.getDate();

    return creditAccounts.map((account) => {
      const utilizationPercent = account.creditLimit
        ? Math.round((account.balance / account.creditLimit) * 100)
        : 0;

      let daysUntilDue: number | null = null;
      let isOverdue = false;

      if (account.paymentDueDay !== undefined) {
        const dueDay = account.paymentDueDay;
        if (currentDay < dueDay) {
          daysUntilDue = dueDay - currentDay;
        } else if (currentDay > dueDay) {
          // Due day passed this month, next is next month
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          daysUntilDue = daysInMonth - currentDay + dueDay;
          // If balance exists and we're past due day, it's overdue
          if (account.balance > 0) {
            isOverdue = true;
          }
        } else {
          daysUntilDue = 0; // Due today
        }
      }

      return {
        account,
        utilizationPercent,
        daysUntilDue,
        isOverdue,
      };
    });
  },

  getTotalCreditAvailable(): number {
    const creditAccounts = this.getCreditAccounts();
    return creditAccounts.reduce((total, acc) => {
      return total + (acc.availableCredit ?? 0);
    }, 0);
  },

  // Helpers
  addComputedFields(account: Account): AccountWithComputed {
    const computed: AccountWithComputed = { ...account };

    if (account.type === 'credit' && account.creditLimit !== undefined) {
      computed.availableCredit = account.creditLimit - account.balance;
    }

    if (account.type === 'credit' && account.paymentDueDay !== undefined) {
      const today = new Date().getDate();
      computed.isOverdue = account.balance > 0 && today > account.paymentDueDay;
    }

    return computed;
  },

  // Sorting
  reorder(accountIds: string[]): void {
    accountIds.forEach((id, index) => {
      AccountRepository.update(id, { sortOrder: index });
    });
  },

  // Deactivation (soft)
  deactivate(id: string): Account | null {
    return AccountRepository.update(id, { isActive: false });
  },

  activate(id: string): Account | null {
    return AccountRepository.update(id, { isActive: true });
  },
};
