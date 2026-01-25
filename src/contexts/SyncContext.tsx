import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SyncService } from '../services/SyncService';
import { SyncState, SyncStatus } from '../types';
import { useAuthContext } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

interface SyncContextType extends SyncState {
  sync: () => Promise<{ success: boolean; error?: string }>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<number>(0);

  // Update pending changes count
  const updatePendingChanges = useCallback(() => {
    const count = SyncService.getPendingChangesCount();
    setPendingChanges(count);
  }, []);

  // Sync function
  const sync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await SyncService.sync();
    updatePendingChanges();
    return result;
  }, [isAuthenticated, updatePendingChanges]);

  // Initialize and subscribe to sync status changes
  useEffect(() => {
    // Get initial state
    const { isSyncing, lastSyncedAt: savedLastSync } = SyncService.getStatus();
    setStatus(isSyncing ? 'syncing' : 'idle');
    setLastSyncedAt(savedLastSync);
    updatePendingChanges();

    // Subscribe to status changes
    const unsubscribe = SyncService.addListener((newStatus, syncError) => {
      setStatus(newStatus);
      setError(syncError || null);
      if (newStatus === 'success') {
        setLastSyncedAt(new Date().toISOString());
        updatePendingChanges();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [updatePendingChanges]);

  // Sync when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        sync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, sync]);

  // Sync when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      sync();
    }
  }, [isAuthenticated, sync]);

  const value: SyncContextType = {
    status,
    lastSyncedAt,
    error,
    pendingChanges,
    sync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSyncContext = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};
