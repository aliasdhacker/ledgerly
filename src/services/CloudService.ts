import { supabase } from '../config/supabase';
import { Bill, Transaction, Debt, DebtTransaction } from '../types';
import { AuthService } from './AuthService';

interface ICloudService {
  syncBills(localBills: Bill[]): Promise<void>;
  uploadSnapshot(balance: number, safeToSpend: number): Promise<void>;
  uploadBills(bills: Bill[]): Promise<{ success: boolean; error?: string }>;
  downloadBills(): Promise<{ bills: Bill[]; error?: string }>;
  uploadTransactions(transactions: Transaction[]): Promise<{ success: boolean; error?: string }>;
  downloadTransactions(): Promise<{ transactions: Transaction[]; error?: string }>;
  uploadDebts(debts: Debt[]): Promise<{ success: boolean; error?: string }>;
  downloadDebts(): Promise<{ debts: Debt[]; error?: string }>;
  uploadDebtTransactions(debtTransactions: DebtTransaction[]): Promise<{ success: boolean; error?: string }>;
  downloadDebtTransactions(): Promise<{ debtTransactions: DebtTransaction[]; error?: string }>;
}

export const CloudService: ICloudService = {
  // Legacy sync method - kept for backwards compatibility
  syncBills: async (localBills: Bill[]) => {
    console.log('[CloudService] syncBills called with', localBills.length, 'bills');
    // Use the new uploadBills method
    await CloudService.uploadBills(localBills);
  },

  // Upload balance snapshot
  uploadSnapshot: async (balance: number, safeToSpend: number) => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      console.log('[CloudService] No user logged in, skipping snapshot upload');
      return;
    }

    const { error } = await supabase
      .from('balance_snapshots')
      .upsert({
        user_id: userId,
        balance,
        safe_to_spend: safeToSpend,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[CloudService] Failed to upload snapshot:', error);
    }
  },

  // Upload bills to cloud
  uploadBills: async (bills: Bill[]) => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (bills.length === 0) {
      return { success: true };
    }

    const billsToUpload = bills.map((bill) => ({
      id: bill.id,
      user_id: userId,
      name: bill.name,
      amount: bill.amount,
      due_day: bill.dueDay,
      is_paid: bill.isPaid,
      bill_month: bill.billMonth,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('bills')
      .upsert(billsToUpload, { onConflict: 'id' });

    if (error) {
      console.error('[CloudService] Failed to upload bills:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Download bills from cloud
  downloadBills: async () => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { bills: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[CloudService] Failed to download bills:', error);
      return { bills: [], error: error.message };
    }

    const bills: Bill[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDay: row.due_day,
      isPaid: row.is_paid,
      billMonth: row.bill_month,
      syncStatus: 'synced' as const,
    }));

    return { bills };
  },

  // Upload transactions to cloud
  uploadTransactions: async (transactions: Transaction[]) => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (transactions.length === 0) {
      return { success: true };
    }

    const transactionsToUpload = transactions.map((t) => ({
      id: t.id,
      user_id: userId,
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      category: t.category || null,
      related_bill_id: t.relatedBillId || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('transactions')
      .upsert(transactionsToUpload, { onConflict: 'id' });

    if (error) {
      console.error('[CloudService] Failed to upload transactions:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Download transactions from cloud
  downloadTransactions: async () => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { transactions: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[CloudService] Failed to download transactions:', error);
      return { transactions: [], error: error.message };
    }

    const transactions: Transaction[] = (data || []).map((row: any) => ({
      id: row.id,
      description: row.description,
      amount: row.amount,
      type: row.type,
      date: row.date,
      category: row.category || undefined,
      relatedBillId: row.related_bill_id || undefined,
    }));

    return { transactions };
  },

  // Upload debts to cloud
  uploadDebts: async (debts: Debt[]) => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (debts.length === 0) {
      return { success: true };
    }

    const debtsToUpload = debts.map((d) => ({
      id: d.id,
      user_id: userId,
      company: d.company,
      balance: d.balance,
      last_updated: d.lastUpdated,
      notes: d.notes || null,
      is_recurring: d.isRecurring || false,
      payment_due_day: d.paymentDueDay || null,
      payment_frequency: d.paymentFrequency || null,
      minimum_payment: d.minimumPayment || null,
      next_payment_date: d.nextPaymentDate || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('debts')
      .upsert(debtsToUpload, { onConflict: 'id' });

    if (error) {
      console.error('[CloudService] Failed to upload debts:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Download debts from cloud
  downloadDebts: async () => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { debts: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[CloudService] Failed to download debts:', error);
      return { debts: [], error: error.message };
    }

    const debts: Debt[] = (data || []).map((row: any) => ({
      id: row.id,
      company: row.company,
      balance: row.balance,
      lastUpdated: row.last_updated,
      notes: row.notes || undefined,
      syncStatus: 'synced' as const,
      isRecurring: row.is_recurring || false,
      paymentDueDay: row.payment_due_day || undefined,
      paymentFrequency: row.payment_frequency || undefined,
      minimumPayment: row.minimum_payment || undefined,
      nextPaymentDate: row.next_payment_date || undefined,
    }));

    return { debts };
  },

  // Upload debt transactions to cloud
  uploadDebtTransactions: async (debtTransactions: DebtTransaction[]) => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (debtTransactions.length === 0) {
      return { success: true };
    }

    const debtTransactionsToUpload = debtTransactions.map((dt) => ({
      id: dt.id,
      user_id: userId,
      debt_id: dt.debtId,
      type: dt.type,
      amount: dt.amount,
      description: dt.description,
      date: dt.date,
      balance_after: dt.balanceAfter,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('debt_transactions')
      .upsert(debtTransactionsToUpload, { onConflict: 'id' });

    if (error) {
      console.error('[CloudService] Failed to upload debt transactions:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Download debt transactions from cloud
  downloadDebtTransactions: async () => {
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { debtTransactions: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('debt_transactions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[CloudService] Failed to download debt transactions:', error);
      return { debtTransactions: [], error: error.message };
    }

    const debtTransactions: DebtTransaction[] = (data || []).map((row: any) => ({
      id: row.id,
      debtId: row.debt_id,
      type: row.type,
      amount: row.amount,
      description: row.description,
      date: row.date,
      balanceAfter: row.balance_after,
    }));

    return { debtTransactions };
  },
};
