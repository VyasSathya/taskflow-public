/**
 * Auth Store (Web)
 * Manages authentication state with Zustand
 * Matches mobile auth store structure for consistency
 */

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const supabase = createClient();

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session?.user,
        });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, error: 'Failed to initialize auth' });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Sign in failed',
      });
      throw error;
    }
  },

  signInWithApple: async () => {
    try {
      set({ isLoading: true, error: null });

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // OAuth redirects to Apple, so loading state stays until redirect back
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Apple sign in failed',
      });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // OAuth redirects to Google, so loading state stays until redirect back
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Google sign in failed',
      });
      throw error;
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Note: User needs to confirm email before being authenticated
      set({
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Sign up failed',
      });
      throw error;
    }
  },

  signOut: async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      set({
        ...initialState,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ error: error.message || 'Sign out failed' });
    }
  },

  refreshSession: async () => {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      if (session) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
        });
      }
    } catch (error: any) {
      console.error('Session refresh error:', error);
      set({ error: error.message || 'Session refresh failed' });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({ ...initialState, isLoading: false });
  },
}));
