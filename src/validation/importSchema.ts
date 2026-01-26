// Import validation schemas

import { ImportBatchCreate, RawImportTransaction } from '../types';
import { createValidator, validators } from './validator';

const { required, string, positiveNumber, date, oneOf, minLength, maxLength } = validators;

const TRANSACTION_TYPES = ['debit', 'credit'] as const;

export const validateImportBatchCreate = createValidator<ImportBatchCreate>({
  accountId: [required, string],
  filename: [required, string, minLength(1), maxLength(255)],
});

export const validateRawImportTransaction = createValidator<RawImportTransaction>({
  description: [required, string, minLength(1), maxLength(255)],
  amount: [required, positiveNumber],
  type: [required, oneOf(TRANSACTION_TYPES)],
  date: [required, date],
  category: [string, maxLength(50)],
  externalId: [string, maxLength(100)],
});
