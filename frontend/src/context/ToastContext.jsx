import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, title, message = '') => {
      counter += 1;
      const id = `toast-${Date.now()}-${counter}`;
      setToasts((current) => [...current.slice(-3), { id, type, title, message }]);
      window.setTimeout(() => dismiss(id), 5000);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
      warning: (title, message) => push('warning', title, message),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context.toast;
};

export const useToastState = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToastState must be used within a ToastProvider');
  return context;
};
