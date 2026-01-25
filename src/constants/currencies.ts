// Currency constants for DriftMoney

import { Currency } from '../types';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimalPlaces: 0,
    symbolPosition: 'before',
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Mexican Peso',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export const DEFAULT_CURRENCY_CODE: Currency = 'USD';
