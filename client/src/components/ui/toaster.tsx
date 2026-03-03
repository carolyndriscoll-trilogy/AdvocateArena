import { useState, useCallback, createContext, useContext } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

const ToastContext = createContext<{
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  const context = useContext(ToastContext);
  return {
    toast: context.addToast,
    toasts: context.toasts,
    dismiss: context.removeToast,
  };
}

export function Toaster() {
  return null; // Minimal placeholder — swap with Radix toast when ready
}
