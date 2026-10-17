/**
 * Auth Provider
 * Initializes and manages global authentication state
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
