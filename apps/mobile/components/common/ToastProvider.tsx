import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastProvider, ToastContext } from '@/lib/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const insets = useSafeAreaInsets();
  const { toasts, showToast, hideToast, clearToasts, ToastContext: Context } =
    useToastProvider();

  return (
    <Context.Provider value={{ toasts, showToast, hideToast, clearToasts }}>
      {children}
      <View style={[styles.container, { top: insets.top + 8 }]}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => hideToast(toast.id)}
          />
        ))}
      </View>
    </Context.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
});
