/**
 * Theme Provider (Web)
 * Applies theme class to HTML element and maintains sync with store
 */

'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { initialize, resolvedTheme } = useThemeStore();

  // Initialize theme store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply theme class to document element when resolved theme changes
  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  return <>{children}</>;
}
