// Payable Service for DriftMoney
// Business logic for bills (recurring and one-off) with recurrence generation

import { PayableRepository, TransactionRepository, AccountRepository } from '../../repositories';
import { validatePayableCreate, validatePayableUpdate } from '../../validation';
import { TransactionService } from './TransactionService';
import type { Payable, PayableCreate, PayableUpdate, PayablePayment, PayableWithStatus } from '../../types/payable';
import type { Transaction } from '../../types/transaction';
import { TransactionType, RecurrenceFrequency } from '../../types/common';

export interface PayableSummary {
  upcomingCount: number;
  upcomingTotal: number;
  overdueCount: number;
  overdueTotal: number;
  paidThisMonthCount: number;
  paidThisMonthTotal: number;
}

export const PayableService = {
  // CRUD Operations
  getById(id: string): PayableWithStatus | null {
    const payable = PayableRepository.findById(id);
    if (!payable) return null;
    return this.addStatusFields(payable);
  },

  getAll(options: { isPaid?: boolean; categoryId?: string } = {}): PayableWithStatus[] {
    const payables = PayableRepository.findAll(options);
    return payables.map((p) => this.addStatusFields(p));
  },

  getUpcoming(days = 30): PayableWithStatus[] {
    const payables = PayableRepository.findUpcoming(days);
    return payables.map((p) => this.addStatusFields(p));
  },

  getOverdue(): PayableWithStatus[] {
    const payables = PayableRepository.findOverdue();
    return payables.map((p) => this.addStatusFields(p));
  },

  getUnpaid(): PayableWithStatus[] {
    const payables = PayableRepository.findAll({ isPaid: false });
    return payables.map((p) => this.addStatusFields(p));
  },

  create(data: PayableCreate): { success: true; payable: Payable } | { success: false; errors: string[] } {
    const validation = validatePayableCreate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    const payable = PayableRepository.create(data);
    return { success: true, payable };
  },

  update(id: string, data: PayableUpdate): { success: true; payable: Payable } | { success: false; errors: string[] } {
    const validation = validatePayableUpdate(data);
    if (!validation.success) {
      return { success: false, errors: Object.values(validation.errors) };
    }

    const payable = PayableRepository.update(id, data);
    if (!payable) {
      return { success: false, errors: ['Payable not found'] };
    }

    return { success: true, payable };
  },

  delete(id: string): boolean {
    const payable = PayableRepository.findById(id);
    if (!payable) return false;
    PayableRepository.delete(id);
    return true;
  },

  /**
   * Marks a payable as paid, creates a transaction, and generates next recurring instance
   */
  markPaid(
    payment: PayablePayment
  ): { success: true; payable: Payable; transaction: Transaction; nextPayable?: Payable } | { success: false; errors: string[] } {
    const payable = PayableRepository.findById(payment.payableId);
    if (!payable) {
      return { success: false, errors: ['Payable not found'] };
    }

    if (payable.isPaid) {
      return { success: false, errors: ['Payable is already paid'] };
    }

    const account = AccountRepository.findById(payment.paidFromAccountId);
    if (!account) {
      return { success: false, errors: ['Account not found'] };
    }

    const paidDate = payment.paidDate || new Date().toISOString().split('T')[0];
    const amount = payment.actualAmount ?? payable.amount;

    // Create the transaction (DEBIT from bank account)
    const transactionResult = TransactionService.create({
      accountId: payment.paidFromAccountId,
      type: TransactionType.DEBIT,
      amount,
      description: `Bill: ${payable.name}`,
      date: paidDate,
      categoryId: payable.categoryId,
      linkedPayableId: payable.id,
      notes: payment.notes,
    });

    if (!transactionResult.success) {
      return { success: false, errors: transactionResult.errors };
    }

    // Mark payable as paid
    const updatedPayable = PayableRepository.markPaid(
      payment.payableId,
      payment.paidFromAccountId,
      paidDate,
      transactionResult.transaction.id
    );

    if (!updatedPayable) {
      return { success: false, errors: ['Failed to mark payable as paid'] };
    }

    // Generate next recurring instance if applicable
    let nextPayable: Payable | undefined;
    if (payable.isRecurring && payable.recurrenceRule) {
      nextPayable = this.generateNextInstance(payable) ?? undefined;
    }

    return {
      success: true,
      payable: updatedPayable,
      transaction: transactionResult.transaction,
      nextPayable,
    };
  },

  /**
   * Marks a payable as unpaid and removes the linked transaction
   */
  markUnpaid(id: string): { success: true; payable: Payable } | { success: false; errors: string[] } {
    const payable = PayableRepository.findById(id);
    if (!payable) {
      return { success: false, errors: ['Payable not found'] };
    }

    if (!payable.isPaid) {
      return { success: false, errors: ['Payable is not paid'] };
    }

    // Delete the linked transaction if it exists
    if (payable.linkedTransactionId) {
      TransactionService.delete(payable.linkedTransactionId);
    }

    const updatedPayable = PayableRepository.markUnpaid(id);
    if (!updatedPayable) {
      return { success: false, errors: ['Failed to mark payable as unpaid'] };
    }

    return { success: true, payable: updatedPayable };
  },

  /**
   * Generates the next instance of a recurring payable
   */
  generateNextInstance(payable: Payable): Payable | null {
    if (!payable.isRecurring || !payable.recurrenceRule) {
      return null;
    }

    const rule = payable.recurrenceRule;
    const nextDueDate = this.calculateNextDueDate(payable.dueDate, rule);

    // Check if we've passed the end date
    if (rule.endDate && nextDueDate > rule.endDate) {
      return null;
    }

    return PayableRepository.create({
      name: payable.name,
      amount: payable.amount,
      dueDate: nextDueDate,
      isRecurring: true,
      recurrenceRule: rule,
      parentPayableId: payable.parentPayableId || payable.id,
      categoryId: payable.categoryId,
      notes: payable.notes,
      payee: payable.payee,
      autoPayAccountId: payable.autoPayAccountId,
    });
  },

  /**
   * Calculates the next due date based on recurrence rule
   */
  calculateNextDueDate(currentDueDate: string, rule: { frequency: RecurrenceFrequency; interval: number; dayOfMonth?: number; dayOfWeek?: number }): string {
    const date = new Date(currentDueDate);
    const interval = rule.interval || 1;

    switch (rule.frequency) {
      case RecurrenceFrequency.DAILY:
        date.setDate(date.getDate() + interval);
        break;

      case RecurrenceFrequency.WEEKLY:
        date.setDate(date.getDate() + 7 * interval);
        break;

      case RecurrenceFrequency.BIWEEKLY:
        date.setDate(date.getDate() + 14 * interval);
        break;

      case RecurrenceFrequency.MONTHLY:
        date.setMonth(date.getMonth() + interval);
        // Handle day of month (e.g., due on the 15th)
        if (rule.dayOfMonth !== undefined) {
          const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          date.setDate(Math.min(rule.dayOfMonth, lastDayOfMonth));
        }
        break;

      case RecurrenceFrequency.YEARLY:
        date.setFullYear(date.getFullYear() + interval);
        break;
    }

    return date.toISOString().split('T')[0];
  },

  // Analytics
  getSummary(): PayableSummary {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 8) + '01';

    const upcoming = PayableRepository.findUpcoming(30);
    const overdue = PayableRepository.findOverdue();
    const paidThisMonth = PayableRepository.findAll({
      isPaid: true,
      startDate: monthStart,
      endDate: today,
    });

    return {
      upcomingCount: upcoming.length,
      upcomingTotal: upcoming.reduce((sum, p) => sum + p.amount, 0),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((sum, p) => sum + p.amount, 0),
      paidThisMonthCount: paidThisMonth.length,
      paidThisMonthTotal: paidThisMonth.reduce((sum, p) => sum + p.amount, 0),
    };
  },

  // Helpers
  addStatusFields(payable: Payable): PayableWithStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(payable.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      ...payable,
      isOverdue: !payable.isPaid && diffDays < 0,
      daysUntilDue: Math.max(0, diffDays),
      daysOverdue: Math.max(0, -diffDays),
    };
  },

  /**
   * Gets the total of unpaid payables due between now and a target date
   * Used for "safe to spend" calculation
   */
  getUpcomingTotal(targetDate: string): number {
    const today = new Date().toISOString().split('T')[0];
    const payables = PayableRepository.findAll({
      isPaid: false,
      startDate: today,
      endDate: targetDate,
    });
    return payables.reduce((sum, p) => sum + p.amount, 0);
  },
};
