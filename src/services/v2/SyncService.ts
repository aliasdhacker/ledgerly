// Sync Service v2 - Stub for cloud sync functionality
// This will be implemented when cloud sync is rebuilt for v2 architecture

import type { SyncOperationStatus } from '../../types/auth';

type SyncListener = (status: SyncOperationStatus, error?: string) => void;

class SyncServiceClass {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;

  // Add a listener for sync status changes
  addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(status: SyncOperationStatus, error?: string) {
    this.listeners.forEach((listener) => {
      try {
        listener(status, error);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  }

  // Get current sync status
  getStatus(): { isSyncing: boolean; lastSyncedAt: string | null } {
    return {
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  // Get count of pending changes to sync
  getPendingChangesCount(): number {
    // TODO: Implement when cloud sync is ready
    // Should count records with syncStatus = 'dirty' across all tables
    return 0;
  }

  // Main sync function - stub for now
  async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    try {
      // TODO: Implement actual sync when cloud infrastructure is ready
      // For now, just simulate a successful sync
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.lastSyncedAt = new Date().toISOString();
      this.notifyListeners('success');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.notifyListeners('error', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const SyncService = new SyncServiceClass();
