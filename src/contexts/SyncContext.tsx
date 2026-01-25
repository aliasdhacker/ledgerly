import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { SyncService } from '../services/v2/SyncService';
import { SyncState, SyncOperationStatus } from '../types';
import { useAuthContext } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

interface SyncContextType extends SyncState {
  sync: () => Promise<{ success: boolean; error?: string }>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Debounce delay for AppState sync triggers (ms)
const APP_STATE_SYNC_DEBOUNCE = 1000;

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [status, setStatus] = useState<SyncOperationStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<number>(0);

  // Refs to prevent circular dependencies and concurrent syncs
  const isSyncInProgressRef = useRef(false);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep auth ref in sync
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Update pending changes count
  const updatePendingChanges = useCallback(() => {
    const count = SyncService.getPendingChangesCount();
    setPendingChanges(count);
  }, []);

  // Sync function - uses ref to check auth to avoid dependency cycle
  const sync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Use ref to check authentication to avoid circular dependency
    if (!isAuthenticatedRef.current) {
      return { success: false, error: 'Not authenticated' };
    }

    // Prevent concurrent syncs
    if (isSyncInProgressRef.current) {
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncInProgressRef.current = true;
    try {
      const result = await SyncService.sync();
      updatePendingChanges();
      return result;
    } finally {
      isSyncInProgressRef.current = false;
    }
  }, [updatePendingChanges]);

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

  // Sync when app comes to foreground (with debounce)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticatedRef.current) {
        // Clear any existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        // Debounce to prevent rapid sync calls from quick foreground/background transitions
        debounceTimerRef.current = setTimeout(() => {
          sync();
        }, APP_STATE_SYNC_DEBOUNCE);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sync]);

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
