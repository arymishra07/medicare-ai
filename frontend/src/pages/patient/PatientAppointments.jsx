import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  Plus,
  RotateCcw,
  Stethoscope,
  Video,
  XCircle,
} from 'lucide-react';
import { appointmentService } from '../../services/appointmentService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import BookingModal from '../../components/BookingModal';
import { SkeletonCard } from '../../components/Loader';
import {
  formatDate,
  formatDateTime,
  formatRelativeDay,
  formatTime,
  STATUS_META,
  todayString,
} from '../../utils/format';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled & declined' },
  { key: 'all', label: 'All appointments' },
];

export default function PatientAppointments() {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);

  const load = async () => {
    setError('');
    try {
      const { data } = await appointmentService.list({ limit: 200 });
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

  const today = todayString();
  const grouped = useMemo(() => {
    const upcoming = appointments.filter(
      (item) => ['pending', 'approved'].includes(item.status) && item.date >= today
    );
    const completed = appointments.filter((item) => item.status === 'completed');
    const cancelled = appointments.filter((item) => ['cancelled', 'rejected'].includes(item.status));
    return {
      upcoming,
      completed,
      cancelled,
      all: appointments,
    };
  }, [appointments, today]);

  const visible = grouped[tab] || [];

  const openCancel = (appointment) => {
    setCancelTarget(appointment);
    setCancelReason('');
    setCancelError('');
  };

  const submitCancel = async () => {
    if (cancelReason.trim().length < 3) {
      setCancelError('Please share a short reason so the doctor knows why.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await appointmentService.updateStatus(cancelTarget._id, {
        status: 'cancelled',
        cancellationReason: cancelReason.trim(),
      });
      toast.success('Appointment cancelled', 'The doctor has been notified.');
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } catch (err) {
      setCancelError(getApiError(err));
    } finally {
      setCancelling(false);
    }
  };

  const canManage = (appointment) =>
    ['pending', 'approved'].includes(appointment.status) && appointment.date >= today;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Your care schedule"
        title="My appointments"
        subtitle="Track confirmations, reschedule when life changes, and keep your care history in one place."
        actions={
          <Link to="/patient/doctors" className="btn btn-primary">
            <Plus size={16} /> Book appointment
          </Link>
        }
      />

      <div className="tabs-row">
        <div className="tabs" role="tablist" aria-label="Appointment filters">
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
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="appointment-cards">
          {Array.from({ length: 3 }).map((_item, index) => <SkeletonCard key={index} height={220} />)}
        </div>
      ) : visible.length ? (
        <div className="appointment-cards">
          {visible.map((appointment) => {
            const meta = STATUS_META[appointment.status] || STATUS_META.pending;
            const date = new Date(`${appointment.date}T00:00:00`);
            return (
              <article className={`appt-card appt-${appointment.status}`} key={appointment._id}>
                <div className="appt-date-column">
                  <span>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <strong>{date.getDate()}</strong>
                  <small>{date.toLocaleDateString('en-US', { weekday: 'short' })}</small>
                  <div className="appt-time">{formatTime(appointment.startTime)}</div>
                </div>

                <div className="appt-body">
                  <div className="appt-head">
                    <div className="appt-doctor">
                      <span className="appt-doctor-icon"><Stethoscope size={19} /></span>
                      <div>
                        <h3>{appointment.doctor?.name || 'Doctor unavailable'}</h3>
                        <p>
                          {appointment.doctor?.specialization || 'Specialist'}
                          {appointment.doctor?.hospital ? ` · ${appointment.doctor.hospital}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge tone={meta.tone} dot>{meta.label}</Badge>
                  </div>

                  <div className="appt-meta">
                    <span><CalendarClock size={14} /> {formatRelativeDay(appointment.date)} · {formatTime(appointment.startTime)}–{formatTime(appointment.endTime)}</span>
                    <span>{appointment.type === 'video' ? <Video size={14} /> : <MapPin size={14} />} {appointment.type === 'video' ? 'Video consultation' : 'In-person visit'}</span>
                    {appointment.doctor?.location && <span><MapPin size={14} /> {appointment.doctor.location}</span>}
                  </div>

                  <div className="appt-reason">
                    <strong>Reason</strong>
                    <p>{appointment.reason}</p>
                    {appointment.symptoms && <small>Symptoms: {appointment.symptoms}</small>}
                  </div>

                  {appointment.status === 'cancelled' && appointment.cancellationReason && (
                    <div className="inline-note warning">
                      <XCircle size={15} /> Cancellation reason: {appointment.cancellationReason}
                    </div>
                  )}
                  {appointment.status === 'rejected' && appointment.cancellationReason && (
                    <div className="inline-note danger">
                      <XCircle size={15} /> Doctor’s note: {appointment.cancellationReason}
                    </div>
                  )}
                  {appointment.doctorNotes && (
                    <div className="inline-note info">
                      <MessageSquareText size={15} /> Doctor’s note: {appointment.doctorNotes}
                    </div>
                  )}

                  <div className="appt-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailsTarget(appointment)}>
                      <FileText size={15} /> View details
                    </button>
                    {canManage(appointment) && (
                      <>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRescheduleTarget(appointment)}>
                          <RotateCcw size={15} /> Reschedule
                        </button>
                        <button type="button" className="btn btn-danger-soft btn-sm" onClick={() => openCancel(appointment)}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title={
              tab === 'upcoming'
                ? 'No upcoming appointments'
                : tab === 'completed'
                  ? 'No completed visits yet'
                  : tab === 'cancelled'
                    ? 'Nothing cancelled'
                    : 'No appointments yet'
            }
            description={
              tab === 'upcoming'
                ? 'Find a specialist and choose a time that works for you.'
                : 'Your appointment history will appear here as your care journey continues.'
            }
            action={<Link to="/patient/doctors" className="btn btn-primary btn-sm"><Stethoscope size={15} /> Browse doctors</Link>}
          />
        </div>
      )}

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => (cancelling ? null : setCancelTarget(null))}
        title="Cancel this appointment?"
        subtitle={
          cancelTarget
            ? `${cancelTarget.doctor?.name} · ${formatDate(cancelTarget.date)} at ${formatTime(cancelTarget.startTime)}`
            : ''
        }
        icon={XCircle}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Keep appointment
            </button>
            <button type="button" className="btn btn-danger" onClick={submitCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel appointment'}
            </button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="cancel-reason">Reason for cancellation</label>
          <textarea
            id="cancel-reason"
            rows={3}
            maxLength={400}
            placeholder="Let the doctor know why you need to cancel…"
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
              setCancelError('');
            }}
          />
          <span className="field-hint">This helps the clinic offer the slot to another patient.</span>
        </div>
        {cancelError && <div className="form-alert">{cancelError}</div>}
      </Modal>

      <BookingModal
        open={Boolean(rescheduleTarget)}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={load}
      />

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
            <div className="details-row">
              <span>Doctor</span>
              <strong>{detailsTarget.doctor?.name}</strong>
            </div>
            <div className="details-row">
              <span>Specialty</span>
              <strong>{detailsTarget.doctor?.specialization}</strong>
            </div>
            <div className="details-row">
              <span>Date & time</span>
              <strong>{formatDate(detailsTarget.date, 'long')} · {formatTime(detailsTarget.startTime)}–{formatTime(detailsTarget.endTime)}</strong>
            </div>
            <div className="details-row">
              <span>Consultation</span>
              <strong>{detailsTarget.type === 'video' ? 'Video consultation' : 'In-person visit'}</strong>
            </div>
            <div className="details-row">
              <span>Status</span>
              <Badge tone={STATUS_META[detailsTarget.status]?.tone}>{STATUS_META[detailsTarget.status]?.label}</Badge>
            </div>
            <div className="details-block">
              <span>Reason for visit</span>
              <p>{detailsTarget.reason}</p>
            </div>
            {detailsTarget.symptoms && (
              <div className="details-block">
                <span>Symptoms</span>
                <p>{detailsTarget.symptoms}</p>
              </div>
            )}
            {detailsTarget.doctorNotes && (
              <div className="details-block">
                <span>Doctor’s notes</span>
                <p>{detailsTarget.doctorNotes}</p>
              </div>
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
            {detailsTarget.status === 'approved' && (
              <div className="inline-note success">
                <CheckCircle2 size={15} /> Your appointment is confirmed. Please arrive 10 minutes early.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
