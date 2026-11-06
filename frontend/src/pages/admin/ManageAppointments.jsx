import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  RotateCcw,
  Search,
  Stethoscope,
  UserRound,
  XCircle,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { InlineSpinner, SkeletonCard } from '../../components/Loader';
import {
  formatDate,
  formatDateTime,
  formatTime,
  STATUS_META,
  todayString,
  truncate,
} from '../../utils/format';

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Declined' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTION_COPY = {
  reject: {
    title: 'Decline this appointment?',
    description: 'Add a brief reason. The patient and doctor will see this note.',
    label: 'Reason for declining',
    placeholder: 'e.g. Duplicate request — an existing appointment already covers this visit.',
    confirm: 'Decline appointment',
    tone: 'btn-danger',
    icon: XCircle,
  },
  cancel: {
    title: 'Cancel this appointment?',
    description: 'This releases the slot and notifies both the patient and doctor.',
    label: 'Reason for cancellation',
    placeholder: 'e.g. Cancelled at the patient’s request during a support call.',
    confirm: 'Cancel appointment',
    tone: 'btn-danger',
    icon: XCircle,
  },
  complete: {
    title: 'Mark this visit complete?',
    description: 'Optionally add a short administrative note for the appointment record.',
    label: 'Internal / clinical note (optional)',
    placeholder: 'e.g. Visit confirmed as completed by the clinic.',
    confirm: 'Mark completed',
    tone: 'btn-primary',
    icon: CheckCircle2,
  },
};

