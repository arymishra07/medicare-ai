import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  ShieldAlert,
  Star,
  Stethoscope,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dashboardService } from '../../services/healthService';
import { appointmentService } from '../../services/appointmentService';
import { getApiError } from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { SkeletonCard } from '../../components/Loader';
import {
  formatDate,
  formatRelativeDay,
  formatTime,
  greeting,
  STATUS_META,
  todayString,
} from '../../utils/format';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          <i style={{ background: item.color }} /> {item.name}: <b>{item.value}</b>
        </span>
      ))}
    </div>
  );
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await dashboardService.doctor();
      setData(response.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const complete = async (appointment) => {
    setActionId(appointment._id);
    try {
      await appointmentService.updateStatus(appointment._id, { status: 'completed' });
      toast.success('Visit marked complete', 'The appointment history has been updated.');
      await load();
    } catch (err) {
      toast.error('Could not update appointment', getApiError(err));
    } finally {
      setActionId('');
    }
  };

  const submitReject = async () => {
    if (rejectReason.trim().length < 3) {
      setRejectError('Add a brief reason so the patient understands.');
      return;
    }
    setRejecting(true);
    setRejectError('');
    try {
      await appointmentService.updateStatus(rejectTarget._id, {
        status: 'rejected',
        cancellationReason: rejectReason.trim(),
      });
      toast.success('Request declined', 'The patient has been informed with your note.');
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setRejectError(getApiError(err));
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <div className="skeleton skeleton-banner" />
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_item, index) => <SkeletonCard key={index} height={150} />)}
        </div>
        <div className="dashboard-grid">
          <SkeletonCard height={340} />
          <SkeletonCard height={340} />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  const { stats, todaysAppointments, pendingRequestsList, weekly, recentPatients, todayAvailability } = data;

  return (
    <div className="page-stack">
      {!user?.isVerified && (
        <div className="verification-banner">
          <span className="verification-icon"><ShieldAlert size={20} /></span>
          <div>
            <strong>Your professional profile is awaiting verification</strong>
            <p>
              An administrator will review your details shortly. Until then, your profile won’t
              appear in the patient doctor directory.
            </p>
          </div>
          <Link to="/profile" className="btn btn-secondary btn-sm">Review profile</Link>
        </div>
      )}

      <section className="welcome-banner doctor-welcome">
        <div className="welcome-orb welcome-orb-one" />
        <div className="welcome-orb welcome-orb-two" />
        <div className="welcome-copy">
          <span className="welcome-date">
            <CalendarDays size={14} /> {formatDate(new Date().toISOString(), 'long')}
          </span>
          <h1>{greeting()}, {user?.name?.replace(/^Dr\.\s*/, 'Dr. ')}.</h1>
          <p>
            You have <strong>{stats.todaysAppointments}</strong> appointment{stats.todaysAppointments === 1 ? '' : 's'} today
            {stats.pendingRequests ? ` and ${stats.pendingRequests} request${stats.pendingRequests === 1 ? '' : 's'} waiting for review` : ' with no pending requests'}.
          </p>
          <div className="welcome-actions">
            <Link to="/doctor/appointments" className="btn btn-white">
              <CalendarCheck2 size={16} /> Review requests
            </Link>
            <Link to="/doctor/availability" className="btn btn-ghost-light">
              <Clock3 size={16} /> Manage availability
            </Link>
          </div>
        </div>
        <div className="welcome-side">
          <div className="clinic-day-card">
            <div className="clinic-day-head">
              <span className="clinic-day-icon"><Stethoscope size={17} /></span>
              <div>
                <strong>Today’s clinic</strong>
                <small>{formatDate(todayString(), 'short')}</small>
              </div>
            </div>
            {todayAvailability?.isAvailable ? (
              <>
                <div className="clinic-hours">{formatTime(todayAvailability.startTime)} – {formatTime(todayAvailability.endTime)}</div>
                <span className="clinic-status"><span /> Consulting today</span>
              </>
            ) : (
              <>
                <div className="clinic-hours muted">No clinic hours</div>
                <span className="clinic-status off"><span /> Not consulting today</span>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon={CalendarCheck2} label="Today’s appointments" value={stats.todaysAppointments} meta="Scheduled visits" tone="teal" />
        <StatCard icon={Clock3} label="Pending requests" value={stats.pendingRequests} meta="Awaiting your review" tone="amber" />
        <StatCard icon={UsersRound} label="Patients cared for" value={stats.totalPatients} meta="Unique patients" tone="blue" />
        <StatCard icon={Star} label="Completed visits" value={stats.completedAppointments} meta={`₹${stats.estimatedEarnings?.toLocaleString('en-IN')} estimated value`} tone="green" />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Appointments</span>
                <h2>Your week at a glance</h2>
              </div>
              <span className="card-chip">Last 7 days</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weekly} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="doctorBars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e8f0f3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7c919c', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9aacb4', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f9f8' }} />
                  <Bar dataKey="appointments" name="Appointments" fill="url(#doctorBars)" radius={[8, 8, 3, 3]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="weekly-summary">
              <span><strong>{weekly.reduce((sum, day) => sum + day.appointments, 0)}</strong> appointments this week</span>
              <span><strong>{stats.rating?.toFixed(1)}</strong> patient rating</span>
              <Link to="/doctor/appointments" className="text-link">Full schedule <ArrowRight size={14} /></Link>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Today’s schedule</span>
                <h2>Patients to see</h2>
              </div>
              <Badge tone="teal">{todaysAppointments.length} visits</Badge>
            </div>

            {todaysAppointments.length ? (
              <div className="doctor-schedule">
                {todaysAppointments.map((appointment) => {
                  const meta = STATUS_META[appointment.status] || STATUS_META.pending;
                  return (
                    <div className="schedule-row" key={appointment._id}>
                      <div className="schedule-time">{formatTime(appointment.startTime)}</div>
                      <span className="schedule-line" />
                      <Avatar name={appointment.patient?.name} size="sm" />
                      <div className="schedule-copy">
                        <strong>{appointment.patient?.name}</strong>
                        <span>{appointment.reason}</span>
                        <small>{appointment.type === 'video' ? 'Video consultation' : 'In-person'} · {appointment.patient?.phone || 'No phone on file'}</small>
                      </div>
                      <div className="schedule-actions">
                        <Badge tone={meta.tone} dot>{meta.label}</Badge>
                        {appointment.status === 'approved' && (
                          <button
                            type="button"
                            className="btn btn-success-soft btn-sm"
                            onClick={() => complete(appointment)}
                            disabled={actionId === appointment._id}
                          >
                            <CheckCircle2 size={14} /> Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="A clear day ahead"
                description="No appointments are scheduled for today. Use the time to review pending requests or update availability."
                action={<Link to="/doctor/appointments" className="btn btn-secondary btn-sm">Review requests</Link>}
                compact
              />
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Recently seen</span>
                <h2>Your patients</h2>
              </div>
              <Link to="/doctor/patients" className="text-link">View all <ArrowRight size={14} /></Link>
            </div>

            {recentPatients.length ? (
              <div className="patient-mini-list">
                {recentPatients.map((entry) => (
                  <div className="patient-mini" key={entry.patient._id}>
                    <Avatar name={entry.patient.name} size="sm" />
                    <div>
                      <strong>{entry.patient.name}</strong>
                      <span>{entry.patient.email} · {entry.visits} visit{entry.visits === 1 ? '' : 's'}</span>
                    </div>
                    <span className="patient-last">Last seen {formatDate(entry.lastDate, 'short')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={UsersRound}
                title="Your patient list will grow here"
                description="Once patients book and complete visits, you’ll see them in this list."
                compact
              />
            )}
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Action needed</span>
                <h2>Pending requests</h2>
              </div>
              {stats.pendingRequests > 0 && <Badge tone="warning">{stats.pendingRequests}</Badge>}
            </div>

            {pendingRequestsList.length ? (
              <div className="request-list">
                {pendingRequestsList.map((appointment) => (
                  <div className="request-card" key={appointment._id}>
                    <div className="request-head">
                      <Avatar name={appointment.patient?.name} size="sm" />
                      <div>
                        <strong>{appointment.patient?.name}</strong>
                        <span>{formatRelativeDay(appointment.date)} · {formatTime(appointment.startTime)}</span>
                      </div>
                    </div>
                    <p>{appointment.reason}</p>
                    {appointment.symptoms && <small>Symptoms: {appointment.symptoms}</small>}
                    <div className="request-actions">
                      <button
                        type="button"
                        className="btn btn-success-soft btn-sm"
                        onClick={() => approve(appointment)}
                        disabled={actionId === appointment._id}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setRejectTarget(appointment);
                          setRejectReason('');
                          setRejectError('');
                        }}
                      >
                        <XCircle size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="You’re all caught up"
                description="No appointment requests are waiting for a decision."
                tone="green"
                compact
              />
            )}

            <Link to="/doctor/appointments" className="sidebar-card-link">
              Open appointment workspace <ArrowRight size={14} />
            </Link>
          </section>

          <section className="card doctor-tip-card">
            <span className="doctor-tip-icon"><MessageSquareText size={20} /></span>
            <h3>Clear notes, better continuity</h3>
            <p>
              Add concise notes when completing a visit. Patients see the summary and your future
              recommendations stay in context.
            </p>
            <Link to="/doctor/appointments" className="text-link text-link-light">
              Go to appointments <ArrowRight size={14} />
            </Link>
          </section>

          <section className="card quick-actions-card">
            <h3>Quick links</h3>
            <Link to="/doctor/availability" className="quick-action">
              <span className="quick-action-icon teal"><CalendarCheck2 size={17} /></span>
              Update working hours
              <ArrowRight size={15} />
            </Link>
            <Link to="/doctor/patients" className="quick-action">
              <span className="quick-action-icon blue"><UserRound size={17} /></span>
              View patient records
              <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </div>

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => (rejecting ? null : setRejectTarget(null))}
        title="Decline this request?"
        subtitle={
          rejectTarget
            ? `${rejectTarget.patient?.name} · ${formatDate(rejectTarget.date)} at ${formatTime(rejectTarget.startTime)}`
            : ''
        }
        icon={XCircle}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Keep request
            </button>
            <button type="button" className="btn btn-danger" onClick={submitReject} disabled={rejecting}>
              {rejecting ? 'Declining…' : 'Decline request'}
            </button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="decline-reason">Reason for the patient</label>
          <textarea
            id="decline-reason"
            rows={3}
            maxLength={400}
            value={rejectReason}
            onChange={(event) => {
              setRejectReason(event.target.value);
              setRejectError('');
            }}
            placeholder="e.g. I’m unavailable at that time. Please choose another slot."
          />
          <span className="field-hint">This note is shared with the patient.</span>
        </div>
        {rejectError && <div className="form-alert">{rejectError}</div>}
      </Modal>
    </div>
  );
}
