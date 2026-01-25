// Account validation schemas

import { AccountCreate, AccountUpdate } from '../types';
import { createValidator, validators } from './validator';

const { required, string, number, positiveNumber, boolean, oneOf, minLength, maxLength, min, max } = validators;

const ACCOUNT_TYPES = ['bank', 'credit'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'MXN'] as const;

export const validateAccountCreate = createValidator<AccountCreate>({
  name: [required, string, minLength(1), maxLength(100)],
  type: [required, oneOf(ACCOUNT_TYPES)],
  balance: [required, number],
  currency: [required, oneOf(CURRENCIES)],
  institutionName: [string, maxLength(100)],
  accountNumberLast4: [string, maxLength(4)],
  isActive: [boolean],
  sortOrder: [number, min(0)],
  reconciledBalance: [number],
  reconciledDate: [string],
  creditLimit: [positiveNumber],
  minimumPayment: [positiveNumber],
  paymentDueDay: [number, min(1), max(31)],
  apr: [number, min(0), max(100)],
});

export const validateAccountUpdate = createValidator<AccountUpdate>({
  name: [string, minLength(1), maxLength(100)],
  type: [oneOf(ACCOUNT_TYPES)],
  balance: [number],
  currency: [oneOf(CURRENCIES)],
  institutionName: [string, maxLength(100)],
  accountNumberLast4: [string, maxLength(4)],
  isActive: [boolean],
  sortOrder: [number, min(0)],
  reconciledBalance: [number],
  reconciledDate: [string],
  creditLimit: [positiveNumber],
  minimumPayment: [positiveNumber],
  paymentDueDay: [number, min(1), max(31)],
  apr: [number, min(0), max(100)],
});
