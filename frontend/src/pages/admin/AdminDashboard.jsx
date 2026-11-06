import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
  IndianRupee,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { dashboardService } from '../../services/healthService';
import { getApiError } from '../../services/api';
import StatCard from '../../components/StatCard';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Loader';
import {
  formatCurrency,
  formatDate,
  formatTime,
  ROLE_LABELS,
  STATUS_META,
  timeAgo,
  truncate,
} from '../../utils/format';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map((item) => (
        <span key={item.dataKey || item.name}>
          <i style={{ background: item.color || item.payload?.fill }} /> {item.name}: <b>{item.value}</b>
        </span>
      ))}
    </div>
  );
};

const prettyAction = (action = '') =>
  action
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await dashboardService.admin();
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

  if (loading) {
    return (
      <div className="page-stack">
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

  if (error) return <ErrorState message={error} onRetry={load} />;

  const { stats, trend, statusData, specialtyData, recentAppointments, recentUsers, recentAuditLogs } = data;
  const totalStatuses = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="page-stack">
      <section className="welcome-banner admin-welcome">
        <div className="welcome-orb welcome-orb-one" />
        <div className="welcome-orb welcome-orb-two" />
        <div className="welcome-copy">
          <span className="welcome-date"><ShieldCheck size={14} /> Administrator workspace</span>
          <h1>Platform overview</h1>
          <p>
            {stats.pendingAppointments} appointment{stats.pendingAppointments === 1 ? '' : 's'} await review and{' '}
            {stats.pendingDoctors} doctor{stats.pendingDoctors === 1 ? '' : 's'} need verification. Keep care moving smoothly.
          </p>
          <div className="welcome-actions">
            <Link to="/admin/appointments" className="btn btn-white">
              <CalendarCheck2 size={16} /> Review appointments
            </Link>
            <Link to="/admin/doctors" className="btn btn-ghost-light">
              <Stethoscope size={16} /> Verify doctors
            </Link>
          </div>
        </div>
        <div className="welcome-side admin-welcome-side">
          <div className="admin-health-card">
            <span className="admin-health-icon"><TrendingUp size={20} /></span>
            <div>
              <small>Appointment growth</small>
              <strong>{stats.appointmentGrowth >= 0 ? '+' : ''}{stats.appointmentGrowth}%</strong>
              <span>month over month</span>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon={UsersRound} label="Total patients" value={stats.totalPatients} meta="Registered patients" tone="teal" />
        <StatCard icon={Stethoscope} label="Total doctors" value={stats.totalDoctors} meta={`${stats.pendingDoctors} awaiting verification`} tone="blue" />
        <StatCard icon={CalendarDays} label="Total appointments" value={stats.totalAppointments} meta={`${stats.todaysAppointments} scheduled today`} tone="violet" />
        <StatCard icon={Clock3} label="Pending requests" value={stats.pendingAppointments} meta="Across all doctors" tone="amber" />
      </div>

      <div className="admin-metric-strip">
        <div><span><CheckCircle2 size={16} /></span><div><strong>{formatCurrency(stats.totalRevenue)}</strong><small>Estimated completed-visit value</small></div></div>
        <div><span><IndianRupee size={16} /></span><div><strong>{stats.todaysAppointments}</strong><small>Appointments today</small></div></div>
        <div><span><ShieldAlert size={16} /></span><div><strong>{stats.pendingDoctors}</strong><small>Doctors pending verification</small></div></div>
        <Link to="/admin/users" className="admin-metric-link">Manage platform users <ArrowRight size={15} /></Link>
      </div>

      {stats.pendingDoctors > 0 && (
        <Link to="/admin/doctors" className="verification-banner clickable">
          <span className="verification-icon"><ShieldAlert size={20} /></span>
          <div>
            <strong>{stats.pendingDoctors} doctor{stats.pendingDoctors === 1 ? '' : 's'} waiting for verification</strong>
            <p>Review credentials and approve professionals so patients can find them.</p>
          </div>
          <span className="btn btn-secondary btn-sm">Review now <ArrowRight size={14} /></span>
        </Link>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Platform growth</span>
                <h2>New patients & doctors</h2>
              </div>
              <span className="card-chip">Last 6 months</span>
            </div>
            <div className="chart-legend">
              <span><i className="legend-dot teal" /> Patients</span>
              <span><i className="legend-dot blue" /> Doctors</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="patientsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="doctorsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e8f0f3" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#7c919c', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9aacb4', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="patients" name="Patients" stroke="#0d9488" strokeWidth={2.4} fill="url(#patientsFill)" dot={false} />
                  <Area type="monotone" dataKey="doctors" name="Doctors" stroke="#3b82f6" strokeWidth={2.2} fill="url(#doctorsFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="weekly-summary">
              <span><strong>{trend[trend.length - 1]?.appointments || 0}</strong> appointments this month</span>
              <span><strong>{stats.appointmentGrowth >= 0 ? '+' : ''}{stats.appointmentGrowth}%</strong> vs. last month</span>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Latest activity</span>
                <h2>Recent appointments</h2>
              </div>
              <Link to="/admin/appointments" className="text-link">View all <ArrowRight size={14} /></Link>
            </div>
            {recentAppointments.length ? (
              <div className="table-wrap">
                <table className="data-table compact-table">
                  <thead>
                    <tr><th>Patient</th><th>Doctor</th><th>Scheduled</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((appointment) => (
                      <tr key={appointment._id}>
                        <td><strong>{appointment.patient?.name || 'Patient'}</strong></td>
                        <td>
                          <div className="table-doctor">
                            <span>{appointment.doctor?.name || 'Doctor'}</span>
                            <small>{appointment.doctor?.specialization}</small>
                          </div>
                        </td>
                        <td><span className="table-muted">{formatDate(appointment.date, 'short')} · {formatTime(appointment.startTime)}</span></td>
                        <td><Badge tone={STATUS_META[appointment.status]?.tone} dot>{STATUS_META[appointment.status]?.label}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={CalendarDays} title="No appointments yet" description="New bookings will appear here." compact />
            )}
          </section>

          <section className="card chart-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Care coverage</span>
                <h2>Doctors by specialty</h2>
              </div>
              <Badge tone="teal">{specialtyData.length} specialties</Badge>
            </div>
            {specialtyData.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={specialtyData} layout="vertical" margin={{ top: 4, right: 24, left: 24, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#e8f0f3" />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9aacb4', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fill: '#5d7480', fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f2faf9' }} />
                    <Bar dataKey="value" name="Doctors" fill="#14b8a6" radius={[0, 8, 8, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={Stethoscope} title="No verified doctors yet" compact />
            )}
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="card donut-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Appointments</span>
                <h2>Status mix</h2>
              </div>
            </div>
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={statusData.filter((item) => item.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {statusData.filter((item) => item.value > 0).map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{totalStatuses}</strong>
                <span>total</span>
              </div>
            </div>
            <div className="donut-legend">
              {statusData.map((item) => (
                <div key={item.name}>
                  <span><i style={{ background: item.color }} /> {STATUS_META[item.name]?.label || item.name}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Newest members</span>
                <h2>Recent users</h2>
              </div>
              <Link to="/admin/users" className="text-link">Manage</Link>
            </div>
            {recentUsers.length ? (
              <div className="recent-user-list">
                {recentUsers.map((user) => (
                  <div className="recent-user" key={user._id}>
                    <Avatar name={user.name} size="sm" />
                    <div className="recent-user-copy">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Badge tone={user.role === 'doctor' ? 'blue' : user.role === 'admin' ? 'violet' : 'teal'}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={UserRound} title="No users yet" compact />
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Security trail</span>
                <h2>Recent activity</h2>
              </div>
              <ShieldCheck size={17} className="muted-icon" />
            </div>
            {recentAuditLogs.length ? (
              <div className="audit-list">
                {recentAuditLogs.map((log) => (
                  <div className="audit-item" key={log._id}>
                    <span className="audit-dot" />
                    <div>
                      <strong>{prettyAction(log.action)}</strong>
                      <span>{log.actorName || 'System'} · {timeAgo(log.createdAt)}</span>
                      {log.description && <small>{truncate(log.description, 60)}</small>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">Activity will appear here as the platform is used.</p>
            )}
          </section>

          <section className="card quick-actions-card">
            <h3>Admin shortcuts</h3>
            <Link to="/admin/users" className="quick-action">
              <span className="quick-action-icon teal"><UserCog size={17} /></span>
              Manage users
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/doctors" className="quick-action">
              <span className="quick-action-icon blue"><Stethoscope size={17} /></span>
              Verify doctors
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/appointments" className="quick-action">
              <span className="quick-action-icon green"><CalendarCheck2 size={17} /></span>
              Appointment oversight
              <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
