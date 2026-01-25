// Transfer Service for DriftMoney
// Business logic for transferring money between accounts

import { TransferRepository, AccountRepository } from '../../repositories';
import type { Transfer, TransferCreate } from '../../types/transaction';

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
   * And updates both account balances
   */
  create(
    data: TransferCreate
  ): { success: true; result: TransferResult } | { success: false; errors: string[] } {
    // Validation
    if (!data.fromAccountId || !data.toAccountId) {
      return { success: false, errors: ['Both accounts are required'] };
    }

    if (data.fromAccountId === data.toAccountId) {
      return { success: false, errors: ['Cannot transfer to the same account'] };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, errors: ['Amount must be positive'] };
    }

    if (!data.date) {
      return { success: false, errors: ['Date is required'] };
    }

    // Verify accounts exist
    const fromAccount = AccountRepository.findById(data.fromAccountId);
    if (!fromAccount) {
      return { success: false, errors: ['Source account not found'] };
    }

    const toAccount = AccountRepository.findById(data.toAccountId);
    if (!toAccount) {
      return { success: false, errors: ['Destination account not found'] };
    }

    // Create the transfer (this creates the transactions too)
    const transfer = TransferRepository.createWithTransactions(data);

    // Update account balances
    // For bank accounts: DEBIT decreases, CREDIT increases
    // For credit accounts: DEBIT increases (charge), CREDIT decreases (payment)

    let fromNewBalance: number;
    let toNewBalance: number;

    if (fromAccount.type === 'bank') {
      // Money leaving bank account (DEBIT)
      fromNewBalance = fromAccount.balance - data.amount;
    } else {
      // Money leaving credit account = payment to another account increases credit balance
      fromNewBalance = fromAccount.balance + data.amount;
    }

    if (toAccount.type === 'bank') {
      // Money arriving to bank account (CREDIT)
      toNewBalance = toAccount.balance + data.amount;
    } else {
      // Money arriving to credit account = payment reduces balance
      toNewBalance = toAccount.balance - data.amount;
    }

    AccountRepository.updateBalance(data.fromAccountId, fromNewBalance);
    AccountRepository.updateBalance(data.toAccountId, toNewBalance);

    return {
      success: true,
      result: {
        transfer,
        fromAccountNewBalance: fromNewBalance,
        toAccountNewBalance: toNewBalance,
      },
    };
  },

  /**
   * Deletes a transfer and reverses the account balance changes
   */
  delete(id: string): boolean {
    const transfer = TransferRepository.findById(id);
    if (!transfer) return false;

    const fromAccount = AccountRepository.findById(transfer.fromAccountId);
    const toAccount = AccountRepository.findById(transfer.toAccountId);

    // Reverse balance changes
    if (fromAccount) {
      if (fromAccount.type === 'bank') {
        // Reverse: add back the money that was debited
        AccountRepository.updateBalance(transfer.fromAccountId, fromAccount.balance + transfer.amount);
      } else {
        // Reverse: subtract the charge that was added
        AccountRepository.updateBalance(transfer.fromAccountId, fromAccount.balance - transfer.amount);
      }
    }

    if (toAccount) {
      if (toAccount.type === 'bank') {
        // Reverse: subtract the money that was credited
        AccountRepository.updateBalance(transfer.toAccountId, toAccount.balance - transfer.amount);
      } else {
        // Reverse: add back the balance that was reduced
        AccountRepository.updateBalance(transfer.toAccountId, toAccount.balance + transfer.amount);
      }
    }

    TransferRepository.delete(id);
    return true;
  },

  // Helpers

  /**
   * Gets all transfers for display with account names
   */
  getAllWithAccounts(): Array<Transfer & { fromAccountName: string; toAccountName: string }> {
    const transfers = TransferRepository.findAll();
    return transfers.map((t) => {
      const fromAccount = AccountRepository.findById(t.fromAccountId);
      const toAccount = AccountRepository.findById(t.toAccountId);
      return {
        ...t,
        fromAccountName: fromAccount?.name ?? 'Unknown',
        toAccountName: toAccount?.name ?? 'Unknown',
      };
    });
  },

  /**
   * Common transfer: Pay credit card from bank account
   */
  payCreditCard(
    bankAccountId: string,
    creditAccountId: string,
    amount: number,
    date?: string
  ): { success: true; result: TransferResult } | { success: false; errors: string[] } {
    return this.create({
      fromAccountId: bankAccountId,
      toAccountId: creditAccountId,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      description: 'Credit card payment',
    });
  },
};
