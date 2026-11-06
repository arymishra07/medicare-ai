export default function Badge({ tone = 'neutral', children, dot = false, className = '' }) {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
