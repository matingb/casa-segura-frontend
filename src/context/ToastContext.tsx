'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import styles from './ToastContext.module.css';

export type ToastVariant = 'success' | 'error';

export interface ToastOptions {
  duration?: number;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant: ToastVariant, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant, options?: ToastOptions) => {
    const id = ++nextToastId.current;
    setToasts((current) => [...current, { id, message, variant }]);
    window.setTimeout(() => {
      dismissToast(id);
    }, options?.duration ?? 4000);
  }, [dismissToast]);

  const showSuccess = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, 'success', options),
    [showToast]
  );
  const showError = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, 'error', options),
    [showToast]
  );
  const contextValue = useMemo(
    () => ({ showToast, showSuccess, showError, dismissToast }),
    [dismissToast, showError, showSuccess, showToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={styles.container} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.variant]}`} role={toast.variant === 'error' ? 'alert' : 'status'}>
            <span>{toast.message}</span>
            <button
              type="button"
              className={styles.dismissButton}
              aria-label="Cerrar notificación"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe utilizarse dentro de ToastProvider');
  return context;
}
