// Default categories for DriftMoney

import { Category } from '../types';

export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt' | 'syncStatus'>[] = [
  {
    id: 'cat_income',
    name: 'Income',
    icon: '💰',
    color: '#4CAF50',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'cat_food',
    name: 'Food & Dining',
    icon: '🍔',
    color: '#FF6B6B',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'cat_transport',
    name: 'Transportation',
    icon: '🚗',
    color: '#4ECDC4',
    isSystem: true,
    sortOrder: 3,
  },
  {
    id: 'cat_shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: '#45B7D1',
    isSystem: true,
    sortOrder: 4,
  },
  {
    id: 'cat_bills',
    name: 'Bills & Utilities',
    icon: '📄',
    color: '#96CEB4',
    isSystem: true,
    sortOrder: 5,
  },
  {
    id: 'cat_entertainment',
    name: 'Entertainment',
    icon: '🎬',
    color: '#DDA0DD',
    isSystem: true,
    sortOrder: 6,
  },
  {
    id: 'cat_health',
    name: 'Health & Medical',
    icon: '🏥',
    color: '#98D8C8',
    isSystem: true,
    sortOrder: 7,
  },
  {
    id: 'cat_housing',
    name: 'Housing',
    icon: '🏠',
    color: '#F7DC6F',
    isSystem: true,
    sortOrder: 8,
  },
  {
    id: 'cat_personal',
    name: 'Personal Care',
    icon: '💅',
    color: '#FF9FF3',
    isSystem: true,
    sortOrder: 9,
  },
  {
    id: 'cat_education',
    name: 'Education',
    icon: '📚',
    color: '#54A0FF',
    isSystem: true,
    sortOrder: 10,
  },
  {
    id: 'cat_travel',
    name: 'Travel',
    icon: '✈️',
    color: '#5F27CD',
    isSystem: true,
    sortOrder: 11,
  },
  {
    id: 'cat_gifts',
    name: 'Gifts & Donations',
    icon: '🎁',
    color: '#FF6B81',
    isSystem: true,
    sortOrder: 12,
  },
  {
    id: 'cat_insurance',
    name: 'Insurance',
    icon: '🛡️',
    color: '#778CA3',
    isSystem: true,
    sortOrder: 13,
  },
  {
    id: 'cat_transfer',
    name: 'Transfer',
    icon: '↔️',
    color: '#78909C',
    isSystem: true,
    sortOrder: 14,
  },
  {
    id: 'cat_other',
    name: 'Other',
    icon: '📦',
    color: '#BDBDBD',
    isSystem: true,
    sortOrder: 99,
  },
];

// Category ID constants for easy reference
export const CATEGORY_IDS = {
  INCOME: 'cat_income',
  FOOD: 'cat_food',
  TRANSPORT: 'cat_transport',
  SHOPPING: 'cat_shopping',
  BILLS: 'cat_bills',
  ENTERTAINMENT: 'cat_entertainment',
  HEALTH: 'cat_health',
  HOUSING: 'cat_housing',
  PERSONAL: 'cat_personal',
  EDUCATION: 'cat_education',
  TRAVEL: 'cat_travel',
  GIFTS: 'cat_gifts',
  INSURANCE: 'cat_insurance',
  TRANSFER: 'cat_transfer',
  OTHER: 'cat_other',
} as const;

// Map for OCR category inference
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  [CATEGORY_IDS.FOOD]: [
    'restaurant', 'cafe', 'coffee', 'food', 'grocery', 'supermarket',
    'doordash', 'uber eats', 'grubhub', 'mcdonalds', 'starbucks',
    'chipotle', 'pizza', 'burger', 'diner', 'bar', 'pub',
  ],
  [CATEGORY_IDS.TRANSPORT]: [
    'gas', 'fuel', 'uber', 'lyft', 'taxi', 'parking', 'toll',
    'transit', 'metro', 'bus', 'train', 'airline', 'car wash',
  ],
  [CATEGORY_IDS.SHOPPING]: [
    'amazon', 'walmart', 'target', 'costco', 'ebay', 'etsy',
    'clothing', 'shoes', 'electronics', 'best buy', 'home depot',
  ],
  [CATEGORY_IDS.BILLS]: [
    'electric', 'water', 'gas bill', 'internet', 'phone', 'mobile',
    'cable', 'utility', 'att', 'verizon', 'comcast', 'spectrum',
  ],
  [CATEGORY_IDS.ENTERTAINMENT]: [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'movie',
    'theater', 'concert', 'game', 'steam', 'playstation', 'xbox',
  ],
  [CATEGORY_IDS.HEALTH]: [
    'pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'medical',
    'dental', 'vision', 'gym', 'fitness', 'health',
  ],
  [CATEGORY_IDS.HOUSING]: [
    'rent', 'mortgage', 'hoa', 'property', 'furniture', 'ikea',
    'maintenance', 'repair', 'cleaning',
  ],
  [CATEGORY_IDS.INCOME]: [
    'payroll', 'salary', 'direct deposit', 'income', 'dividend',
    'interest', 'refund', 'reimbursement', 'venmo', 'zelle',
  ],
  [CATEGORY_IDS.TRANSFER]: [
    'transfer', 'payment', 'credit card payment',
  ],
};
