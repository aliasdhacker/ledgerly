// Transfer Service for DriftMoney
// Business logic for transferring money between accounts

import { TransferRepository, AccountRepository } from '../../repositories';
import { withTransaction } from '../../db';
import type { Transfer, TransferCreate } from '../../types/transaction';
import type { ServiceResult } from '../../types/common';
import { success, failure } from '../../types/common';

export interface TransferResult {
  transfer: Transfer;
  fromAccountNewBalance: number;
  toAccountNewBalance: number;
}

export const TransferService = {
  // CRUD Operations
  getById(id: string): Transfer | null {
    return TransferRepository.findById(id);
  },

  getAll(): Transfer[] {
    return TransferRepository.findAll();
  },

  getByAccount(accountId: string): Transfer[] {
    return TransferRepository.findByAccount(accountId);
  },

  /**
   * Creates a transfer between two accounts
   * This creates:
   * - A DEBIT transaction on the source account (money leaving)
   * - A CREDIT transaction on the destination account (money arriving)
   * - A transfer record linking them
   * And updates both account balances atomically
   */
  create(data: TransferCreate): ServiceResult<TransferResult> {
    // Validation
    if (!data.fromAccountId || !data.toAccountId) {
      return failure(['Both accounts are required']);
    }

    if (data.fromAccountId === data.toAccountId) {
      return failure(['Cannot transfer to the same account']);
    }

    if (!data.amount || data.amount <= 0) {
      return failure(['Amount must be positive']);
    }

    if (!data.date) {
      return failure(['Date is required']);
    }

    // Verify accounts exist (before transaction)
    const fromAccount = AccountRepository.findById(data.fromAccountId);
    if (!fromAccount) {
      return failure(['Source account not found']);
    }

    const toAccount = AccountRepository.findById(data.toAccountId);
    if (!toAccount) {
      return failure(['Destination account not found']);
    }

    // Check for insufficient funds in bank accounts
    if (fromAccount.type === 'bank' && fromAccount.balance < data.amount) {
      return failure(['Insufficient funds in source account']);
    }

    try {
      // Wrap entire operation in transaction for atomicity
      const result = withTransaction(() => {
        // Create the transfer (this creates the transactions too)
        const transfer = TransferRepository.createWithTransactions(data);

        // Calculate balance adjustments
        // For bank accounts: DEBIT decreases, CREDIT increases
        // For credit accounts: DEBIT increases (charge), CREDIT decreases (payment)
        const fromDelta = fromAccount.type === 'bank' ? -data.amount : data.amount;
        const toDelta = toAccount.type === 'bank' ? data.amount : -data.amount;

        // Use atomic balance adjustments
        const fromSuccess = AccountRepository.atomicAdjustBalance(data.fromAccountId, fromDelta);
        if (!fromSuccess) {
          throw new Error('Failed to update source account balance');
        }

        const toSuccess = AccountRepository.atomicAdjustBalance(data.toAccountId, toDelta);
        if (!toSuccess) {
          throw new Error('Failed to update destination account balance');
        }

        // Get updated balances for return value
        const updatedFrom = AccountRepository.findById(data.fromAccountId);
        const updatedTo = AccountRepository.findById(data.toAccountId);

        return {
          transfer,
          fromAccountNewBalance: updatedFrom?.balance ?? 0,
          toAccountNewBalance: updatedTo?.balance ?? 0,
        };
      });

      return success(result);
    } catch (error) {
      return failure([error instanceof Error ? error.message : 'Transfer failed']);
    }
  },

  /**
   * Deletes a transfer and reverses the account balance changes atomically
   */
  delete(id: string): ServiceResult<void> {
    const transfer = TransferRepository.findById(id);
    if (!transfer) {
      return failure(['Transfer not found']);
    }

    const fromAccount = AccountRepository.findById(transfer.fromAccountId);
    const toAccount = AccountRepository.findById(transfer.toAccountId);

    try {
      withTransaction(() => {
        // Reverse balance changes using atomic adjustments
        if (fromAccount) {
          // Reverse: bank gets money back (+), credit account reduces (-)
          const fromDelta = fromAccount.type === 'bank' ? transfer.amount : -transfer.amount;
          AccountRepository.atomicAdjustBalance(transfer.fromAccountId, fromDelta);
        }

        if (toAccount) {
          // Reverse: bank loses money (-), credit account increases (+)
          const toDelta = toAccount.type === 'bank' ? -transfer.amount : transfer.amount;
          AccountRepository.atomicAdjustBalance(transfer.toAccountId, toDelta);
        }

        TransferRepository.delete(id);
      });
      return success(undefined);
    } catch (error) {
      return failure([error instanceof Error ? error.message : 'Failed to delete transfer']);
    }
  },

  // Helpers

  /**
   * Gets all transfers for display with account names
   * Uses batch loading to avoid N+1 queries
   */
  getAllWithAccounts(): (Transfer & { fromAccountName: string; toAccountName: string })[] {
    const transfers = TransferRepository.findAll();

    // Batch load all accounts in single query (avoids N+1)
    const accounts = AccountRepository.findAll();
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    return transfers.map((t) => ({
      ...t,
      fromAccountName: accountMap.get(t.fromAccountId) ?? 'Unknown',
      toAccountName: accountMap.get(t.toAccountId) ?? 'Unknown',
    }));
  },

  /**
   * Common transfer: Pay credit card from bank account
   */
  payCreditCard(
    bankAccountId: string,
    creditAccountId: string,
    amount: number,
    date?: string
  ): ServiceResult<TransferResult> {
    return this.create({
      fromAccountId: bankAccountId,
      toAccountId: creditAccountId,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      description: 'Credit card payment',
    });
  },
};
