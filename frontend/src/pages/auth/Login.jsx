import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiError } from '../../services/api';
import { roleHome } from '../../utils/format';
import { InlineSpinner } from '../../components/Loader';

const DEMO_ACCOUNTS = [
  {
    role: 'Patient',
    email: 'patient@medicare.ai',
    password: 'Patient@123',
    icon: UserRound,
    tone: 'teal',
  },
  {
    role: 'Doctor',
    email: 'dr.arjun@medicare.ai',
    password: 'Doctor@123',
    icon: Stethoscope,
    tone: 'blue',
  },
  {
    role: 'Admin',
    email: 'admin@medicare.ai',
    password: 'Admin@123',
    icon: ShieldCheck,
    tone: 'violet',
  },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`, 'Your workspace is ready.');
      navigate(redirectTo || roleHome(user.role), { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-heading">
        <span className="auth-kicker"><Sparkles size={14} /> Welcome back</span>
        <h2>Sign in to your care space</h2>
        <p>Pick up where you left off — your appointments, medicines and records are waiting.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="login-email">Email address</label>
          <div className="input-with-icon">
            <Mail size={17} />
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="login-password">Password</label>
            <span className="field-aside"><LockKeyhole size={12} /> Secured</span>
          </div>
          <div className="input-with-icon input-with-action">
            <LockKeyhole size={17} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {error && <div className="form-alert" role="alert">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? (
            <><InlineSpinner size={17} /> Signing in…</>
          ) : (
            <>Sign in <ArrowRight size={17} /></>
          )}
        </button>
      </form>

      <div className="demo-panel">
        <div className="demo-panel-head">
          <span><UsersRound size={15} /> Explore with a demo account</span>
          <small>One click to fill credentials</small>
        </div>
        <div className="demo-grid">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              type="button"
              key={account.role}
              className={`demo-account demo-${account.tone}`}
              onClick={() => fillDemo(account)}
            >
              <span><account.icon size={17} /></span>
              <strong>{account.role}</strong>
            </button>
          ))}
        </div>
      </div>

      <p className="auth-switch">
        New to MediCare AI? <Link to="/register">Create your free account</Link>
      </p>

      <div className="auth-security-note">
        <ShieldCheck size={15} />
        Your session is protected with encrypted credentials and a signed JWT.
      </div>
    </div>
  );
}
