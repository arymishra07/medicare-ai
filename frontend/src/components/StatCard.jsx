import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  meta,
  trend,
  tone = 'teal',
  loading = false,
}) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">{Icon && <Icon size={21} />}</span>
        {trend !== undefined && trend !== null && (
          <span className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{loading ? '—' : value}</div>
      <div className="stat-label">{label}</div>
      {meta && <div className="stat-meta">{meta}</div>}
    </article>
  );
}
