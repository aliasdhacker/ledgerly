export interface Bill {
  id: string; // UUID
  name: string;
  amount: number;
  dueDay: number; // 1-31
  isPaid: boolean; // For this bill month
  billMonth: string; // YYYY-MM format for which month this bill instance belongs to
  syncStatus: 'synced' | 'dirty' | 'deleted'; // Key for future cloud sync
}

export interface Transaction {
  id: string; // UUID
  description: string;
  amount: number; // always positive, type determines +/-
  type: 'income' | 'bill_paid' | 'expense' | 'credit';
  date: string; // ISO date string
  category?: string;
  relatedBillId?: string; // For bill_paid transactions
}

export type PaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Debt {
  id: string; // UUID
  company: string; // Name of creditor/company
  balance: number; // Current balance owed
  lastUpdated: string; // ISO date string - when balance was last updated
  notes?: string; // Optional notes
  syncStatus: 'synced' | 'dirty' | 'deleted';
  // Recurring payment fields (optional)
  isRecurring?: boolean; // Whether this debt has recurring payments
  paymentDueDay?: number; // Day of month (1-31) for monthly, or day of week (0-6) for weekly
  paymentFrequency?: PaymentFrequency; // How often the payment is due
  minimumPayment?: number; // Optional minimum payment amount
  nextPaymentDate?: string; // ISO date string - calculated next payment date
}

export interface DebtTransaction {
  id: string; // UUID
  debtId: string; // Foreign key to debt
  type: 'initial' | 'debit' | 'credit'; // initial = starting balance, debit = increase debt, credit = payment/decrease
  amount: number; // Always positive
  description: string;
  date: string; // ISO date string
  balanceAfter: number; // Balance after this transaction
}
