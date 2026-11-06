export default function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
