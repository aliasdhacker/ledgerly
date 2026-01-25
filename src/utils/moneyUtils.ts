// Money formatting utilities for DriftMoney

import { Currency } from '../types';
import { CURRENCIES, CurrencyInfo } from '../constants/currencies';

// Format money with currency symbol
export const formatMoney = (
  amount: number,
  currency: Currency = 'USD',
  options?: {
    showSign?: boolean;
    compact?: boolean;
  }
): string => {
  const currencyInfo: CurrencyInfo = CURRENCIES[currency];
  const { showSign = false, compact = false } = options || {};

  const absAmount = Math.abs(amount);
  let formatted: string;

  if (compact && absAmount >= 1000000) {
    formatted = (absAmount / 1000000).toFixed(1) + 'M';
  } else if (compact && absAmount >= 1000) {
    formatted = (absAmount / 1000).toFixed(1) + 'K';
  } else {
    formatted = absAmount.toFixed(currencyInfo.decimalPlaces);
    // Add thousand separators
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  // Add currency symbol
  const withSymbol =
    currencyInfo.symbolPosition === 'before'
      ? `${currencyInfo.symbol}${formatted}`
      : `${formatted}${currencyInfo.symbol}`;

  // Add sign
  if (showSign) {
    if (amount > 0) return `+${withSymbol}`;
    if (amount < 0) return `-${withSymbol}`;
  } else if (amount < 0) {
    return `-${withSymbol}`;
  }

  return withSymbol;
};

// Format as accounting style (negative in parentheses)
export const formatMoneyAccounting = (amount: number, currency: Currency = 'USD'): string => {
  const formatted = formatMoney(Math.abs(amount), currency);
  return amount < 0 ? `(${formatted})` : formatted;
};

// Parse money string to number
export const parseMoney = (value: string): number => {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Round to currency decimal places
export const roundMoney = (amount: number, currency: Currency = 'USD'): number => {
  const decimalPlaces = CURRENCIES[currency].decimalPlaces;
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(amount * factor) / factor;
};

// Calculate percentage
export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

// Sum array of numbers
export const sumAmounts = (amounts: number[]): number => {
  return amounts.reduce((sum, amount) => sum + amount, 0);
};
