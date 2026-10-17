import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';

export const useAuth = () => {
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    hasCompletedSetup,
    error,
    initialize,
    signInWithEmail,
    signUp,
    signOut,
    refreshSession,
    completeSetup,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    hasCompletedSetup,
    error,
    signInWithEmail,
    signUp,
    signOut,
    refreshSession,
    completeSetup,
    clearError,
  };
};

// Selector hooks for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
