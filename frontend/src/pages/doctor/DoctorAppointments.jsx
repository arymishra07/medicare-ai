import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  Phone,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';
import { appointmentService } from '../../services/appointmentService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { SkeletonCard } from '../../components/Loader';
import {
  formatDate,
  formatDateTime,
  formatTime,
  STATUS_META,
  todayString,
  truncate,
} from '../../utils/format';

const TABS = [
  { key: 'pending', label: 'Requests' },
  { key: 'approved', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

export default function DoctorAppointments() {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState('');
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [note, setNote] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setError('');
    try {
      const { data } = await appointmentService.list({ limit: 300 });
      setAppointments(data.data.appointments);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const pending = appointments.filter((item) => item.status === 'pending');
    const approved = appointments.filter((item) => item.status === 'approved');
    const completed = appointments.filter((item) => item.status === 'completed');
    const cancelled = appointments.filter((item) => ['cancelled', 'rejected'].includes(item.status));
    return { pending, approved, completed, cancelled, all: appointments };
  }, [appointments]);

  const visible = useMemo(() => {
    const list = grouped[tab] || [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((appointment) =>
      [appointment.patient?.name, appointment.patient?.email, appointment.reason]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [grouped, tab, search]);

  const approve = async (appointment) => {
    setActionId(appointment._id);
    try {
      await appointmentService.updateStatus(appointment._id, { status: 'approved' });
      toast.success('Appointment confirmed', `${appointment.patient?.name} has been notified.`);
      await load();
    } catch (err) {
      toast.error('Could not confirm appointment', getApiError(err));
    } finally {
      setActionId('');
    }
  };

  const openAction = (type, appointment) => {
    setActionModal({ type, appointment });
    setNote(type === 'complete' ? appointment.doctorNotes || '' : '');
    setModalError('');
  };

  const submitAction = async () => {
    if (!actionModal) return;
    const { type, appointment } = actionModal;

    if ((type === 'reject' || type === 'cancel') && note.trim().length < 3) {
      setModalError('Please add a short reason for the patient.');
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

      await appointmentService.updateStatus(appointment._id, payload);
      toast.success(
        type === 'complete' ? 'Visit completed' : type === 'reject' ? 'Request declined' : 'Appointment cancelled',
        'The appointment record has been updated.'
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

  const modalCopy = {
    reject: {
      title: 'Decline this request?',
      description: 'Share a brief reason. The patient will see your note.',
      label: 'Reason for declining',
      placeholder: 'e.g. I’m unavailable at this time. Please book another slot.',
      confirm: 'Decline request',
      tone: 'btn-danger',
    },
    complete: {
      title: 'Complete this visit?',
      description: 'Add a concise summary for the patient’s record (optional).',
      label: 'Consultation notes',
      placeholder: 'e.g. Reviewed symptoms. Advised follow-up in 2 weeks.',
      confirm: 'Mark completed',
      tone: 'btn-primary',
    },
    cancel: {
      title: 'Cancel this appointment?',
      description: 'The slot will be released and the patient notified.',
      label: 'Reason for cancellation',
      placeholder: 'e.g. An emergency requires me to reschedule the clinic.',
      confirm: 'Cancel appointment',
      tone: 'btn-danger',
    },
  };

  const currentCopy = actionModal ? modalCopy[actionModal.type] : null;
  const todayCount = appointments.filter(
    (item) => item.date === todayString() && ['pending', 'approved'].includes(item.status)
  ).length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Clinical schedule"
        title="Appointments"
        subtitle="Review requests, confirm visits and keep every patient’s care journey clear."
        actions={
          <Link to="/doctor/availability" className="btn btn-secondary">
            <Clock3 size={16} /> Manage availability
          </Link>
        }
      />

      <div className="mini-stat-row">
        <div className="mini-stat"><span className="mini-stat-icon amber"><Clock3 size={17} /></span><div><strong>{grouped.pending.length}</strong><span>Awaiting review</span></div></div>
        <div className="mini-stat"><span className="mini-stat-icon teal"><CalendarDays size={17} /></span><div><strong>{todayCount}</strong><span>Scheduled today</span></div></div>
        <div className="mini-stat"><span className="mini-stat-icon blue"><UserRound size={17} /></span><div><strong>{new Set(appointments.map((item) => item.patient?._id)).size}</strong><span>Patients in schedule</span></div></div>
        <div className="mini-stat"><span className="mini-stat-icon green"><CheckCircle2 size={17} /></span><div><strong>{grouped.completed.length}</strong><span>Completed visits</span></div></div>
      </div>

      <div className="tabs-row">
        <div className="tabs" role="tablist" aria-label="Appointment status">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.key}
              role="tab"
              aria-selected={tab === item.key}
              className={`tab ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              <span>{grouped[item.key]?.length || 0}</span>
            </button>
          ))}
        </div>
        <div className="table-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient or reason…"
            aria-label="Search appointments"
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="card"><SkeletonCard height={320} /></div>
      ) : visible.length ? (
        <section className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date & time</th>
                  <th>Reason</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((appointment) => {
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
                        <div className="table-date">
                          <strong>{formatDate(appointment.date, 'short')}</strong>
                          <span>{formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-reason">{truncate(appointment.reason, 54)}</span>
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
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => openAction('reject', appointment)}
                              >
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
                              >
                                <CheckCircle2 size={13} /> Complete
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => openAction('cancel', appointment)}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={tab === 'pending' ? CheckCircle2 : CalendarDays}
            title={
              tab === 'pending'
                ? 'No requests waiting'
                : search
                  ? 'No appointments match your search'
                  : 'Nothing in this list yet'
            }
            description={
              tab === 'pending'
                ? 'New patient requests will appear here for your review.'
                : search
                  ? 'Try a different patient name or reason.'
                  : 'Appointments will appear here as patients book with you.'
            }
            tone={tab === 'pending' ? 'green' : 'teal'}
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
        icon={actionModal?.type === 'complete' ? CheckCircle2 : XCircle}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setActionModal(null)} disabled={submitting}>
              Go back
            </button>
            <button type="button" className={`btn ${currentCopy?.tone}`} onClick={submitAction} disabled={submitting}>
              {submitting ? 'Updating…' : currentCopy?.confirm}
            </button>
          </>
        }
      >
        <p className="modal-copy">{currentCopy?.description}</p>
        <div className="field">
          <label htmlFor="action-note">{currentCopy?.label}</label>
          <textarea
            id="action-note"
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
            <div className="detail-patient">
              <Avatar name={detailsTarget.patient?.name} size="md" />
              <div>
                <strong>{detailsTarget.patient?.name}</strong>
                <span>{detailsTarget.patient?.email}</span>
                {detailsTarget.patient?.phone && <span><Phone size={12} /> {detailsTarget.patient.phone}</span>}
              </div>
              <Badge tone={STATUS_META[detailsTarget.status]?.tone}>{STATUS_META[detailsTarget.status]?.label}</Badge>
            </div>
            <div className="details-row"><span>Date & time</span><strong>{formatDate(detailsTarget.date, 'long')} · {formatTime(detailsTarget.startTime)}</strong></div>
            <div className="details-row"><span>Consultation</span><strong>{detailsTarget.type === 'video' ? 'Video' : 'In-person'}</strong></div>
            <div className="details-row"><span>Patient phone</span><strong>{detailsTarget.patient?.phone || 'Not provided'}</strong></div>
            <div className="details-block"><span>Reason for visit</span><p>{detailsTarget.reason}</p></div>
            {detailsTarget.symptoms && <div className="details-block"><span>Symptoms</span><p>{detailsTarget.symptoms}</p></div>}
            {detailsTarget.doctorNotes && (
              <div className="details-block">
                <span>Your notes</span>
                <p>{detailsTarget.doctorNotes}</p>
              </div>
            )}
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
                        {entry.note && <p>{entry.note}</p>}
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
