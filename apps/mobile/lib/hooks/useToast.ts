import { useCallback, useState, createContext, useContext, ReactNode } from 'react';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  toasts: ToastConfig[];
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    // Provide a fallback for when context isn't available
    return {
      toasts: [],
      showToast: (config: Omit<ToastConfig, 'id'>) => {
        console.log('[Toast]', config.type, config.title, config.message);
      },
      hideToast: (_id: string) => {},
      clearToasts: () => {},
      // Convenience methods
      success: (title: string, message?: string) => {
        console.log('[Toast Success]', title, message);
      },
      error: (title: string, message?: string) => {
        console.log('[Toast Error]', title, message);
      },
      warning: (title: string, message?: string) => {
        console.log('[Toast Warning]', title, message);
      },
      info: (title: string, message?: string) => {
        console.log('[Toast Info]', title, message);
      },
    };
  }

  const { showToast, hideToast, clearToasts, toasts } = context;

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
    // Convenience methods
    success: (title: string, message?: string) => {
      showToast({ type: 'success', title, message });
    },
    error: (title: string, message?: string) => {
      showToast({ type: 'error', title, message });
    },
    warning: (title: string, message?: string) => {
      showToast({ type: 'warning', title, message });
    },
    info: (title: string, message?: string) => {
      showToast({ type: 'info', title, message });
    },
  };
};

// Toast Provider component
export const useToastProvider = () => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const toast: ToastConfig = { ...config, id };

    setToasts((prev) => [...prev, toast]);

    // Auto-hide after duration
    const duration = config.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
    ToastContext,
  };
};

export { ToastContext };
