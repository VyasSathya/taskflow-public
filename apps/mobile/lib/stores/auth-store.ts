import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  ensureFreshSession,
  setupSessionRefresh,
  cleanupSessionRefresh,
} from '@/lib/supabase';
import {
  signInWithApple as socialSignInWithApple,
  signInWithGoogle as socialSignInWithGoogle,
  signOutGoogle,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
} from '@/lib/services/socialAuthService';
import { zustandStorage } from '@/lib/utils/storage';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedSetup: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  checkAppleAvailability: () => Promise<boolean>;
  checkGoogleAvailability: () => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  completeSetup: () => void;
  clearError: () => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedSetup: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Skip if Supabase is not configured
      if (!isSupabaseConfigured || !supabase) {
        console.warn('⚠️ Supabase not configured - auth disabled');
        set({ isLoading: false });
        return;
      }

      // Set up session refresh on app foreground
      setupSessionRefresh();

      // Get current session
      const session = await ensureFreshSession();

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

      const { data, error } = await signInWithEmail(email, password);

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  signInWithApple: async () => {
    try {
      set({ isLoading: true, error: null });

      const data = await socialSignInWithApple();

      if (data) {
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // User cancelled
        set({ isLoading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Apple sign in failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });

      const data = await socialSignInWithGoogle();

      if (data) {
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // User cancelled
        set({ isLoading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign in failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  checkGoogleAvailability: async () => {
    return await isGoogleSignInAvailable();
  },

  checkAppleAvailability: async () => {
    return await isAppleSignInAvailable();
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await signUpWithEmail(email, password);

      if (error) throw error;

      // Note: User may need to verify email before session is active
      if (data.session) {
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      // Sign out from Google if user used Google Sign In
      await signOutGoogle();

      // Sign out from Supabase
      await supabaseSignOut();
      cleanupSessionRefresh();

      set({
        ...initialState,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  refreshSession: async () => {
    const session = await ensureFreshSession();
    if (session) {
      set({ session, user: session.user });
    }
  },

  completeSetup: () => {
    set({ hasCompletedSetup: true });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    cleanupSessionRefresh();
    set(initialState);
  },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        hasCompletedSetup: state.hasCompletedSetup,
      }),
    }
  )
);
