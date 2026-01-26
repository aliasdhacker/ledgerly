import { supabase, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { User, Session } from '../types';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : undefined,
  offlineAccess: true,
});

// Helper to map Supabase user to our User type
const mapSupabaseUser = (supabaseUser: any): User | null => {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
    createdAt: supabaseUser.created_at,
  };
};

// Helper to map Supabase session to our Session type
const mapSupabaseSession = (supabaseSession: any, supabaseUser?: any): Session | null => {
  if (!supabaseSession) return null;
  const user = supabaseUser || supabaseSession.user;
  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token,
    expiresAt: supabaseSession.expires_at || 0,
    user: mapSupabaseUser(user) || {
      id: '',
      email: '',
      createdAt: new Date().toISOString(),
    },
  };
};

export const AuthService = {
  // Sign in with Google
  signInWithGoogle: async (): Promise<{ user: User | null; session: Session | null; error: string | null }> => {
    try {
      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        return { user: null, session: null, error: 'No ID token returned from Google' };
      }

      // Sign in to Supabase with the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return {
        user: mapSupabaseUser(data.user),
        session: mapSupabaseSession(data.session),
        error: null,
      };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      return { user: null, session: null, error: error.message || 'Google sign-in failed' };
    }
  },

  // Sign in with email and password
  signInWithEmail: async (email: string, password: string): Promise<{ user: User | null; session: Session | null; error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return {
        user: mapSupabaseUser(data.user),
        session: mapSupabaseSession(data.session),
        error: null,
      };
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      return { user: null, session: null, error: error.message || 'Sign-in failed' };
    }
  },

  // Sign up with email and password
  signUpWithEmail: async (email: string, password: string, name?: string): Promise<{ user: User | null; session: Session | null; error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      // Note: If email confirmation is enabled, session might be null until confirmed
      return {
        user: mapSupabaseUser(data.user),
        session: mapSupabaseSession(data.session),
        error: null,
      };
    } catch (error: any) {
      console.error('Sign-up error:', error);
      return { user: null, session: null, error: error.message || 'Sign-up failed' };
    }
  },

  // Sign out
  signOut: async (): Promise<{ error: string | null }> => {
    try {
      // Sign out from Google if signed in
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        await GoogleSignin.signOut();
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign-out error:', error);
      return { error: error.message || 'Sign-out failed' };
    }
  },

  // Get current session
  getSession: async (): Promise<{ user: User | null; session: Session | null; error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (!data.session) {
        return { user: null, session: null, error: null };
      }

      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        return { user: null, session: null, error: userError.message };
      }

      return {
        user: mapSupabaseUser(userData.user),
        session: mapSupabaseSession(data.session),
        error: null,
      };
    } catch (error: any) {
      console.error('Get session error:', error);
      return { user: null, session: null, error: error.message || 'Failed to get session' };
    }
  },

  // Reset password
  resetPassword: async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'driftmoney://reset-password',
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { error: error.message || 'Failed to send reset email' };
    }
  },

  // Update password (after reset)
  updatePassword: async (newPassword: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Update password error:', error);
      return { error: error.message || 'Failed to update password' };
    }
  },

  // Subscribe to auth state changes
  onAuthStateChange: (callback: (user: User | null, session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ? mapSupabaseUser(session.user) : null;
        const mappedSession = session ? mapSupabaseSession(session) : null;
        callback(user, mappedSession);
      }
    );

    return subscription;
  },

  // Get current user ID (for database operations)
  getCurrentUserId: async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  },
};
