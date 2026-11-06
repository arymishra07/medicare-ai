import {
  CalendarCheck2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Logo from '../components/Logo';

export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-visual-inner">
          <Logo light />

          <div className="auth-hero-copy">
            <span className="auth-eyebrow">
              <Sparkles size={14} /> Intelligent care, beautifully simple
            </span>
            <h1>
              Your health,
              <br />
              in <span>better hands.</span>
            </h1>
            <p>
              Book trusted specialists, stay on top of medicines and keep every report safe — all in
              one calm, connected workspace.
            </p>

            <ul className="auth-points">
              <li>
                <span><CalendarCheck2 size={17} /></span>
                Real-time appointment booking with verified doctors
              </li>
              <li>
                <span><ShieldCheck size={17} /></span>
                Private, encrypted medical records you control
              </li>
              <li>
                <span><TrendingUp size={17} /></span>
                Personal health insights and gentle reminders
              </li>
            </ul>
          </div>

          <div className="auth-proof">
            <div className="auth-proof-card">
              <div className="auth-proof-icon">
                <LockKeyhole size={18} />
              </div>
              <div>
                <strong>HIPAA-minded security</strong>
                <span>JWT sessions · role-based access · audited file access</span>
              </div>
            </div>
            <div className="auth-proof-stats">
              <div>
                <strong>12k+</strong>
                <span>Care interactions</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Patient satisfaction</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>AI health guidance</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-vital-card">
          <div className="auth-vital-ring">
            <span>94</span>
            <small>Health score</small>
          </div>
          <div className="auth-vital-copy">
            <span className="live-pill"><span /> Live</span>
            <strong>Everything looks balanced</strong>
            <p>Vitals, medicines and upcoming visits are on track.</p>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className={`auth-card ${wide ? 'auth-card-wide' : ''}`}>{children}</div>
        <p className="auth-copyright">
          © {new Date().getFullYear()} MediCare AI. Built for better everyday health.
        </p>
      </main>
    </div>
  );
}
