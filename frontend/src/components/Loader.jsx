export function InlineSpinner({ size = 18, className = '' }) {
  return <span className={`spinner ${className}`} style={{ width: size, height: size }} aria-label="Loading" />;
}

export function PageLoader({ label = 'Preparing your workspace…' }) {
  return (
    <div className="page-loader">
      <div className="page-loader-mark">
        <span className="loader-ring" />
        <span className="loader-pulse" />
      </div>
      <p>{label}</p>
    </div>
  );
}

export function SkeletonCard({ height = 140 }) {
  return <div className="skeleton" style={{ height }} />;
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: rows }).map((_item, index) => (
        <div className="skeleton skeleton-row" key={index} />
      ))}
    </div>
  );
}
