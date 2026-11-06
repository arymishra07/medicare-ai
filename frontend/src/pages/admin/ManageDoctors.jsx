import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Pencil,
  Power,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { InlineSpinner, SkeletonCard } from '../../components/Loader';
import {
  formatCurrency,
  formatDate,
  SPECIALIZATIONS,
  WEEK_DAYS,
} from '../../utils/format';

const FILTERS = [
  { key: 'all', label: 'All doctors' },
  { key: 'pending', label: 'Pending verification' },
  { key: 'verified', label: 'Verified' },
];

const availabilityLabel = (days = []) => {
  if (!days.length) return 'No clinic days published';
  return days.map((day) => WEEK_DAYS[day]?.slice(0, 3)).join(' · ');
};

export default function ManageDoctors() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionId, setActionId] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await adminService.doctors({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filter === 'pending' ? { verified: 'false' } : {}),
        ...(filter === 'verified' ? { verified: 'true' } : {}),
      });
      setDoctors(data.data.doctors);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: doctors.length,
      verified: doctors.filter((doctor) => doctor.isVerified).length,
      pending: doctors.filter((doctor) => !doctor.isVerified).length,
      active: doctors.filter((doctor) => doctor.isActive).length,
    }),
    [doctors]
  );

  const pendingDoctors = useMemo(
    () => doctors.filter((doctor) => !doctor.isVerified && doctor.isActive),
    [doctors]
  );

  const updateDoctor = async (doctor, payload, successTitle, successMessage) => {
    setActionId(doctor._id);
    try {
      await adminService.updateUser(doctor._id, payload);
      toast.success(successTitle, successMessage);
      await load();
    } catch (err) {
      toast.error('Could not update doctor', getApiError(err));
    } finally {
      setActionId('');
    }
  };

  const toggleVerified = (doctor) =>
    updateDoctor(
      doctor,
      { isVerified: !doctor.isVerified },
      doctor.isVerified ? 'Verification removed' : 'Doctor verified',
      doctor.isVerified
        ? `${doctor.name} is now hidden from the patient directory.`
        : `${doctor.name} can now receive appointments from patients.`
    );

  const toggleActive = (doctor) => {
    if (doctor._id === currentUser._id) {
      toast.warning('You can’t deactivate yourself');
      return;
    }
    return updateDoctor(
      doctor,
      { isActive: !doctor.isActive },
      doctor.isActive ? 'Doctor deactivated' : 'Doctor reactivated',
      `${doctor.name} ${doctor.isActive ? 'can no longer sign in or receive bookings' : 'can sign in and receive bookings again'}.`
    );
  };

  const openEdit = (doctor) => {
    setEditTarget(doctor);
    setForm({
      name: doctor.name || '',
      phone: doctor.phone || '',
      specialization: doctor.specialization || '',
      qualification: doctor.qualification || '',
      experienceYears: doctor.experienceYears ?? 0,
      consultationFee: doctor.consultationFee ?? 0,
      hospital: doctor.hospital || '',
      location: doctor.location || '',
      bio: doctor.bio || '',
      isVerified: doctor.isVerified,
      isActive: doctor.isActive,
    });
    setFormError('');
  };

  const saveEdit = async () => {
    if (form.name.trim().length < 2) {
      setFormError('Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await adminService.updateUser(editTarget._id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        specialization: form.specialization,
        qualification: form.qualification.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        consultationFee: Number(form.consultationFee) || 0,
        hospital: form.hospital.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        isVerified: form.isVerified,
        isActive: form.isActive,
      });
      toast.success('Doctor profile updated', 'The changes are now live.');
      setEditTarget(null);
      await load();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteUser(deleteTarget._id);
      toast.success('Doctor removed', `${deleteTarget.name} and associated data were deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error('Could not delete doctor', getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Clinical network"
        title="Manage doctors"
        subtitle="Verify professionals, keep profiles accurate and make sure patients only find clinicians you trust."
        actions={
          <span className="header-total">
            <Stethoscope size={16} /> {summary.total} doctors
          </span>
        }
      />

      <div className="mini-stat-row">
        <div className="mini-stat">
          <span className="mini-stat-icon teal"><Stethoscope size={17} /></span>
          <div><strong>{summary.total}</strong><span>Doctors in view</span></div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon green"><BadgeCheck size={17} /></span>
          <div><strong>{summary.verified}</strong><span>Verified professionals</span></div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon amber"><ShieldAlert size={17} /></span>
          <div><strong>{summary.pending}</strong><span>Awaiting verification</span></div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon blue"><Power size={17} /></span>
          <div><strong>{summary.active}</strong><span>Active accounts</span></div>
        </div>
      </div>

      {filter !== 'pending' && pendingDoctors.length > 0 && (
        <button
          type="button"
          className="verification-banner clickable verification-button"
          onClick={() => setFilter('pending')}
        >
          <span className="verification-icon"><ShieldAlert size={20} /></span>
          <div>
            <strong>
              {pendingDoctors.length} doctor{pendingDoctors.length === 1 ? '' : 's'} waiting for verification
            </strong>
            <p>Review credentials and approve professionals so patients can start booking.</p>
          </div>
          <span className="btn btn-secondary btn-sm">Review pending</span>
        </button>
      )}

      <section className="card filters-card admin-filters">
        <div className="tabs" role="tablist" aria-label="Filter doctors">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item.key}
              role="tab"
              aria-selected={filter === item.key}
              className={`tab ${filter === item.key ? 'active' : ''}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <div className="table-search">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or specialty…"
              aria-label="Search doctors"
            />
          </div>
          <span className="filter-count">{doctors.length} results</span>
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="admin-doctor-grid">
          {Array.from({ length: 4 }).map((_item, index) => <SkeletonCard key={index} height={360} />)}
        </div>
      ) : doctors.length ? (
        <div className="admin-doctor-grid">
          {doctors.map((doctor) => (
            <article
              className={`admin-doctor-card ${doctor.isVerified ? 'verified' : 'pending'} ${doctor.isActive ? '' : 'inactive'}`}
              key={doctor._id}
            >
              <div className="admin-doctor-head">
                <Avatar name={doctor.name} size="lg" />
                <div className="admin-doctor-identity">
                  <div className="doctor-name-row">
                    <h3>{doctor.name}</h3>
                    {doctor.isVerified ? (
                      <span className="verified-mark" title="Verified professional"><CheckCircle2 size={16} /></span>
                    ) : null}
                  </div>
                  <p>{doctor.specialization || 'Specialization not set'}</p>
                  <span>{doctor.email}</span>
                </div>
                <Badge tone={doctor.isVerified ? 'success' : 'warning'} dot>
                  {doctor.isVerified ? 'Verified' : 'Pending'}
                </Badge>
              </div>

              <div className="admin-doctor-meta">
                <span><MapPin size={13} /> {doctor.hospital || 'Hospital not set'}{doctor.location ? `, ${doctor.location}` : ''}</span>
                <span><Stethoscope size={13} /> {doctor.experienceYears || 0} years · {doctor.qualification || 'Qualification not set'}</span>
                <span><Wallet size={13} /> {formatCurrency(doctor.consultationFee)} consultation fee</span>
                <span><CalendarDays size={13} /> {availabilityLabel(doctor.availableDays)}</span>
              </div>

              <div className="admin-doctor-stats">
                <div><strong>{doctor.totalAppointments || 0}</strong><span>Appointments</span></div>
                <div><strong>{doctor.totalPatients || 0}</strong><span>Patients</span></div>
                <div><strong>{doctor.pendingAppointments || 0}</strong><span>Pending</span></div>
              </div>

              <div className="admin-doctor-foot">
                <span className={`status-text ${doctor.isActive ? 'active' : 'inactive'}`}>
                  <span /> {doctor.isActive ? 'Active account' : 'Deactivated'}
                </span>
                <span className="admin-doctor-joined">Joined {formatDate(doctor.createdAt, 'short')}</span>
              </div>

              <div className="admin-doctor-actions">
                <button
                  type="button"
                  className={`btn btn-sm ${doctor.isVerified ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => toggleVerified(doctor)}
                  disabled={actionId === doctor._id}
                >
                  {actionId === doctor._id ? (
                    <><InlineSpinner size={14} /> Updating…</>
                  ) : doctor.isVerified ? (
                    <><ShieldCheck size={14} /> Unverify</>
                  ) : (
                    <><BadgeCheck size={14} /> Verify doctor</>
                  )}
                </button>
                <button type="button" className="icon-btn" onClick={() => openEdit(doctor)} aria-label={`Edit ${doctor.name}`} title="Edit profile">
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className={`icon-btn ${doctor.isActive ? 'danger' : ''}`}
                  onClick={() => toggleActive(doctor)}
                  disabled={actionId === doctor._id || doctor._id === currentUser._id}
                  aria-label={`${doctor.isActive ? 'Deactivate' : 'Reactivate'} ${doctor.name}`}
                  title={doctor.isActive ? 'Deactivate account' : 'Reactivate account'}
                >
                  <Power size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => setDeleteTarget(doctor)}
                  disabled={doctor._id === currentUser._id}
                  aria-label={`Delete ${doctor.name}`}
                  title="Delete doctor"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={filter === 'pending' ? ShieldCheck : Stethoscope}
            title={
              filter === 'pending'
                ? 'No doctors waiting for verification'
                : search
                  ? 'No doctors match your search'
                  : 'No doctors in this view'
            }
            description={
              filter === 'pending'
                ? 'Every professional in this view has been reviewed. Nice work.'
                : 'Try a different search term or switch filters.'
            }
            tone={filter === 'pending' ? 'green' : 'teal'}
            action={
              search || filter !== 'all' ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilter('all'); }}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      <Modal
        open={Boolean(editTarget)}
        onClose={() => (saving ? null : setEditTarget(null))}
        title="Edit doctor profile"
        subtitle={editTarget?.email}
        icon={Stethoscope}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? <><InlineSpinner size={16} /> Saving…</> : 'Save changes'}
            </button>
          </>
        }
      >
        {editTarget && (
          <>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="doctor-name">Full name</label>
                <input
                  id="doctor-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="doctor-phone">Phone</label>
                <input
                  id="doctor-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="doctor-specialty">Specialization</label>
                <select
                  id="doctor-specialty"
                  value={form.specialization}
                  onChange={(event) => setForm((current) => ({ ...current, specialization: event.target.value }))}
                >
                  <option value="">Not set</option>
                  {SPECIALIZATIONS.map((specialization) => (
                    <option key={specialization} value={specialization}>{specialization}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="doctor-qualification">Qualification</label>
                <input
                  id="doctor-qualification"
                  value={form.qualification}
                  onChange={(event) => setForm((current) => ({ ...current, qualification: event.target.value }))}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="doctor-experience">Years of experience</label>
                <input
                  id="doctor-experience"
                  type="number"
                  min="0"
                  max="60"
                  value={form.experienceYears}
                  onChange={(event) => setForm((current) => ({ ...current, experienceYears: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="doctor-fee">Consultation fee (₹)</label>
                <input
                  id="doctor-fee"
                  type="number"
                  min="0"
                  value={form.consultationFee}
                  onChange={(event) => setForm((current) => ({ ...current, consultationFee: event.target.value }))}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="doctor-hospital">Hospital / clinic</label>
                <input
                  id="doctor-hospital"
                  value={form.hospital}
                  onChange={(event) => setForm((current) => ({ ...current, hospital: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="doctor-location">City</label>
                <input
                  id="doctor-location"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="doctor-bio">Professional bio</label>
              <textarea
                id="doctor-bio"
                rows={3}
                maxLength={800}
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              />
            </div>

            <div className="toggle-line compact">
              <span>
                <strong>Verified professional</strong>
                <small>Verified doctors appear in the patient directory.</small>
              </span>
              <span className={`switch ${form.isVerified ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.isVerified}
                  onChange={(event) => setForm((current) => ({ ...current, isVerified: event.target.checked }))}
                />
                <span className="switch-thumb" />
              </span>
            </div>

            <div className="toggle-line compact">
              <span>
                <strong>Account active</strong>
                <small>Deactivated doctors cannot sign in or receive bookings.</small>
              </span>
              <span className={`switch ${form.isActive ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  disabled={editTarget._id === currentUser._id}
                />
                <span className="switch-thumb" />
              </span>
            </div>

            {formError && <div className="form-alert">{formError}</div>}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.name || 'this doctor'}?`}
        description="Their appointments, availability and related records will be permanently removed."
        confirmLabel="Delete doctor"
        loading={deleting}
      >
        <p className="confirm-detail">
          This also removes the doctor from every patient’s care history. Deactivating the account keeps the history intact.
        </p>
        <div className="confirm-summary">
          <UserRound size={15} />
          <span>{deleteTarget?.email}</span>
          <UsersRound size={15} />
          <span>{deleteTarget?.totalPatients || 0} patients affected</span>
          <CalendarCheck2 size={15} />
          <span>{deleteTarget?.totalAppointments || 0} appointments</span>
        </div>
      </ConfirmDialog>
    </div>
  );
}
