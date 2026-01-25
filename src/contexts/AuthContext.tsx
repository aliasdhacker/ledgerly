import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { User, Session, AuthState } from '../types';

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { user, session } = await AuthService.getSession();
        setUser(user);
        setSession(session);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const subscription = AuthService.onAuthStateChange((newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const { user, session, error } = await AuthService.signInWithGoogle();
      if (error) {
        return { error };
      }
      setUser(user);
      setSession(session);
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const { user, session, error } = await AuthService.signInWithEmail(email, password);
      if (error) {
        return { error };
      }
      setUser(user);
      setSession(session);
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const { user, session, error } = await AuthService.signUpWithEmail(email, password, name);
      if (error) {
        return { error };
      }
      setUser(user);
      setSession(session);
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const { error } = await AuthService.signOut();
      if (error) {
        return { error };
      }
      setUser(null);
      setSession(null);
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    return AuthService.resetPassword(email);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
