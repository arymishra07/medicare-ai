import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToastState } from '../context/ToastContext';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToastState();

  if (!toasts.length) return null;

  return createPortal(
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info;
        return (
          <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
            <span className="toast-icon">
              <Icon size={19} />
            </span>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.message && <p>{toast.message}</p>}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
