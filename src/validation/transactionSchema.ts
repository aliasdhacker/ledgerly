// Transaction validation schemas

import { TransactionCreate, TransactionUpdate, TransferCreate } from '../types';
import { createValidator, validators } from './validator';

const { required, string, positiveNumber, boolean, date, oneOf, minLength, maxLength } = validators;

const TRANSACTION_TYPES = ['debit', 'credit'] as const;

export const validateTransactionCreate = createValidator<TransactionCreate>({
  accountId: [required, string],
  type: [required, oneOf(TRANSACTION_TYPES)],
  amount: [required, positiveNumber],
  description: [required, string, minLength(1), maxLength(255)],
  date: [required, date],
  categoryId: [string],
  notes: [string, maxLength(500)],
  linkedPayableId: [string],
  transferId: [string],
  importBatchId: [string],
  externalId: [string, maxLength(100)],
});

export const validateTransactionUpdate = createValidator<TransactionUpdate>({
  type: [oneOf(TRANSACTION_TYPES)],
  amount: [positiveNumber],
  description: [string, minLength(1), maxLength(255)],
  date: [date],
  categoryId: [string],
  notes: [string, maxLength(500)],
  linkedPayableId: [string],
  isReconciled: [boolean],
});

export const validateTransferCreate = createValidator<TransferCreate>({
  fromAccountId: [required, string],
  toAccountId: [required, string],
  amount: [required, positiveNumber],
  date: [required, date],
  description: [string, maxLength(255)],
});
