import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ThemeName, ThemeColors, themes, isDarkTheme } from '@/lib/theme/themes';
import { zustandStorage } from '@/lib/utils/storage';

interface ThemeState {
  themeName: ThemeName;
  colors: ThemeColors;
  isDark: boolean;
}

interface ThemeActions {
  setTheme: (name: ThemeName) => void;
  toggleDarkMode: () => void;
  reset: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

const getInitialState = (themeName: ThemeName): ThemeState => ({
  themeName,
  colors: themes[themeName],
  isDark: isDarkTheme(themeName),
});

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      ...getInitialState('light'),

      setTheme: (name: ThemeName) => {
        set({
          themeName: name,
          colors: themes[name],
          isDark: isDarkTheme(name),
        });
      },

      toggleDarkMode: () => {
        set((state) => {
          const newTheme = state.isDark ? 'light' : 'dark';
          return {
            themeName: newTheme,
            colors: themes[newTheme],
            isDark: !state.isDark,
          };
        });
      },

      reset: () => {
        set(getInitialState('light'));
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ themeName: state.themeName }),
      onRehydrateStorage: () => (state) => {
        if (state?.themeName) {
          state.colors = themes[state.themeName];
          state.isDark = isDarkTheme(state.themeName);
        }
      },
    }
  )
);

// Selector hooks for performance
export const useThemeColors = () => useThemeStore((state) => state.colors);
export const useThemeName = () => useThemeStore((state) => state.themeName);
export const useIsDark = () => useThemeStore((state) => state.isDark);
