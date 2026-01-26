// Transaction Service for DriftMoney
// Business logic layer for transaction operations with automatic balance sync

import { TransactionRepository, AccountRepository } from '../../repositories';
import { withTransaction } from '../../db';
import { validateTransactionCreate, validateTransactionUpdate } from '../../validation';
import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionSplit,
  TransactionWithRelations,
} from '../../types/transaction';
import { TransactionType } from '../../types/common';
import type { ServiceResult } from '../../types/common';
import { success, failure } from '../../types/common';

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
   * Creates a transaction and updates the account balance atomically
   * DEBIT decreases bank balance / increases credit balance
   * CREDIT increases bank balance / decreases credit balance
   */
  create(data: TransactionCreate): ServiceResult<Transaction> {
    const validation = validateTransactionCreate(data);
    if (!validation.success) {
      return failure(Object.values(validation.errors));
    }

    // Verify account exists (before transaction)
    const account = AccountRepository.findById(data.accountId);
    if (!account) {
      return failure(['Account not found']);
    }

    // Check for insufficient funds on bank account debits
    if (account.type === 'bank' && data.type === TransactionType.DEBIT && account.balance < data.amount) {
      return failure(['Insufficient funds']);
    }

    try {
      const transaction = withTransaction(() => {
        // Create the transaction
        const txn = TransactionRepository.create(data);

        // Update account balance atomically
        const balanceChange = this.calculateBalanceChange(data.type, data.amount, account.type);
        const balanceSuccess = AccountRepository.atomicAdjustBalance(data.accountId, balanceChange);
        if (!balanceSuccess) {
          throw new Error('Failed to update account balance');
        }

        return txn;
      });

      return success(transaction);
    } catch (error) {
      return failure([error instanceof Error ? error.message : 'Failed to create transaction']);
    }
  },

  /**
   * Updates a transaction and adjusts account balance atomically if amount/type changed
   */
  update(id: string, data: TransactionUpdate): ServiceResult<Transaction> {
    const validation = validateTransactionUpdate(data);
    if (!validation.success) {
      return failure(Object.values(validation.errors));
    }

    const existing = TransactionRepository.findById(id);
    if (!existing) {
      return failure(['Transaction not found']);
    }

    const account = AccountRepository.findById(existing.accountId);
    if (!account) {
      return failure(['Account not found']);
    }

    try {
      const transaction = withTransaction(() => {
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
            const balanceSuccess = AccountRepository.atomicAdjustBalance(existing.accountId, netChange);
            if (!balanceSuccess) {
              throw new Error('Failed to update account balance');
            }
          }
        }

        const txn = TransactionRepository.update(id, data);
        if (!txn) {
          throw new Error('Failed to update transaction');
        }

        return txn;
      });

      return success(transaction);
    } catch (error) {
      return failure([error instanceof Error ? error.message : 'Failed to update transaction']);
    }
  },

  /**
   * Deletes a transaction and reverses the account balance change atomically
   */
  delete(id: string): ServiceResult<void> {
    const transaction = TransactionRepository.findById(id);
    if (!transaction) {
      return failure(['Transaction not found']);
    }

    const account = AccountRepository.findById(transaction.accountId);

    try {
      withTransaction(() => {
        if (account) {
          // Reverse the transaction effect (negate the original change)
          const balanceChange = this.calculateBalanceChange(
            transaction.type,
            transaction.amount,
            account.type
          );
          const balanceSuccess = AccountRepository.atomicAdjustBalance(transaction.accountId, -balanceChange);
          if (!balanceSuccess) {
            throw new Error('Failed to reverse account balance');
          }
        }

        TransactionRepository.delete(id);
      });
      return success(undefined);
    } catch (error) {
      return failure([error instanceof Error ? error.message : 'Failed to delete transaction']);
    }
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
   * Loan accounts: CREDIT decreases (payment), DEBIT increases (fees/additional borrowing)
   */
  calculateBalanceChange(
    transactionType: TransactionType,
    amount: number,
    accountType: 'bank' | 'credit' | 'loan'
  ): number {
    if (accountType === 'bank') {
      // Bank account: credit = +, debit = -
      return transactionType === TransactionType.CREDIT ? amount : -amount;
    } else {
      // Credit/Loan account: credit = - (payment reduces balance), debit = + (charge increases balance)
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
