import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseMedical,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiError } from '../../services/api';
import { roleHome, SPECIALIZATIONS } from '../../utils/format';
import { InlineSpinner } from '../../components/Loader';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  specialization: '',
  qualification: '',
  experienceYears: '',
  consultationFee: '',
  hospital: '',
  location: '',
  bio: '',
};

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('patient');
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleRole = (nextRole) => {
    setRole(nextRole);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.name.trim().length < 2) return setError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError('Please enter a valid email address.');
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return setError('Password must be at least 8 characters and include a letter and a number.');
    }
    if (form.password !== form.confirmPassword) {
      return setError('The passwords do not match.');
    }
    if (role === 'doctor' && !form.specialization) {
      return setError('Please choose your medical specialization.');
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        ...(role === 'doctor'
          ? {
              specialization: form.specialization,
              qualification: form.qualification.trim(),
              experienceYears: form.experienceYears ? Number(form.experienceYears) : 0,
              consultationFee: form.consultationFee ? Number(form.consultationFee) : 0,
              hospital: form.hospital.trim(),
              location: form.location.trim(),
              bio: form.bio.trim(),
            }
          : {}),
      };

      const user = await register(payload);
      toast.success(
        'Account created',
        role === 'doctor'
          ? 'Your professional profile is pending verification. You can explore your dashboard meanwhile.'
          : 'Your personal health workspace is ready.'
      );
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page register-page">
      <div className="auth-heading">
        <span className="auth-kicker"><Sparkles size={14} /> Join MediCare AI</span>
        <h2>Create your care space</h2>
        <p>A few details now, a calmer health routine from here on.</p>
      </div>

      <div className="role-selector" role="group" aria-label="Choose account type">
        <button
          type="button"
          className={`role-option ${role === 'patient' ? 'active' : ''}`}
          onClick={() => handleRole('patient')}
          aria-pressed={role === 'patient'}
        >
          <span className="role-option-icon"><HeartPulse size={20} /></span>
          <span>
            <strong>I’m a patient</strong>
            <small>Book care and track your health</small>
          </span>
          <span className="role-radio" />
        </button>
        <button
          type="button"
          className={`role-option ${role === 'doctor' ? 'active' : ''}`}
          onClick={() => handleRole('doctor')}
          aria-pressed={role === 'doctor'}
        >
          <span className="role-option-icon"><Stethoscope size={20} /></span>
          <span>
            <strong>I’m a doctor</strong>
            <small>Manage appointments and patients</small>
          </span>
          <span className="role-radio" />
        </button>
      </div>

      {role === 'doctor' && (
        <div className="info-banner">
          <BriefcaseMedical size={16} />
          Doctor accounts are reviewed by our admin team before appearing in the public directory.
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <div className="input-with-icon">
              <UserRound size={17} />
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Priya Sharma"
                value={form.name}
                onChange={update}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="register-phone">Phone <span className="optional">(optional)</span></label>
            <div className="input-with-icon">
              <Phone size={17} />
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={update}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="register-email">Email address</label>
          <div className="input-with-icon">
            <Mail size={17} />
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="register-password">Password</label>
            <div className="input-with-icon input-with-action">
              <LockKeyhole size={17} />
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={update}
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

          <div className="field">
            <label htmlFor="register-confirm">Confirm password</label>
            <div className="input-with-icon">
              <LockKeyhole size={17} />
              <input
                id="register-confirm"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={update}
                disabled={submitting}
                required
              />
            </div>
          </div>
        </div>

        <p className="password-hint">Use at least 8 characters, including a letter and a number.</p>

        {role === 'doctor' && (
          <div className="doctor-fields">
            <div className="section-divider"><span>Professional details</span></div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="register-specialization">Specialization</label>
                <select
                  id="register-specialization"
                  name="specialization"
                  value={form.specialization}
                  onChange={update}
                  disabled={submitting}
                  required
                >
                  <option value="">Select a specialty</option>
                  {SPECIALIZATIONS.map((specialization) => (
                    <option key={specialization} value={specialization}>{specialization}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="register-qualification">Qualification</label>
                <input
                  id="register-qualification"
                  name="qualification"
                  type="text"
                  placeholder="MBBS, MD"
                  value={form.qualification}
                  onChange={update}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="register-experience">Years of experience</label>
                <input
                  id="register-experience"
                  name="experienceYears"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="8"
                  value={form.experienceYears}
                  onChange={update}
                  disabled={submitting}
                />
              </div>

              <div className="field">
                <label htmlFor="register-fee">Consultation fee (₹)</label>
                <input
                  id="register-fee"
                  name="consultationFee"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="700"
                  value={form.consultationFee}
                  onChange={update}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="register-hospital">Hospital / clinic</label>
                <div className="input-with-icon">
                  <BriefcaseMedical size={17} />
                  <input
                    id="register-hospital"
                    name="hospital"
                    type="text"
                    placeholder="City Care Hospital"
                    value={form.hospital}
                    onChange={update}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="register-location">City</label>
                <div className="input-with-icon">
                  <MapPin size={17} />
                  <input
                    id="register-location"
                    name="location"
                    type="text"
                    placeholder="Bengaluru"
                    value={form.location}
                    onChange={update}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="register-bio">Short professional bio <span className="optional">(optional)</span></label>
              <textarea
                id="register-bio"
                name="bio"
                rows={3}
                placeholder="Tell patients about your approach and focus areas…"
                value={form.bio}
                onChange={update}
                maxLength={800}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {error && <div className="form-alert" role="alert">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? (
            <><InlineSpinner size={17} /> Creating account…</>
          ) : (
            <>Create my account <ArrowRight size={17} /></>
          )}
        </button>

        <p className="terms-note">
          By creating an account, you agree to use MediCare AI responsibly. It supports — but never
          replaces — professional medical care.
        </p>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in instead</Link>
      </p>
    </div>
  );
}
