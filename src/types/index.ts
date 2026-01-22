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
