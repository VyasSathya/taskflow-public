import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/utils/storage';

interface AppState {
  isOnboarded: boolean;
  setupStep: number;
  totalSetupSteps: number;
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
}

interface AppActions {
  setOnboarded: (value: boolean) => void;
  setSetupStep: (step: number) => void;
  nextSetupStep: () => void;
  previousSetupStep: () => void;
  setSoundsEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  isOnboarded: false,
  setupStep: 0,
  totalSetupSteps: 4,
  soundsEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: false,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboarded: (value: boolean) => {
        set({ isOnboarded: value });
      },

      setSetupStep: (step: number) => {
        set({ setupStep: Math.max(0, Math.min(step, get().totalSetupSteps)) });
      },

      nextSetupStep: () => {
        const { setupStep, totalSetupSteps } = get();
        if (setupStep < totalSetupSteps) {
          set({ setupStep: setupStep + 1 });
        }
      },

      previousSetupStep: () => {
        const { setupStep } = get();
        if (setupStep > 0) {
          set({ setupStep: setupStep - 1 });
        }
      },

      setSoundsEnabled: (enabled: boolean) => {
        set({ soundsEnabled: enabled });
      },

      setHapticsEnabled: (enabled: boolean) => {
        set({ hapticsEnabled: enabled });
      },

      setNotificationsEnabled: (enabled: boolean) => {
        set({ notificationsEnabled: enabled });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

// Selector hooks
export const useIsOnboarded = () => useAppStore((state) => state.isOnboarded);
export const useSetupProgress = () =>
  useAppStore((state) => ({
    step: state.setupStep,
    total: state.totalSetupSteps,
    progress: state.setupStep / state.totalSetupSteps,
  }));
export const useSoundsEnabled = () => useAppStore((state) => state.soundsEnabled);
export const useHapticsEnabled = () => useAppStore((state) => state.hapticsEnabled);