export default function ManageAppointments() {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState('');
  const [actionId, setActionId] = useState('');
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [note, setNote] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await adminService.appointments({
        ...(tab ? { status: tab } : {}),
        ...(date ? { date } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        limit: 300,
      });
      setAppointments(data.data.appointments);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date, debouncedSearch]);

  const summary = useMemo(
    () => ({
      total: appointments.length,
      pending: appointments.filter((item) => item.status === 'pending').length,
      confirmed: appointments.filter((item) => item.status === 'approved').length,
      today: appointments.filter(
        (item) => item.date === todayString() && ['pending', 'approved'].includes(item.status)
      ).length,
    }),
    [appointments]
  );

  const updateStatus = async (appointment, payload, successTitle, successMessage) => {
    setActionId(appointment._id);
    try {
      await adminService.updateAppointmentStatus(appointment._id, payload);
      toast.success(successTitle, successMessage);
      await load();
    } catch (err) {
      toast.error('Could not update appointment', getApiError(err));
    } finally {
      setActionId('');
    }
  };

  const approve = (appointment) =>
    updateStatus(
      appointment,
      { status: 'approved' },
      'Appointment confirmed',
      `${appointment.patient?.name || 'The patient'} and ${appointment.doctor?.name || 'the doctor'} have been notified.`
    );

  const reopen = (appointment) =>
    updateStatus(
      appointment,
      { status: 'pending' },
      'Appointment reopened',
      'It is now pending review by the doctor.'
    );

  const openAction = (type, appointment) => {
    setActionModal({ type, appointment });
    setNote(type === 'complete' ? appointment.doctorNotes || '' : '');
    setModalError('');
  };

  const submitAction = async () => {
    if (!actionModal) return;
    const { type, appointment } = actionModal;

    if ((type === 'reject' || type === 'cancel') && note.trim().length < 3) {
      setModalError('Please add a short reason for the record.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const payload =
        type === 'complete'
          ? { status: 'completed', note: note.trim() }
          : type === 'reject'
            ? { status: 'rejected', cancellationReason: note.trim() }
            : { status: 'cancelled', cancellationReason: note.trim() };

      await adminService.updateAppointmentStatus(appointment._id, payload);
      toast.success(
        type === 'complete' ? 'Visit marked completed' : type === 'reject' ? 'Appointment declined' : 'Appointment cancelled',
        'Both parties can see the updated appointment.'
      );
      setActionModal(null);
      setNote('');
      await load();
    } catch (err) {
      setModalError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentCopy = actionModal ? ACTION_COPY[actionModal.type] : null;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Platform oversight"
        title="All appointments"
        subtitle="Monitor every booking, step in when care needs a nudge, and keep the platform’s schedule healthy."
        actions={
          <span className="header-total">
            <CalendarDays size={16} /> {appointments.length} appointments
          </span>
        }
      />

      <div className="mini-stat-row">
        <div className="mini-stat">
          <span className="mini-stat-icon teal"><CalendarDays size={17} /></span>
          <div><strong>{summary.total}</strong><span>In this view</span></div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon amber"><Clock3 size={17} /></span>
          <div><strong>{summary.pending}</strong><span>Awaiting review</span></div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon green"><CalendarCheck2 size={17} /></span>
          <div><strong>{summary.confirmed}</strong><span>Confirmed</span></div>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon blue"><UserRound size={17} /></span>
          <div><strong>{summary.today}</strong><span>Active today</span></div>
        </div>
      </div>

      <section className="card filters-card admin-filters">
        <div className="tabs" role="tablist" aria-label="Filter by status">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.key || 'all'}
              role="tab"
              aria-selected={tab === item.key}
              className={`tab ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key)}
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
              placeholder="Search patient or doctor…"
              aria-label="Search appointments"
            />
          </div>
          <label className="date-filter">
            <CalendarDays size={15} />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Filter by appointment date"
            />
          </label>
          {date && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDate('')}>
              Clear date
            </button>
          )}
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="card"><SkeletonCard height={400} /></div>
      ) : appointments.length ? (
        <section className="card table-card">
          <div className="table-wrap">
            <table className="data-table appointments-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date & time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {
                  const meta = STATUS_META[appointment.status] || STATUS_META.pending;
                  return (
                    <tr key={appointment._id}>
                      <td>
                        <div className="table-person">
                          <Avatar name={appointment.patient?.name} size="sm" />
                          <div>
                            <strong>{appointment.patient?.name || 'Patient'}</strong>
                            <span>{appointment.patient?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-doctor">
                          <span>{appointment.doctor?.name || 'Doctor'}</span>
                          <small>{appointment.doctor?.specialization || 'Specialist'}</small>
                        </div>
                      </td>
                      <td>
                        <div className="table-date">
                          <strong>{formatDate(appointment.date, 'short')}</strong>
                          <span>{formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}</span>
                        </div>
                      </td>
                      <td><span className="table-muted">{appointment.type === 'video' ? 'Video' : 'In-person'}</span></td>
                      <td><Badge tone={meta.tone} dot>{meta.label}</Badge></td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setDetailsTarget(appointment)}
                            aria-label="View appointment details"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>

                          {appointment.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-success-soft btn-xs"
                                onClick={() => approve(appointment)}
                                disabled={actionId === appointment._id}
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                              <button type="button" className="btn btn-ghost btn-xs" onClick={() => openAction('reject', appointment)}>
                                Decline
                              </button>
                            </>
                          )}

                          {appointment.status === 'approved' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-success-soft btn-xs"
                                onClick={() => openAction('complete', appointment)}
                                disabled={actionId === appointment._id}
                              >
                                <CheckCircle2 size={13} /> Complete
                              </button>
                              <button type="button" className="btn btn-ghost btn-xs" onClick={() => openAction('cancel', appointment)}>
                                Cancel
                              </button>
                            </>
                          )}

                          {(appointment.status === 'rejected' || appointment.status === 'cancelled') && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => reopen(appointment)}
                              disabled={actionId === appointment._id}
                            >
                              <RotateCcw size={13} /> Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing {appointments.length} appointment{appointments.length === 1 ? '' : 's'}</span>
            <span className="table-muted">Most recent requests appear first when filtering by status</span>
          </div>
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title="No appointments match these filters"
            description="Try clearing the search, date or status filter to see more of the schedule."
            action={
              search || date || tab ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setDate(''); setTab(''); }}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      <Modal
        open={Boolean(actionModal)}
        onClose={() => (submitting ? null : setActionModal(null))}
        title={currentCopy?.title}
        subtitle={
          actionModal
            ? `${actionModal.appointment.patient?.name} · ${formatDate(actionModal.appointment.date)} at ${formatTime(actionModal.appointment.startTime)}`
            : ''
        }
        icon={currentCopy?.icon}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setActionModal(null)} disabled={submitting}>
              Go back
            </button>
            <button type="button" className={`btn ${currentCopy?.tone}`} onClick={submitAction} disabled={submitting}>
              {submitting ? <><InlineSpinner size={15} /> Updating…</> : currentCopy?.confirm}
            </button>
          </>
        }
      >
        <p className="modal-copy">{currentCopy?.description}</p>
        <div className="field">
          <label htmlFor="admin-action-note">{currentCopy?.label}</label>
          <textarea
            id="admin-action-note"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setModalError('');
            }}
            placeholder={currentCopy?.placeholder}
          />
        </div>
        {modalError && <div className="form-alert">{modalError}</div>}
      </Modal>

      <Modal
        open={Boolean(detailsTarget)}
        onClose={() => setDetailsTarget(null)}
        title="Appointment details"
        subtitle={detailsTarget ? `Reference ${detailsTarget._id.slice(-8).toUpperCase()}` : ''}
        icon={CalendarDays}
        size="md"
      >
        {detailsTarget && (
          <div className="details-list">
            <div className="details-people">
              <div className="details-person">
                <Avatar name={detailsTarget.patient?.name} size="md" />
                <div>
                  <span>Patient</span>
                  <strong>{detailsTarget.patient?.name}</strong>
                  <small>{detailsTarget.patient?.email}</small>
                  {detailsTarget.patient?.phone && <small>{detailsTarget.patient.phone}</small>}
                </div>
              </div>
              <div className="details-person">
                <Avatar name={detailsTarget.doctor?.name} size="md" />
                <div>
                  <span>Doctor</span>
                  <strong>{detailsTarget.doctor?.name}</strong>
                  <small>{detailsTarget.doctor?.specialization}</small>
                  {detailsTarget.doctor?.hospital && <small>{detailsTarget.doctor.hospital}</small>}
                </div>
              </div>
            </div>

            <div className="details-row">
              <span>Status</span>
              <Badge tone={STATUS_META[detailsTarget.status]?.tone} dot>
                {STATUS_META[detailsTarget.status]?.label}
              </Badge>
            </div>
            <div className="details-row"><span>Date & time</span><strong>{formatDate(detailsTarget.date, 'long')} · {formatTime(detailsTarget.startTime)}–{formatTime(detailsTarget.endTime)}</strong></div>
            <div className="details-row"><span>Consultation</span><strong>{detailsTarget.type === 'video' ? <><Stethoscope size={14} /> Video</> : 'In-person visit'}</strong></div>
            <div className="details-block"><span>Reason for visit</span><p>{detailsTarget.reason}</p></div>
            {detailsTarget.symptoms && <div className="details-block"><span>Symptoms</span><p>{detailsTarget.symptoms}</p></div>}
            {detailsTarget.doctorNotes && <div className="details-block"><span>Doctor’s notes</span><p>{detailsTarget.doctorNotes}</p></div>}
            {detailsTarget.cancellationReason && (
              <div className="inline-note warning"><MessageSquareText size={15} /> {detailsTarget.cancellationReason}</div>
            )}
            {detailsTarget.statusHistory?.length > 0 && (
              <div className="details-block">
                <span>Status timeline</span>
                <div className="status-timeline">
                  {detailsTarget.statusHistory.map((entry, index) => (
                    <div className="timeline-item" key={`${entry.status}-${index}`}>
                      <span className={`timeline-dot status-${entry.status}`} />
                      <div>
                        <strong>{STATUS_META[entry.status]?.label || entry.status}</strong>
                        {entry.note && <p>{truncate(entry.note, 140)}</p>}
                        <small><Clock3 size={11} /> {formatDateTime(entry.at)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
