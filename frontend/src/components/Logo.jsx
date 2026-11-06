import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

export default function Logo({ to = '/', compact = false, light = false }) {
  return (
    <Link to={to} className={`brand ${light ? 'brand-light' : ''}`} aria-label="MediCare AI home">
      <span className="brand-mark">
        <HeartPulse size={compact ? 20 : 24} strokeWidth={2.4} />
      </span>
      <span className="brand-copy">
        <span className="brand-name">
          MediCare <span>AI</span>
        </span>
        {!compact && <span className="brand-tagline">Smart Medical Assistant</span>}
      </span>
    </Link>
  );
}
