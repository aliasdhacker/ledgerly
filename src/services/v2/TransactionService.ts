// Transaction Service for DriftMoney
// Business logic layer for transaction operations with automatic balance sync

import { TransactionRepository, AccountRepository } from '../../repositories';
import { validateTransactionCreate, validateTransactionUpdate } from '../../validation';
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionSplit,
  TransactionWithRelations,
} from '../../types/transaction';
import { TransactionType } from '../../types/common';

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  transactionCount: number;
}

export interface TransactionFilters {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: TransactionType;
  limit?: number;
  offset?: number;
}

export const TransactionService = {
  // CRUD Operations
  getById(id: string): Transaction | null {
    return TransactionRepository.findById(id);
  },

  getWithRelations(id: string): TransactionWithRelations | null {
    const transaction = TransactionRepository.findById(id);
    if (!transaction) return null;

    const result: TransactionWithRelations = { ...transaction };

    // Load account info
    const account = AccountRepository.findById(transaction.accountId);
    if (account) {
      result.account = {
        id: account.id,
        name: account.name,
        type: account.type,
      };
    }

    // Load splits if transaction is split
    if (transaction.isSplit) {
      result.splits = TransactionRepository.findSplits(id);
    }

    return result;
  },

  getAll(filters: TransactionFilters = {}): Transaction[] {
    return TransactionRepository.findAll(filters);
  },

  getByAccount(accountId: string, limit?: number): Transaction[] {
    return TransactionRepository.findByAccount(accountId, limit);
  },

  getByDateRange(startDate: string, endDate: string, accountId?: string): Transaction[] {
    return TransactionRepository.findAll({ startDate, endDate, accountId });
  },

  getRecent(limit = 20): Transaction[] {
    return TransactionRepository.findAll({ limit });
  },

  /**
   * Creates a transaction and updates the account balance
   * DEBIT decreases bank balance / increases credit balance
   * CREDIT increases bank balance / decreases credit balance
   */
  create(
    data: TransactionCreate
  ): { success: true; transaction: Transaction } | { success: false; errors: string[] } {
    const validation = validateTransactionCreate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    // Verify account exists
    const account = AccountRepository.findById(data.accountId);
    if (!account) {
      return { success: false, errors: ['Account not found'] };
    }

    // Create the transaction
    const transaction = TransactionRepository.create(data);

    // Update account balance
    const balanceChange = this.calculateBalanceChange(data.type, data.amount, account.type);
    AccountRepository.updateBalance(data.accountId, account.balance + balanceChange);

    return { success: true, transaction };
  },

  /**
   * Updates a transaction and adjusts account balance if amount/type changed
   */
  update(
    id: string,
    data: TransactionUpdate
  ): { success: true; transaction: Transaction } | { success: false; errors: string[] } {
    const validation = validateTransactionUpdate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    const existing = TransactionRepository.findById(id);
    if (!existing) {
      return { success: false, errors: ['Transaction not found'] };
    }

    const account = AccountRepository.findById(existing.accountId);
    if (!account) {
      return { success: false, errors: ['Account not found'] };
    }

    // Calculate balance adjustment if amount or type changed
    const newType = data.type ?? existing.type;
    const newAmount = data.amount ?? existing.amount;

    if (data.type !== undefined || data.amount !== undefined) {
      // Reverse the old transaction effect
      const oldBalanceChange = this.calculateBalanceChange(existing.type, existing.amount, account.type);
      // Apply the new transaction effect
      const newBalanceChange = this.calculateBalanceChange(newType, newAmount, account.type);
      const netChange = newBalanceChange - oldBalanceChange;

      if (netChange !== 0) {
        AccountRepository.updateBalance(existing.accountId, account.balance + netChange);
      }
    }

    const transaction = TransactionRepository.update(id, data);
    if (!transaction) {
      return { success: false, errors: ['Failed to update transaction'] };
    }

    return { success: true, transaction };
  },

  /**
   * Deletes a transaction and reverses the account balance change
   */
  delete(id: string): boolean {
    const transaction = TransactionRepository.findById(id);
    if (!transaction) return false;

    const account = AccountRepository.findById(transaction.accountId);
    if (account) {
      // Reverse the transaction effect
      const balanceChange = this.calculateBalanceChange(
        transaction.type,
        transaction.amount,
        account.type
      );
      AccountRepository.updateBalance(transaction.accountId, account.balance - balanceChange);
    }

    TransactionRepository.delete(id);
    return true;
  },

  // Split Operations
  getSplits(transactionId: string): TransactionSplit[] {
    return TransactionRepository.findSplits(transactionId);
  },

  addSplit(
    transactionId: string,
    data: Omit<TransactionSplit, 'id' | 'transactionId'>
  ): TransactionSplit | null {
    const transaction = TransactionRepository.findById(transactionId);
    if (!transaction) return null;

    const split = TransactionRepository.createSplit(transactionId, data);

    // Mark transaction as split
    if (!transaction.isSplit) {
      TransactionRepository.update(transactionId, { isSplit: true });
    }

    return split;
  },

  // Reconciliation
  markReconciled(id: string): Transaction | null {
    return TransactionRepository.update(id, { isReconciled: true });
  },

  markUnreconciled(id: string): Transaction | null {
    return TransactionRepository.update(id, { isReconciled: false });
  },

  // Analytics
  getSummary(accountId?: string, startDate?: string, endDate?: string): TransactionSummary {
    const transactions = TransactionRepository.findAll({
      accountId,
      startDate,
      endDate,
    });

    let totalCredits = 0;
    let totalDebits = 0;

    for (const t of transactions) {
      if (t.type === TransactionType.CREDIT) {
        totalCredits += t.amount;
      } else {
        totalDebits += t.amount;
      }
    }

    return {
      totalCredits,
      totalDebits,
      netChange: totalCredits - totalDebits,
      transactionCount: transactions.length,
    };
  },

  sumByCategory(
    categoryId: string,
    startDate?: string,
    endDate?: string
  ): { credits: number; debits: number; net: number } {
    const transactions = TransactionRepository.findAll({
      categoryId,
      startDate,
      endDate,
    });

    let credits = 0;
    let debits = 0;

    for (const t of transactions) {
      if (t.type === TransactionType.CREDIT) {
        credits += t.amount;
      } else {
        debits += t.amount;
      }
    }

    return { credits, debits, net: credits - debits };
  },

  // Helpers

  /**
   * Calculates how a transaction affects the account balance
   * Bank accounts: CREDIT increases, DEBIT decreases
   * Credit accounts: CREDIT decreases (payment), DEBIT increases (charge)
   */
  calculateBalanceChange(
    transactionType: TransactionType,
    amount: number,
    accountType: 'bank' | 'credit'
  ): number {
    if (accountType === 'bank') {
      // Bank account: credit = +, debit = -
      return transactionType === TransactionType.CREDIT ? amount : -amount;
    } else {
      // Credit account: credit = - (payment reduces balance), debit = + (charge increases balance)
      return transactionType === TransactionType.CREDIT ? -amount : amount;
    }
  },

  /**
   * Recalculates account balance from all transactions
   * Useful for fixing balance discrepancies
   */
  recalculateAccountBalance(accountId: string): number | null {
    const account = AccountRepository.findById(accountId);
    if (!account) return null;

    const credits = TransactionRepository.sumByType(accountId, TransactionType.CREDIT);
    const debits = TransactionRepository.sumByType(accountId, TransactionType.DEBIT);

    let newBalance: number;
    if (account.type === 'bank') {
      newBalance = credits - debits;
    } else {
      newBalance = debits - credits;
    }

    AccountRepository.updateBalance(accountId, newBalance);
    return newBalance;
  },

  // Duplicate detection (for imports)
  findPotentialDuplicate(
    accountId: string,
    amount: number,
    date: string,
    description?: string
  ): Transaction | null {
    const transactions = TransactionRepository.findAll({
      accountId,
      startDate: date,
      endDate: date,
    });

    // Look for exact amount match on same date
    for (const t of transactions) {
      if (t.amount === amount) {
        // If description provided, check it too
        if (description && t.description !== description) continue;
        return t;
      }
    }

    return null;
  },
};
