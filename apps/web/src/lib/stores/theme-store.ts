/**
 * Theme Store (Web)
 * Manages theme state with persistence and system preference detection
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;              // User preference
  resolvedTheme: ResolvedTheme; // Actual applied theme
  systemTheme: ResolvedTheme;   // System preference
}

interface ThemeActions {
  setMode: (mode: ThemeMode) => void;
  initialize: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

/**
 * Get current system theme preference
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Resolve theme mode to actual theme (handle 'system' mode)
 */
const resolveTheme = (mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme => {
  return mode === 'system' ? systemTheme : mode;
};

// Store reference to media query listener for cleanup
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      systemTheme: getSystemTheme(),
      resolvedTheme: getSystemTheme(),

      setMode: (mode) => {
        const systemTheme = get().systemTheme;
        const resolvedTheme = resolveTheme(mode, systemTheme);
        set({ mode, resolvedTheme });
      },

      initialize: () => {
        const systemTheme = getSystemTheme();
        const mode = get().mode;
        const resolvedTheme = resolveTheme(mode, systemTheme);

        set({ systemTheme, resolvedTheme });

        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

          // Remove previous listener if exists
          if (mediaQueryListener) {
            mediaQuery.removeEventListener('change', mediaQueryListener);
          }

          // Create new listener
          mediaQueryListener = (e: MediaQueryListEvent) => {
            const newSystemTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
            const currentMode = get().mode;
            const newResolvedTheme = resolveTheme(currentMode, newSystemTheme);
            set({ systemTheme: newSystemTheme, resolvedTheme: newResolvedTheme });
          };

          mediaQuery.addEventListener('change', mediaQueryListener);
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist mode, other values are computed
      partialize: (state) => ({ mode: state.mode }),
      // Recompute resolved theme after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const systemTheme = getSystemTheme();
          state.systemTheme = systemTheme;
          state.resolvedTheme = resolveTheme(state.mode, systemTheme);
        }
      },
    }
  )
);

// Selector hooks for performance
export const useThemeMode = () => useThemeStore((state) => state.mode);
export const useResolvedTheme = () => useThemeStore((state) => state.resolvedTheme);
