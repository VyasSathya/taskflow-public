import { useThemeStore, useThemeColors, useThemeName, useIsDark } from '@/lib/stores/theme-store';
import { tokens } from '@/lib/theme/tokens';
import { themes } from '@/lib/theme/themes';

export const useTheme = () => {
  const colors = useThemeColors();
  const { themeName, isDark, setTheme, toggleDarkMode } = useThemeStore();

  return {
    colors: colors || themes.light, // Fallback to light theme if store not hydrated
    tokens,
    themeName,
    isDark,
    setTheme,
    toggleDarkMode,
  };
};

// Re-export selector hooks
export { useThemeColors, useThemeName, useIsDark };
