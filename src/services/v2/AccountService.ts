// Account Service for DriftMoney
// Business logic layer for account operations

import { AccountRepository, PayableRepository } from '../../repositories';
import { validateAccountCreate, validateAccountUpdate } from '../../validation';
import type { Account, AccountCreate, AccountUpdate, AccountWithComputed, AccountType } from '../../types/account';
import type { ServiceResult, RecurrenceFrequency } from '../../types/common';
import { success, failure } from '../../types/common';

export interface AccountSummary {
  totalBankBalance: number;
  totalCreditBalance: number;
  totalLoanBalance: number;
  netWorth: number;
  accountCount: number;
  activeAccountCount: number;
}

export interface LoanAccountInfo {
  account: AccountWithComputed;
  percentPaid: number;
  remainingBalance: number;
  principalPaid: number;
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

  getLoanAccounts(activeOnly = true): AccountWithComputed[] {
    return this.getAll({ type: 'loan', activeOnly });
  },

  create(data: AccountCreate): ServiceResult<Account> {
    const validation = validateAccountCreate(data);
    if (!validation.success) {
      return failure(Object.values(validation.errors));
    }

    // For loan accounts, auto-create a recurring payable for payments
    if (data.type === 'loan' && data.loanMonthlyPayment && data.loanPaymentFrequency) {
      const payable = PayableRepository.create({
        name: `${data.name} Payment`,
        amount: data.loanMonthlyPayment,
        dueDate: this.calculateNextPaymentDate(data.loanPaymentFrequency, data.loanPaymentDay),
        isRecurring: true,
        recurrenceRule: {
          frequency: data.loanPaymentFrequency,
          interval: 1,
          dayOfMonth: data.loanPaymentDay,
        },
        notes: `Auto-generated payment for ${data.name}`,
      });

      // Create the account with the linked payable
      const account = AccountRepository.create({
        ...data,
        linkedPayableId: payable.id,
      });
      return success(account);
    }

    const account = AccountRepository.create(data);
    return success(account);
  },

  /**
   * Calculate the next payment date based on frequency and day
   */
  calculateNextPaymentDate(frequency: RecurrenceFrequency, paymentDay?: number): string {
    const today = new Date();
    const day = paymentDay || today.getDate();

    // For monthly, set to the payment day this month or next
    if (frequency === 'monthly' || frequency === 'biweekly') {
      const targetDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (targetDate <= today) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      return targetDate.toISOString().split('T')[0];
    }

    // For weekly, find the next occurrence of that day of week
    if (frequency === 'weekly') {
      const targetDay = (paymentDay || 1) % 7; // 0-6
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);
      return targetDate.toISOString().split('T')[0];
    }

    // Default: tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  },

  update(id: string, data: AccountUpdate): ServiceResult<Account> {
    const validation = validateAccountUpdate(data);
    if (!validation.success) {
      return failure(Object.values(validation.errors));
    }

    const account = AccountRepository.update(id, data);
    if (!account) {
      return failure(['Account not found']);
    }

    return success(account);
  },

  delete(id: string): ServiceResult<void> {
    const account = AccountRepository.findById(id);
    if (!account) {
      return failure(['Account not found']);
    }
    AccountRepository.delete(id);
    return success(undefined);
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
    const totalLoanBalance = AccountRepository.getTotalBalance('loan');

    return {
      totalBankBalance: AccountRepository.getTotalBalance('bank'),
      totalCreditBalance: AccountRepository.getTotalBalance('credit'),
      totalLoanBalance,
      netWorth: AccountRepository.getNetWorth() - totalLoanBalance,
      accountCount: allAccounts.length,
      activeAccountCount: activeAccounts.length,
    };
  },

  getLoanAccountsInfo(): LoanAccountInfo[] {
    const loanAccounts = this.getLoanAccounts();

    return loanAccounts.map((account) => {
      const principal = account.loanPrincipal ?? 0;
      const remainingBalance = account.balance;
      const principalPaid = Math.max(0, principal - remainingBalance);
      const percentPaid = principal > 0 ? Math.round((principalPaid / principal) * 100) : 0;

      return {
        account,
        percentPaid,
        remainingBalance,
        principalPaid,
      };
    });
  },

  getTotalLoanBalance(): number {
    const loanAccounts = this.getLoanAccounts();
    return loanAccounts.reduce((total, acc) => total + acc.balance, 0);
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

    if (account.type === 'loan') {
      const principal = account.loanPrincipal ?? 0;
      computed.loanRemainingBalance = account.balance;
      computed.loanPrincipalPaid = Math.max(0, principal - account.balance);
      computed.loanPercentPaid = principal > 0
        ? Math.round((computed.loanPrincipalPaid / principal) * 100)
        : 0;
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
