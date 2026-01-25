import { supabase } from '../config/supabase';
import { DatabaseService } from './DatabaseService';
import { NetworkService } from './NetworkService';
import { AuthService } from './AuthService';
import { Bill, Transaction, Debt, DebtTransaction, SyncStatus } from '../types';

type SyncListener = (status: SyncStatus, error?: string) => void;

class SyncServiceClass {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private initialized: boolean = false;

  constructor() {
    // Don't access database here - use lazy initialization
    // Listen for network reconnection to trigger sync
    NetworkService.addListener((isConnected) => {
      if (isConnected && !this.isSyncing) {
        this.sync();
      }
    });
  }

  // Lazy initialization - called when database is ready
  private ensureInitialized() {
    if (!this.initialized) {
      try {
        const savedTimestamp = DatabaseService.getSetting('last_synced_at');
        if (savedTimestamp) {
          this.lastSyncedAt = savedTimestamp;
        }
        this.initialized = true;
      } catch {
        // Database not ready yet, will retry later
      }
    }
  }

  private notifyListeners(status: SyncStatus, error?: string) {
    this.listeners.forEach((listener) => {
      try {
        listener(status, error);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  }

  // Add a listener for sync status changes
  addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current sync status
  getStatus(): { isSyncing: boolean; lastSyncedAt: string | null } {
    this.ensureInitialized();
    return {
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  // Main sync function
  async sync(): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();

    // Check if already syncing
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    // Check if online
    const isConnected = await NetworkService.checkConnection();
    if (!isConnected) {
      return { success: false, error: 'No internet connection' };
    }

    // Check if authenticated
    const userId = await AuthService.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    try {
      // Push local changes first
      await this.pushChanges(userId);

      // Pull remote changes
      await this.pullChanges(userId);

      // Update last sync timestamp
      this.lastSyncedAt = new Date().toISOString();
      DatabaseService.setSetting('last_synced_at', this.lastSyncedAt);

      this.notifyListeners('success');
      return { success: true };
    } catch (error: any) {
      console.error('Sync error:', error);
      this.notifyListeners('error', error.message || 'Sync failed');
      return { success: false, error: error.message || 'Sync failed' };
    } finally {
      this.isSyncing = false;
    }
  }

  // Push local changes to cloud
  private async pushChanges(userId: string): Promise<void> {
    // Push bills
    const dirtyBills = DatabaseService.getDirtyBills();
    if (dirtyBills.length > 0) {
      const billsToUpsert = dirtyBills.map((bill) => ({
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
        .upsert(billsToUpsert, { onConflict: 'id' });

      if (error) throw new Error(`Failed to sync bills: ${error.message}`);
      DatabaseService.markBillsSynced(dirtyBills.map((b) => b.id));
    }

    // Push transactions
    const dirtyTransactions = DatabaseService.getDirtyTransactions();
    if (dirtyTransactions.length > 0) {
      const transactionsToUpsert = dirtyTransactions.map((t) => ({
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
        .upsert(transactionsToUpsert, { onConflict: 'id' });

      if (error) throw new Error(`Failed to sync transactions: ${error.message}`);
      DatabaseService.markTransactionsSynced(dirtyTransactions.map((t) => t.id));
    }

    // Push debts
    const dirtyDebts = DatabaseService.getDirtyDebts();
    if (dirtyDebts.length > 0) {
      const debtsToUpsert = dirtyDebts.map((d) => ({
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
        .upsert(debtsToUpsert, { onConflict: 'id' });

      if (error) throw new Error(`Failed to sync debts: ${error.message}`);
      DatabaseService.markDebtsSynced(dirtyDebts.map((d) => d.id));
    }

    // Push debt transactions
    const dirtyDebtTransactions = DatabaseService.getDirtyDebtTransactions();
    if (dirtyDebtTransactions.length > 0) {
      const debtTransactionsToUpsert = dirtyDebtTransactions.map((dt) => ({
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
        .upsert(debtTransactionsToUpsert, { onConflict: 'id' });

      if (error) throw new Error(`Failed to sync debt transactions: ${error.message}`);
      DatabaseService.markDebtTransactionsSynced(dirtyDebtTransactions.map((dt) => dt.id));
    }
  }

  // Pull remote changes from cloud
  private async pullChanges(userId: string): Promise<void> {
    const lastSync = this.lastSyncedAt || '1970-01-01T00:00:00.000Z';

    // Pull bills updated since last sync
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSync);

    if (billsError) throw new Error(`Failed to pull bills: ${billsError.message}`);

    if (bills) {
      for (const bill of bills) {
        DatabaseService.upsertBillFromCloud({
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          dueDay: bill.due_day,
          isPaid: bill.is_paid,
          billMonth: bill.bill_month,
          syncStatus: 'synced',
          updatedAt: bill.updated_at,
        });
      }
    }

    // Pull transactions updated since last sync
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSync);

    if (transactionsError) throw new Error(`Failed to pull transactions: ${transactionsError.message}`);

    if (transactions) {
      for (const t of transactions) {
        DatabaseService.upsertTransactionFromCloud({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.date,
          category: t.category || undefined,
          relatedBillId: t.related_bill_id || undefined,
          updatedAt: t.updated_at,
        });
      }
    }

    // Pull debts updated since last sync
    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSync);

    if (debtsError) throw new Error(`Failed to pull debts: ${debtsError.message}`);

    if (debts) {
      for (const d of debts) {
        DatabaseService.upsertDebtFromCloud({
          id: d.id,
          company: d.company,
          balance: d.balance,
          lastUpdated: d.last_updated,
          notes: d.notes || undefined,
          syncStatus: 'synced',
          isRecurring: d.is_recurring || false,
          paymentDueDay: d.payment_due_day || undefined,
          paymentFrequency: d.payment_frequency || undefined,
          minimumPayment: d.minimum_payment || undefined,
          nextPaymentDate: d.next_payment_date || undefined,
          updatedAt: d.updated_at,
        });
      }
    }

    // Pull debt transactions updated since last sync
    const { data: debtTransactions, error: debtTransactionsError } = await supabase
      .from('debt_transactions')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSync);

    if (debtTransactionsError) throw new Error(`Failed to pull debt transactions: ${debtTransactionsError.message}`);

    if (debtTransactions) {
      for (const dt of debtTransactions) {
        DatabaseService.upsertDebtTransactionFromCloud({
          id: dt.id,
          debtId: dt.debt_id,
          type: dt.type,
          amount: dt.amount,
          description: dt.description,
          date: dt.date,
          balanceAfter: dt.balance_after,
          updatedAt: dt.updated_at,
        });
      }
    }
  }

  // Get pending changes count
  getPendingChangesCount(): number {
    this.ensureInitialized();
    return DatabaseService.getPendingChangesCount();
  }
}

export const SyncService = new SyncServiceClass();
