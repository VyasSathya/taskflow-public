/**
 * App Store (Web)
 * Manages app-wide state like onboarding status
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  hasCompletedOnboarding: boolean;
}

interface AppActions {
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },
    }),
    {
      name: 'vibetasks-app-storage',
    }
  )
);
