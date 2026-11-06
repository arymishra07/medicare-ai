import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
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
  Download,
  FileHeart,
  HeartPulse,
  Lightbulb,
  Pill,
  Plus,
  SkipForward,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dashboardService } from '../../services/healthService';
import { medicineService } from '../../services/healthService';
import { recordService } from '../../services/healthService';
import { getApiError } from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Loader';
import Avatar from '../../components/Avatar';
import {
  formatDate,
  formatFileSize,
  formatRelativeDay,
  formatTime,
  greeting,
  STATUS_META,
  todayString,
} from '../../utils/format';
import { filenameFromResponse, saveBlob } from '../../utils/download';

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

export default function PatientDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logging, setLogging] = useState('');
  const [downloading, setDownloading] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const response = await dashboardService.patient();
      setData(response.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const logDose = async (dose, status) => {
    const key = `${dose.medicineId}-${dose.time}`;
    setLogging(key);
    try {
      await medicineService.logDose(dose.medicineId, {
        time: dose.time,
        status,
        date: todayString(),
      });
      toast.success(
        status === 'taken' ? 'Dose marked as taken' : 'Dose skipped',
        `${dose.name} · ${formatTime(dose.time)}`
      );
      await loadDashboard();
    } catch (err) {
      toast.error('Could not update dose', getApiError(err));
    } finally {
      setLogging('');
    }
  };

  const downloadReport = async (record) => {
    setDownloading(record._id);
    try {
      const response = await recordService.download(record._id);
      saveBlob(
        response.data,
        filenameFromResponse(response, record.file?.originalName || 'medical-report')
      );
      toast.success('Report downloaded', 'Your file was downloaded securely.');
    } catch (err) {
      toast.error('Download failed', getApiError(err));
    } finally {
      setDownloading('');
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
          <SkeletonCard height={360} />
          <SkeletonCard height={360} />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  const { stats, upcomingAppointmentsList, todaySchedule, recentReports, activity } = data;
  const pendingDoses = todaySchedule.filter((dose) => dose.status === 'pending');
  const doneDoses = todaySchedule.filter((dose) => dose.status !== 'pending').length;

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div className="welcome-orb welcome-orb-one" />
        <div className="welcome-orb welcome-orb-two" />
        <div className="welcome-copy">
          <span className="welcome-date">
            <CalendarDays size={14} /> {formatDate(new Date().toISOString(), 'long')}
          </span>
          <h1>{greeting()}, {user?.name?.split(' ')[0]}.</h1>
          <p>
            {pendingDoses.length
              ? `You have ${pendingDoses.length} medicine ${pendingDoses.length === 1 ? 'dose' : 'doses'} left today and ${stats.upcomingAppointments} upcoming ${stats.upcomingAppointments === 1 ? 'appointment' : 'appointments'}.`
              : `Everything is on track today. You have ${stats.upcomingAppointments} upcoming ${stats.upcomingAppointments === 1 ? 'appointment' : 'appointments'}.`}
          </p>
          <div className="welcome-actions">
            <Link to="/patient/doctors" className="btn btn-white">
              <Plus size={16} /> Book an appointment
            </Link>
            <Link to="/patient/chat" className="btn btn-ghost-light">
              <Sparkles size={16} /> Ask MediCare AI
            </Link>
          </div>
        </div>
        <div className="welcome-side">
          <div className="vital-score">
            <div className="vital-ring" style={{ '--adherence': `${stats.adherence?.percentage || 0}%` }}>
              <span>{stats.adherence?.percentage || 0}%</span>
              <small>Adherence</small>
            </div>
            <div>
              <strong>You’re doing well</strong>
              <p>{stats.adherence?.taken || 0} doses taken this week</p>
              <span className="vital-trend"><HeartPulse size={13} /> Keep the rhythm</span>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard
          icon={CalendarCheck2}
          label="Upcoming appointments"
          value={stats.upcomingAppointments}
          meta="Confirmed and pending visits"
          tone="teal"
        />
        <StatCard
          icon={CalendarDays}
          label="Total appointments"
          value={stats.totalAppointments}
          meta={`${stats.completedAppointments} completed visits`}
          tone="blue"
        />
        <StatCard
          icon={Pill}
          label="Active medicines"
          value={stats.activeMedicines}
          meta={`${doneDoses}/${todaySchedule.length} doses handled today`}
          tone="green"
        />
        <StatCard
          icon={FileHeart}
          label="Medical reports"
          value={stats.totalReports}
          meta="Stored securely"
          tone="violet"
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Health activity</span>
                <h2>Your week in motion</h2>
              </div>
              <span className="card-chip">Last 7 days</span>
            </div>
            <div className="chart-legend">
              <span><i className="legend-dot teal" /> Appointments</span>
              <span><i className="legend-dot blue" /> Doses taken</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={activity} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appointmentsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dosesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e8f0f3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7c919c', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9aacb4', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cce8e4', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    name="Appointments"
                    stroke="#0d9488"
                    strokeWidth={2.4}
                    fill="url(#appointmentsFill)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dosesTaken"
                    name="Doses taken"
                    stroke="#3b82f6"
                    strokeWidth={2.2}
                    fill="url(#dosesFill)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Appointments</span>
                <h2>Upcoming visits</h2>
              </div>
              <Link to="/patient/appointments" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingAppointmentsList.length ? (
              <div className="appointment-list">
                {upcomingAppointmentsList.map((appointment) => {
                  const meta = STATUS_META[appointment.status] || STATUS_META.pending;
                  const date = new Date(`${appointment.date}T00:00:00`);
                  return (
                    <div className="appointment-row" key={appointment._id}>
                      <div className="date-block">
                        <span>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <strong>{date.getDate()}</strong>
                        <small>{date.toLocaleDateString('en-US', { weekday: 'short' })}</small>
                      </div>
                      <Avatar name={appointment.doctor?.name} size="md" />
                      <div className="appointment-row-copy">
                        <strong>{appointment.doctor?.name}</strong>
                        <span>
                          {appointment.doctor?.specialization} · {formatTime(appointment.startTime)}
                        </span>
                        <small>{appointment.reason}</small>
                      </div>
                      <Badge tone={meta.tone} dot>{meta.label}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming appointments"
                description="When you’re ready, find a specialist and book a time that suits you."
                action={
                  <Link to="/patient/doctors" className="btn btn-primary btn-sm">
                    <Stethoscope size={15} /> Find a doctor
                  </Link>
                }
                compact
              />
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Secure records</span>
                <h2>Recent medical reports</h2>
              </div>
              <Link to="/patient/reports" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {recentReports.length ? (
              <div className="report-list">
                {recentReports.map((record) => (
                  <div className="report-row" key={record._id}>
                    <span className={`file-icon file-${record.file?.mimeType === 'application/pdf' ? 'pdf' : 'image'}`}>
                      <FileHeart size={19} />
                    </span>
                    <div className="report-row-copy">
                      <strong>{record.title}</strong>
                      <span>{record.type} · {formatDate(record.recordDate)} · {formatFileSize(record.file?.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => downloadReport(record)}
                      disabled={downloading === record._id}
                      aria-label={`Download ${record.title}`}
                    >
                      <Download size={17} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileHeart}
                title="No reports uploaded yet"
                description="Keep lab results, prescriptions and scans organised in one private place."
                action={<Link to="/patient/reports" className="btn btn-secondary btn-sm">Upload a report</Link>}
                compact
              />
            )}
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Today</span>
                <h2>Medicine schedule</h2>
              </div>
              <Link to="/patient/medicines" className="text-link">Manage</Link>
            </div>

            {todaySchedule.length ? (
              <div className="dose-list">
                {todaySchedule.map((dose) => (
                  <div className={`dose-row ${dose.status}`} key={`${dose.medicineId}-${dose.time}`}>
                    <div className="dose-time">
                      <Clock3 size={13} />
                      {formatTime(dose.time)}
                    </div>
                    <div className="dose-copy">
                      <strong>{dose.name}</strong>
                      <span>{dose.dosage}{dose.instructions ? ` · ${dose.instructions}` : ''}</span>
                    </div>
                    {dose.status === 'pending' ? (
                      <div className="dose-actions">
                        <button
                          type="button"
                          className="dose-btn taken"
                          onClick={() => logDose(dose, 'taken')}
                          disabled={logging === `${dose.medicineId}-${dose.time}`}
                          title="Mark as taken"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="dose-btn skipped"
                          onClick={() => logDose(dose, 'skipped')}
                          disabled={logging === `${dose.medicineId}-${dose.time}`}
                          title="Mark as skipped"
                        >
                          <SkipForward size={15} />
                        </button>
                      </div>
                    ) : (
                      <Badge tone={dose.status === 'taken' ? 'success' : 'neutral'}>
                        {dose.status === 'taken' ? 'Taken' : 'Skipped'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Pill}
                title="No doses scheduled"
                description="Add a medicine reminder to build your daily routine."
                action={<Link to="/patient/medicines" className="btn btn-secondary btn-sm">Add medicine</Link>}
                compact
              />
            )}
          </section>

          <section className="card health-tip-card">
            <div className="health-tip-icon"><Lightbulb size={21} /></div>
            <span className="card-kicker">A gentle nudge</span>
            <h3>Small habits, real impact.</h3>
            <p>{data.healthTip}</p>
            <button
              type="button"
              className="text-link text-link-light"
              onClick={() => navigate('/patient/chat')}
            >
              Ask about healthy routines <ArrowRight size={14} />
            </button>
          </section>

          <section className="card quick-actions-card">
            <h3>Quick actions</h3>
            <Link to="/patient/doctors" className="quick-action">
              <span className="quick-action-icon teal"><Stethoscope size={17} /></span>
              Book a specialist
              <ArrowRight size={15} />
            </Link>
            <Link to="/patient/reports" className="quick-action">
              <span className="quick-action-icon blue"><FileHeart size={17} /></span>
              Upload a report
              <ArrowRight size={15} />
            </Link>
            <Link to="/patient/medicines" className="quick-action">
              <span className="quick-action-icon green"><Pill size={17} /></span>
              Add a reminder
              <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
