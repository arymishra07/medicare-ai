import { RefreshCw } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  tone = 'teal',
}) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      {Icon && (
        <span className={`empty-icon empty-icon-${tone}`}>
          <Icon size={compact ? 22 : 28} />
        </span>
      )}
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state">
      <span className="empty-icon empty-icon-rose">
        <RefreshCw size={26} />
      </span>
      <h4>We couldn’t load this</h4>
      <p>{message || 'Please check your connection and try again.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}
