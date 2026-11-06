import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCog,
  UserRound,
  UsersRound,
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
  formatDate,
  ROLE_LABELS,
  SPECIALIZATIONS,
  truncate,
} from '../../utils/format';

const ROLE_TABS = [
  { key: '', label: 'All users' },
  { key: 'patient', label: 'Patients' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'admin', label: 'Admins' },
];

const roleTone = (role) => (role === 'doctor' ? 'blue' : role === 'admin' ? 'violet' : 'teal');

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await adminService.users({
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        page,
        limit: 12,
      });
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [role, status, debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = (nextRole) => {
    setRole(nextRole);
    setPage(1);
  };

  const toggleActive = async (target) => {
    if (target._id === currentUser._id) {
      toast.warning('You can’t deactivate yourself', 'Ask another administrator to change your access.');
      return;
    }
    setActionId(target._id);
    try {
      await adminService.updateUser(target._id, { isActive: !target.isActive });
      toast.success(
        target.isActive ? 'Account deactivated' : 'Account reactivated',
        `${target.name} ${target.isActive ? 'can no longer sign in' : 'can sign in again'}.`
      );
      await load();
    } catch (err) {
      toast.error('Could not update account', getApiError(err));
    } finally {
      setActionId('');
    }
  };

  const toggleVerified = async (target) => {
    setActionId(target._id);
    try {
      await adminService.updateUser(target._id, { isVerified: !target.isVerified });
      toast.success(
        target.isVerified ? 'Verification removed' : 'Doctor verified',
        target.isVerified
          ? `${target.name} is hidden from the patient directory.`
          : `${target.name} can now receive appointments.`
      );
      await load();
    } catch (err) {
      toast.error('Could not update verification', getApiError(err));
    } finally {
      setActionId('');
    }
  };

  const openEdit = (target) => {
    setEditTarget(target);
    setForm({
      name: target.name || '',
      phone: target.phone || '',
      isActive: target.isActive,
      isVerified: target.isVerified,
      specialization: target.specialization || '',
      qualification: target.qualification || '',
      experienceYears: target.experienceYears ?? 0,
      consultationFee: target.consultationFee ?? 0,
      hospital: target.hospital || '',
      location: target.location || '',
      bio: target.bio || '',
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
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        isActive: form.isActive,
        ...(editTarget.role === 'doctor'
          ? {
              isVerified: form.isVerified,
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
      await adminService.updateUser(editTarget._id, payload);
      toast.success('User updated', 'The changes are now live.');
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
      toast.success('Account deleted', `${deleteTarget.name} and associated data were removed.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error('Could not delete account', getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Access & membership"
        title="Manage users"
        subtitle="Review accounts, control access and keep the platform safe for patients and clinicians."
        actions={
          <span className="header-total"><UsersRound size={16} /> {pagination.total} accounts</span>
        }
      />

      <section className="card filters-card admin-filters">
        <div className="tabs" role="tablist" aria-label="Filter by role">
          {ROLE_TABS.map((tab) => (
            <button
              type="button"
              key={tab.key || 'all'}
              role="tab"
              aria-selected={role === tab.key}
              className={`tab ${role === tab.key ? 'active' : ''}`}
              onClick={() => changeRole(tab.key)}
            >
              {tab.label}
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
              placeholder="Search name, email or phone…"
              aria-label="Search users"
            />
          </div>
          <label className="select-wrap">
            <ShieldCheck size={15} />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by account status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="card"><SkeletonCard height={420} /></div>
      ) : users.length ? (
        <section className="card table-card">
          <div className="table-wrap">
            <table className="data-table users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((target) => (
                  <tr key={target._id}>
                    <td>
                      <div className="table-person">
                        <Avatar name={target.name} size="sm" />
                        <div>
                          <strong>
                            {target.name}
                            {target._id === currentUser._id && <span className="you-tag">You</span>}
                          </strong>
                          <span>{target.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={roleTone(target.role)}>
                        {target.role === 'doctor' ? <Stethoscope size={12} /> : target.role === 'admin' ? <ShieldCheck size={12} /> : <UserRound size={12} />}
                        {ROLE_LABELS[target.role]}
                      </Badge>
                      {target.role === 'doctor' && target.specialization && (
                        <span className="table-muted block-muted">{target.specialization}</span>
                      )}
                    </td>
                    <td><span className="table-muted">{formatDate(target.createdAt, 'short')}</span></td>
                    <td>
                      <span className={`status-text ${target.isActive ? 'active' : 'inactive'}`}>
                        <span /> {target.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      {target.role === 'doctor' ? (
                        <button
                          type="button"
                          className={`verify-chip ${target.isVerified ? 'verified' : ''}`}
                          onClick={() => toggleVerified(target)}
                          disabled={actionId === target._id}
                        >
                          <BadgeCheck size={14} />
                          {target.isVerified ? 'Verified' : 'Verify'}
                        </button>
                      ) : (
                        <span className="table-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="icon-btn" onClick={() => openEdit(target)} aria-label={`Edit ${target.name}`} title="Edit user">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={`icon-btn ${target.isActive ? 'danger' : ''}`}
                          onClick={() => toggleActive(target)}
                          disabled={actionId === target._id || target._id === currentUser._id}
                          aria-label={`${target.isActive ? 'Deactivate' : 'Reactivate'} ${target.name}`}
                          title={target.isActive ? 'Deactivate' : 'Reactivate'}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setDeleteTarget(target)}
                          disabled={target._id === currentUser._id}
                          aria-label={`Delete ${target.name}`}
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>Showing {users.length} of {pagination.total} accounts</span>
            <div className="pagination">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={pagination.page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <span>Page {pagination.page} of {pagination.pages || 1}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPage((value) => Math.min(pagination.pages || 1, value + 1))}
                disabled={pagination.page >= pagination.pages}
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={UserCog}
            title="No users match these filters"
            description="Try clearing the search or switching role and status filters."
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setRole(''); setStatus(''); setPage(1); }}>
                Clear filters
              </button>
            }
          />
        </div>
      )}

      <Modal
        open={Boolean(editTarget)}
        onClose={() => (saving ? null : setEditTarget(null))}
        title={`Edit ${editTarget?.role === 'doctor' ? 'doctor' : 'user'}`}
        subtitle={editTarget?.email}
        icon={editTarget?.role === 'doctor' ? Stethoscope : UserCog}
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
                <label htmlFor="user-name">Full name</label>
                <input
                  id="user-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="user-phone">Phone</label>
                <input
                  id="user-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="toggle-line compact">
              <span>
                <strong>Account active</strong>
                <small>Deactivated users cannot sign in.</small>
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

            {editTarget.role === 'doctor' && (
              <div className="doctor-fields">
                <div className="section-divider"><span>Professional profile</span></div>
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
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="user-specialty">Specialization</label>
                    <select
                      id="user-specialty"
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
                    <label htmlFor="user-qualification">Qualification</label>
                    <input
                      id="user-qualification"
                      value={form.qualification}
                      onChange={(event) => setForm((current) => ({ ...current, qualification: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="user-experience">Years of experience</label>
                    <input
                      id="user-experience"
                      type="number"
                      min="0"
                      max="60"
                      value={form.experienceYears}
                      onChange={(event) => setForm((current) => ({ ...current, experienceYears: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-fee">Consultation fee (₹)</label>
                    <input
                      id="user-fee"
                      type="number"
                      min="0"
                      value={form.consultationFee}
                      onChange={(event) => setForm((current) => ({ ...current, consultationFee: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="user-hospital">Hospital / clinic</label>
                    <input
                      id="user-hospital"
                      value={form.hospital}
                      onChange={(event) => setForm((current) => ({ ...current, hospital: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-location">City</label>
                    <input
                      id="user-location"
                      value={form.location}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="user-bio">Professional bio</label>
                  <textarea
                    id="user-bio"
                    rows={3}
                    value={form.bio}
                    onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                  />
                </div>
              </div>
            )}

            {formError && <div className="form-alert">{formError}</div>}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.name || 'this account'}?`}
        description="Their appointments, reminders, reports and chat history will also be permanently removed."
        confirmLabel="Delete account"
        loading={deleting}
      >
        <p className="confirm-detail">
          Removing a {deleteTarget ? ROLE_LABELS[deleteTarget.role].toLowerCase() : 'user'} is irreversible. Consider deactivating the account if you may need the history later.
        </p>
      </ConfirmDialog>
    </div>
  );
}
