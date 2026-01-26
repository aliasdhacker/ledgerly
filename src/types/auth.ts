// Auth Types for DriftMoney

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type SyncOperationStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncOperationStatus;
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
}
