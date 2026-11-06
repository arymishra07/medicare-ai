import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, HeartPulse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../utils/format';
import Logo from '../components/Logo';

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="not-found-page">
      <div className="not-found-orb not-found-orb-one" />
      <div className="not-found-orb not-found-orb-two" />
      <header className="not-found-nav">
        <Logo />
      </header>

      <main className="not-found-main">
        <span className="not-found-icon"><Compass size={34} /></span>
        <span className="eyebrow">404 · Page not found</span>
        <h1>This page has wandered off.</h1>
        <p>
          The link may be out of date, or the page may have moved. Your health workspace is still
          exactly where you left it.
        </p>
        <div className="not-found-actions">
          <Link to={user ? roleHome(user.role) : '/'} className="btn btn-primary btn-lg">
            <ArrowLeft size={17} /> {user ? 'Back to my dashboard' : 'Back to home'}
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            <HeartPulse size={17} /> Sign in
          </Link>
        </div>
      </main>

      <footer className="not-found-footer">
        <span>MediCare AI · Smart Medical Assistant</span>
      </footer>
    </div>
  );
}
