import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  BriefcaseMedical,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Wallet,
} from 'lucide-react';
import { authService } from '../services/authService';
import { getApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import { InlineSpinner } from '../components/Loader';
import {
  formatDate,
  ROLE_LABELS,
  SPECIALIZATIONS,
  todayString,
} from '../utils/format';

const GENDERS = [
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const roleTone = (role) => (role === 'doctor' ? 'blue' : role === 'admin' ? 'violet' : 'teal');

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'security' ? 'security' : 'account';
  const [tab, setTab] = useState(initialTab);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'prefer_not_to_say',
    dateOfBirth: '',
    address: '',
    bloodGroup: '',
    emergencyContact: '',
    specialization: '',
    qualification: '',
    experienceYears: 0,
    consultationFee: 0,
    hospital: '',
    location: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      gender: user.gender || 'prefer_not_to_say',
      dateOfBirth: toDateInput(user.dateOfBirth),
      address: user.address || '',
      bloodGroup: user.bloodGroup || '',
      emergencyContact: user.emergencyContact || '',
      specialization: user.specialization || '',
      qualification: user.qualification || '',
      experienceYears: user.experienceYears ?? 0,
      consultationFee: user.consultationFee ?? 0,
      hospital: user.hospital || '',
      location: user.location || '',
      bio: user.bio || '',
    });
  }, [user]);

  useEffect(() => {
    const requested = searchParams.get('tab') === 'security' ? 'security' : 'account';
    setTab(requested);
  }, [searchParams]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSearchParams(nextTab === 'security' ? { tab: 'security' } : {}, { replace: true });
  };

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  };

  const passwordChecks = useMemo(
    () => ({
      length: passwordForm.newPassword.length >= 8,
      letter: /[A-Za-z]/.test(passwordForm.newPassword),
      number: /\d/.test(passwordForm.newPassword),
      match:
        passwordForm.newPassword.length > 0 &&
        passwordForm.newPassword === passwordForm.confirmPassword,
    }),
    [passwordForm]
  );

  const saveProfile = async (event) => {
    event.preventDefault();
    setFormError('');

    if (form.name.trim().length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (form.dateOfBirth && form.dateOfBirth > todayString()) {
      setFormError('Date of birth cannot be in the future.');
      return;
    }
    if (user.role === 'doctor' && !form.specialization) {
      setFormError('Please choose your medical specialization.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address.trim(),
        bloodGroup: form.bloodGroup,
        emergencyContact: form.emergencyContact.trim(),
        ...(user.role === 'doctor'
          ? {
              specialization: form.specialization,
              qualification: form.qualification.trim(),
              experienceYears: Number(form.experienceYears) || 0,
              consultationFee: Number(form.consultationFee) || 0,
              hospital: form.hospital.trim(),
              location: form.location.trim(),
              bio: form.bio.trim(),
            }
          : {}),
      };
      await authService.updateProfile(payload);
      await refreshUser();
      toast.success('Profile updated', 'Your details have been saved securely.');
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!passwordChecks.length || !passwordChecks.letter || !passwordChecks.number) {
      setPasswordError('Your new password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    setChanging(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed', 'Use your new password the next time you sign in.');
    } catch (err) {
      setPasswordError(getApiError(err));
    } finally {
      setChanging(false);
    }
  };

  const completion = useMemo(() => {
    const fields =
      user?.role === 'doctor'
        ? ['name', 'phone', 'specialization', 'qualification', 'hospital', 'location', 'bio']
        : ['name', 'phone', 'dateOfBirth', 'address', 'bloodGroup', 'emergencyContact'];
    const filled = fields.filter((field) => {
      const value = form[field];
      return value !== '' && value !== null && value !== undefined;
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [form, user?.role]);

  if (!user) return null;

  return (
    <div className="page-stack profile-page">
      <PageHeader
        eyebrow="Your account"
        title="Profile & security"
        subtitle="Keep your details current and your account protected. Only you can edit this information."
      />

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <section className="card profile-summary-card">
            <div className="profile-summary-head">
              <Avatar name={user.name} size="xl" online />
              <Badge tone={roleTone(user.role)}>
                {user.role === 'doctor' ? <Stethoscope size={12} /> : user.role === 'admin' ? <ShieldCheck size={12} /> : <UserRound size={12} />}
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            {user.role === 'doctor' && (
              <span className={`verify-chip ${user.isVerified ? 'verified' : ''}`}>
                <BadgeCheck size={14} /> {user.isVerified ? 'Verified professional' : 'Verification pending'}
              </span>
            )}

            <div className="profile-completion">
              <div className="profile-completion-head">
                <span>Profile completeness</span>
                <strong>{completion}%</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
              <small>
                {completion === 100
                  ? 'Your profile is complete.'
                  : 'Add the missing details to help your care team.'}
              </small>
            </div>

            <div className="profile-facts">
              <div><CalendarDays size={14} /><span>Member since</span><strong>{formatDate(user.createdAt, 'short')}</strong></div>
              <div><ShieldCheck size={14} /><span>Account status</span><strong>{user.isActive ? 'Active' : 'Deactivated'}</strong></div>
              {user.lastLoginAt && (
                <div><LockKeyhole size={14} /><span>Last sign-in</span><strong>{formatDate(user.lastLoginAt, 'short')}</strong></div>
              )}
            </div>
          </section>

          <section className="card profile-security-note">
            <span className="profile-note-icon"><ShieldCheck size={19} /></span>
            <h3>Your data stays yours</h3>
            <p>
              Profile changes are audited and passwords are hashed with bcrypt. MediCare AI never
              shares your personal details without your care relationship.
            </p>
          </section>
        </aside>

        <div className="profile-main">
          <div className="tabs profile-tabs" role="tablist" aria-label="Profile sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'account'}
              className={`tab ${tab === 'account' ? 'active' : ''}`}
              onClick={() => changeTab('account')}
            >
              <UserRound size={15} /> Account details
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'security'}
              className={`tab ${tab === 'security' ? 'active' : ''}`}
              onClick={() => changeTab('security')}
            >
              <KeyRound size={15} /> Password & security
            </button>
          </div>

          {tab === 'account' ? (
            <form className="card profile-form" onSubmit={saveProfile} noValidate>
              <div className="card-head">
                <div>
                  <span className="card-kicker">Personal information</span>
                  <h2>Account details</h2>
                </div>
                <span className="card-chip">Private</span>
              </div>

              <div className="readonly-grid">
                <div className="readonly-field">
                  <span><Mail size={14} /> Email address</span>
                  <strong>{user.email}</strong>
                  <small>Contact support to change your sign-in email.</small>
                </div>
                <div className="readonly-field">
                  <span><UserRound size={14} /> Account type</span>
                  <strong>{ROLE_LABELS[user.role]}</strong>
                  <small>Roles are managed by the platform administrator.</small>
                </div>
              </div>

              <div className="section-divider"><span>Your details</span></div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="profile-name">Full name</label>
                  <div className="input-with-icon">
                    <UserRound size={17} />
                    <input
                      id="profile-name"
                      value={form.name}
                      onChange={(event) => update('name', event.target.value)}
                      maxLength={80}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="profile-phone">Phone</label>
                  <div className="input-with-icon">
                    <Phone size={17} />
                    <input
                      id="profile-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => update('phone', event.target.value)}
                      maxLength={25}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="profile-gender">Gender</label>
                  <select id="profile-gender" value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                    {GENDERS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="profile-dob">Date of birth</label>
                  <input
                    id="profile-dob"
                    type="date"
                    max={todayString()}
                    value={form.dateOfBirth}
                    onChange={(event) => update('dateOfBirth', event.target.value)}
                  />
                </div>
              </div>

              {user.role === 'patient' && (
                <>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="profile-blood">Blood group</label>
                      <select id="profile-blood" value={form.bloodGroup} onChange={(event) => update('bloodGroup', event.target.value)}>
                        {BLOOD_GROUPS.map((group) => (
                          <option key={group || 'unknown'} value={group}>{group || 'Not known'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="profile-emergency">Emergency contact</label>
                      <div className="input-with-icon">
                        <Phone size={17} />
                        <input
                          id="profile-emergency"
                          value={form.emergencyContact}
                          onChange={(event) => update('emergencyContact', event.target.value)}
                          maxLength={30}
                          placeholder="Name and phone number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="profile-address">Address</label>
                    <div className="input-with-icon">
                      <MapPin size={17} />
                      <input
                        id="profile-address"
                        value={form.address}
                        onChange={(event) => update('address', event.target.value)}
                        maxLength={250}
                        placeholder="Street, city, state"
                      />
                    </div>
                  </div>
                </>
              )}

              {user.role === 'doctor' && (
                <>
                  <div className="section-divider"><span>Professional profile</span></div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="profile-specialty">Specialization</label>
                      <select
                        id="profile-specialty"
                        value={form.specialization}
                        onChange={(event) => update('specialization', event.target.value)}
                      >
                        <option value="">Select a specialty</option>
                        {SPECIALIZATIONS.map((specialization) => (
                          <option key={specialization} value={specialization}>{specialization}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="profile-qualification">Qualification</label>
                      <div className="input-with-icon">
                        <BriefcaseMedical size={17} />
                        <input
                          id="profile-qualification"
                          value={form.qualification}
                          onChange={(event) => update('qualification', event.target.value)}
                          placeholder="MBBS, MD"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="profile-experience">Years of experience</label>
                      <input
                        id="profile-experience"
                        type="number"
                        min="0"
                        max="60"
                        value={form.experienceYears}
                        onChange={(event) => update('experienceYears', event.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="profile-fee">Consultation fee (₹)</label>
                      <div className="input-with-icon">
                        <Wallet size={17} />
                        <input
                          id="profile-fee"
                          type="number"
                          min="0"
                          max="100000"
                          step="50"
                          value={form.consultationFee}
                          onChange={(event) => update('consultationFee', event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="profile-hospital">Hospital / clinic</label>
                      <div className="input-with-icon">
                        <BriefcaseMedical size={17} />
                        <input
                          id="profile-hospital"
                          value={form.hospital}
                          onChange={(event) => update('hospital', event.target.value)}
                          placeholder="City Care Hospital"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="profile-location">City</label>
                      <div className="input-with-icon">
                        <MapPin size={17} />
                        <input
                          id="profile-location"
                          value={form.location}
                          onChange={(event) => update('location', event.target.value)}
                          placeholder="Bengaluru"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="profile-bio">Professional bio</label>
                    <textarea
                      id="profile-bio"
                      rows={4}
                      maxLength={800}
                      value={form.bio}
                      onChange={(event) => update('bio', event.target.value)}
                      placeholder="Tell patients about your approach and focus areas…"
                    />
                    <span className="field-hint">{form.bio.length}/800 characters</span>
                  </div>
                </>
              )}

              {formError && <div className="form-alert">{formError}</div>}

              <div className="form-actions">
                <span className="form-actions-note"><ShieldCheck size={14} /> Changes are saved to your private account.</span>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><InlineSpinner size={16} /> Saving…</> : <><Save size={16} /> Save changes</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-security-panel">
              <form className="card profile-form" onSubmit={changePassword} noValidate>
                <div className="card-head">
                  <div>
                    <span className="card-kicker">Account protection</span>
                    <h2>Change your password</h2>
                  </div>
                  <span className="card-chip">Encrypted</span>
                </div>

                <p className="profile-form-copy">
                  Choose a strong password you don’t use elsewhere. You’ll stay signed in on this
                  device after changing it.
                </p>

                <div className="field">
                  <label htmlFor="current-password">Current password</label>
                  <div className="input-with-icon input-with-action">
                    <LockKeyhole size={17} />
                    <input
                      id="current-password"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => {
                        setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }));
                        setPasswordError('');
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowPasswords((value) => !value)}
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="new-password">New password</label>
                    <div className="input-with-icon">
                      <KeyRound size={17} />
                      <input
                        id="new-password"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={passwordForm.newPassword}
                        onChange={(event) => {
                          setPasswordForm((current) => ({ ...current, newPassword: event.target.value }));
                          setPasswordError('');
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="confirm-new-password">Confirm new password</label>
                    <div className="input-with-icon">
                      <KeyRound size={17} />
                      <input
                        id="confirm-new-password"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => {
                          setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }));
                          setPasswordError('');
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="password-rules">
                  <span className={passwordChecks.length ? 'met' : ''}>
                    {passwordChecks.length ? <Check size={13} /> : <span className="rule-dot" />} At least 8 characters
                  </span>
                  <span className={passwordChecks.letter ? 'met' : ''}>
                    {passwordChecks.letter ? <Check size={13} /> : <span className="rule-dot" />} Includes a letter
                  </span>
                  <span className={passwordChecks.number ? 'met' : ''}>
                    {passwordChecks.number ? <Check size={13} /> : <span className="rule-dot" />} Includes a number
                  </span>
                  <span className={passwordChecks.match ? 'met' : ''}>
                    {passwordChecks.match ? <Check size={13} /> : <span className="rule-dot" />} Passwords match
                  </span>
                </div>

                {passwordError && <div className="form-alert">{passwordError}</div>}

                <div className="form-actions">
                  <span className="form-actions-note"><LockKeyhole size={14} /> Never share your password with anyone.</span>
                  <button type="submit" className="btn btn-primary" disabled={changing}>
                    {changing ? <><InlineSpinner size={16} /> Updating…</> : <><ShieldCheck size={16} /> Update password</>}
                  </button>
                </div>
              </form>

              <section className="card security-checklist">
                <span className="security-checklist-icon"><Sparkles size={20} /></span>
                <h3>Security checklist</h3>
                <ul>
                  <li><CheckCircle2 size={15} /> Your session uses a signed JWT and expires automatically.</li>
                  <li><CheckCircle2 size={15} /> Medical reports are served through authenticated, audited downloads.</li>
                  <li><CheckCircle2 size={15} /> Deactivated accounts cannot sign in, even with a saved password.</li>
                  <li><CheckCircle2 size={15} /> Use a unique password and sign out on shared devices.</li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
