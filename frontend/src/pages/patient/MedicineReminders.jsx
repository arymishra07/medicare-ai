import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  BellOff,
  Bell,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Edit3,
  Info,
  Pill,
  Plus,
  Send,
  SkipForward,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { medicineService } from '../../services/healthService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useMedicineNotifications } from '../../hooks/useMedicineNotifications';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { SkeletonCard, InlineSpinner } from '../../components/Loader';
import {
  addDays,
  formatDate,
  formatTime,
  MEDICINE_COLORS,
  todayString,
} from '../../utils/format';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Weekly', 'As needed'];

const defaultForm = () => ({
  name: '',
  dosage: '',
  frequency: 'Once daily',
  times: ['08:00'],
  startDate: todayString(),
  endDate: addDays(todayString(), 30),
  instructions: '',
  color: 'teal',
  notificationsEnabled: true,
});

const nextTimeSuggestion = (times) => {
  const options = ['08:00', '12:00', '14:00', '18:00', '20:00', '22:00', '06:00', '10:00'];
  return options.find((time) => !times.includes(time)) || '09:00';
};

export default function MedicineReminders() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [logging, setLogging] = useState('');
  const [toggling, setToggling] = useState('');

  const schedule = data?.todaySchedule || [];
  const { permission, supported, requestPermission, sendTest } = useMedicineNotifications(
    schedule,
    todayString()
  );

  const load = async () => {
    setError('');
    try {
      const { data: response } = await medicineService.list();
      setData(response.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const taken = schedule.filter((dose) => dose.status === 'taken').length;
    const skipped = schedule.filter((dose) => dose.status === 'skipped').length;
    return {
      active: data?.medicines?.filter((medicine) => medicine.isActive).length || 0,
      total: schedule.length,
      taken,
      skipped,
      pending: schedule.filter((dose) => dose.status === 'pending').length,
      adherence: data?.adherence?.percentage ?? 100,
    };
  }, [data, schedule]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (medicine) => {
    setEditing(medicine);
    setForm({
      name: medicine.name,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      times: [...medicine.times],
      startDate: medicine.startDate,
      endDate: medicine.endDate,
      instructions: medicine.instructions || '',
      color: medicine.color || 'teal',
      notificationsEnabled: medicine.notificationsEnabled !== false,
    });
    setFormError('');
    setModalOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  };

  const updateTime = (index, value) => {
    setForm((current) => ({
      ...current,
      times: current.times.map((time, timeIndex) => (timeIndex === index ? value : time)),
    }));
  };

  const addTime = () => {
    if (form.times.length >= 6) return;
    setForm((current) => ({
      ...current,
      times: [...current.times, nextTimeSuggestion(current.times)],
    }));
  };

  const removeTime = (index) => {
    if (form.times.length === 1) return;
    setForm((current) => ({
      ...current,
      times: current.times.filter((_time, timeIndex) => timeIndex !== index),
    }));
  };

  const saveMedicine = async () => {
    setFormError('');
    if (!form.name.trim() || !form.dosage.trim()) {
      setFormError('Please add the medicine name and dosage.');
      return;
    }
    if (!form.times.length || form.times.some((time) => !time)) {
      setFormError('Add at least one valid reminder time.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError('Please choose start and end dates.');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('The end date must be on or after the start date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions.trim(),
        times: [...new Set(form.times)].sort(),
      };
      if (editing) {
        await medicineService.update(editing._id, payload);
        toast.success('Reminder updated', `${payload.name} has been updated.`);
      } else {
        await medicineService.create(payload);
        toast.success('Medicine reminder added', `${payload.name} is now part of your routine.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteMedicine = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await medicineService.remove(deleteTarget._id);
      toast.success('Reminder deleted', `${deleteTarget.name} was removed from your routine.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error('Could not delete reminder', getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const logDose = async (dose, status) => {
    const key = `${dose.medicineId}-${dose.time}`;
    setLogging(key);
    try {
      await medicineService.logDose(dose.medicineId, {
        date: todayString(),
        time: dose.time,
        status,
      });
      toast.success(
        status === 'taken' ? 'Dose recorded' : 'Dose skipped',
        `${dose.name} · ${formatTime(dose.time)}`
      );
      await load();
    } catch (err) {
      toast.error('Could not record dose', getApiError(err));
    } finally {
      setLogging('');
    }
  };

  const toggleActive = async (medicine) => {
    setToggling(medicine._id);
    try {
      await medicineService.update(medicine._id, { isActive: !medicine.isActive });
      toast.success(
        medicine.isActive ? 'Reminder paused' : 'Reminder resumed',
        medicine.name
      );
      await load();
    } catch (err) {
      toast.error('Could not update reminder', getApiError(err));
    } finally {
      setToggling('');
    }
  };

  const enableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast.success('Notifications enabled', 'We’ll alert you when a dose is due.');
    } else if (result === 'denied') {
      toast.warning('Notifications blocked', 'You can allow them from your browser site settings.');
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_item, index) => <SkeletonCard key={index} height={140} />)}
        </div>
        <SkeletonCard height={380} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Daily routine"
        title="Medicine reminders"
        subtitle="Build a schedule you can actually follow. Track every dose and let your browser nudge you on time."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add medicine
          </button>
        }
      />

      <section className={`notification-banner notification-${permission}`}>
        <span className="notification-banner-icon">
          {permission === 'granted' ? <BellRing size={21} /> : permission === 'denied' || !supported ? <BellOff size={21} /> : <Bell size={21} />}
        </span>
        <div className="notification-banner-copy">
          <strong>
            {!supported
              ? 'Browser notifications aren’t supported here'
              : permission === 'granted'
                ? 'Browser reminders are on'
                : permission === 'denied'
                  ? 'Browser reminders are blocked'
                  : 'Never miss a dose'}
          </strong>
          <p>
            {!supported
              ? 'Your medicine schedule still works — just check this page or your dashboard.'
              : permission === 'granted'
                ? 'Keep this tab open and we’ll send a notification when a scheduled dose is due.'
                : permission === 'denied'
                  ? 'Allow notifications in your browser’s site settings, then refresh this page.'
                  : 'Enable gentle browser notifications for scheduled doses while MediCare AI is open.'}
          </p>
        </div>
        {supported && permission === 'default' && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={enableNotifications}>
            <BellRing size={15} /> Enable reminders
          </button>
        )}
        {permission === 'granted' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const sent = sendTest();
              if (sent) toast.info('Test reminder sent', 'Check your browser notifications.');
            }}
          >
            <Send size={15} /> Send test
          </button>
        )}
      </section>

      <div className="stats-grid">
        <StatCard icon={Pill} label="Active medicines" value={stats.active} meta={`${data.medicines.length} total reminders`} tone="teal" />
        <StatCard icon={CalendarRange} label="Doses today" value={stats.total} meta={`${stats.pending} still pending`} tone="blue" />
        <StatCard icon={CheckCircle2} label="Taken today" value={stats.taken} meta={`${stats.skipped} skipped`} tone="green" />
        <StatCard icon={TrendingUp} label="7-day adherence" value={`${stats.adherence}%`} meta="Taken vs. skipped doses" tone="violet" />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Today · {formatDate(todayString())}</span>
              <h2>Your dose timeline</h2>
            </div>
            <Badge tone={stats.pending ? 'warning' : 'success'} dot>
              {stats.pending ? `${stats.pending} pending` : 'All handled'}
            </Badge>
          </div>

          {schedule.length ? (
            <div className="dose-timeline">
              {schedule.map((dose) => (
                <div className={`timeline-dose ${dose.status}`} key={`${dose.medicineId}-${dose.time}`}>
                  <div className="timeline-dose-time">
                    <Clock3 size={14} />
                    <strong>{formatTime(dose.time)}</strong>
                    {dose.isOverdue && dose.status === 'pending' && <span className="overdue-label">Overdue</span>}
                  </div>
                  <div className={`timeline-dose-dot med-${dose.color}`} />
                  <div className="timeline-dose-card">
                    <div className="timeline-dose-copy">
                      <strong>{dose.name}</strong>
                      <span>{dose.dosage}{dose.instructions ? ` · ${dose.instructions}` : ''}</span>
                    </div>
                    {dose.status === 'pending' ? (
                      <div className="dose-actions">
                        <button
                          type="button"
                          className="btn btn-success-soft btn-sm"
                          onClick={() => logDose(dose, 'taken')}
                          disabled={logging === `${dose.medicineId}-${dose.time}`}
                        >
                          <CheckCircle2 size={15} /> Taken
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => logDose(dose, 'skipped')}
                          disabled={logging === `${dose.medicineId}-${dose.time}`}
                        >
                          <SkipForward size={14} /> Skip
                        </button>
                      </div>
                    ) : (
                      <Badge tone={dose.status === 'taken' ? 'success' : 'neutral'} dot>
                        {dose.status === 'taken' ? 'Taken' : 'Skipped'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Pill}
              title="No doses scheduled today"
              description="Add a medicine reminder to create your first daily dose."
              action={<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15} /> Add medicine</button>}
              compact
            />
          )}
        </section>

        <aside className="dashboard-side">
          <section className="card adherence-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Consistency</span>
                <h2>Weekly adherence</h2>
              </div>
              <Sparkles size={18} className="muted-icon" />
            </div>
            <div className="adherence-display">
              <div className="adherence-ring lg" style={{ '--adherence': `${stats.adherence}%` }}>
                <span>{stats.adherence}%</span>
                <small>taken</small>
              </div>
              <div className="adherence-copy">
                <strong>{stats.adherence >= 80 ? 'Beautifully consistent' : stats.adherence >= 50 ? 'Building a rhythm' : 'Let’s restart gently'}</strong>
                <p>{data.adherence?.taken || 0} taken and {data.adherence?.skipped || 0} skipped in the last 7 days.</p>
              </div>
            </div>
            <div className="adherence-bars">
              <div>
                <span>Taken</span>
                <strong>{data.adherence?.taken || 0}</strong>
              </div>
              <div>
                <span>Skipped</span>
                <strong>{data.adherence?.skipped || 0}</strong>
              </div>
              <div>
                <span>Overall</span>
                <strong>{data.adherence?.percentage || 0}%</strong>
              </div>
            </div>
          </section>

          <section className="card info-card">
            <div className="info-card-icon"><Info size={19} /></div>
            <h3>Take medicines the way they were prescribed</h3>
            <p>
              Reminders support your routine, but never change a dose on your own. If you miss a
              dose or experience side effects, ask your doctor or pharmacist.
            </p>
          </section>
        </aside>
      </div>

      <section>
        <div className="section-bar">
          <div>
            <span className="card-kicker">Your cabinet</span>
            <h2 className="section-title">Medicines & reminders</h2>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openCreate}>
            <Plus size={15} /> New reminder
          </button>
        </div>

        {data.medicines.length ? (
          <div className="medicine-grid">
            {data.medicines.map((medicine) => (
              <article className={`medicine-card med-${medicine.color} ${medicine.isActive ? '' : 'inactive'}`} key={medicine._id}>
                <div className="medicine-card-head">
                  <span className="medicine-icon"><Pill size={20} /></span>
                  <div>
                    <h3>{medicine.name}</h3>
                    <span>{medicine.dosage} · {medicine.frequency}</span>
                  </div>
                  <div className="medicine-menu">
                    <button type="button" className="icon-btn" onClick={() => openEdit(medicine)} aria-label={`Edit ${medicine.name}`}>
                      <Edit3 size={16} />
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(medicine)} aria-label={`Delete ${medicine.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="medicine-times">
                  {medicine.times.map((time) => (
                    <span className="time-chip" key={time}><Clock3 size={12} /> {formatTime(time)}</span>
                  ))}
                </div>

                <div className="medicine-dates">
                  <CalendarRange size={14} />
                  {formatDate(medicine.startDate, 'short')} – {formatDate(medicine.endDate, 'short')}
                </div>

                {medicine.instructions && <p className="medicine-instructions">{medicine.instructions}</p>}

                <div className="medicine-card-foot">
                  <button
                    type="button"
                    className={`switch ${medicine.isActive ? 'on' : ''}`}
                    role="switch"
                    aria-checked={medicine.isActive}
                    aria-label={`${medicine.isActive ? 'Pause' : 'Resume'} ${medicine.name}`}
                    onClick={() => toggleActive(medicine)}
                    disabled={toggling === medicine._id}
                  >
                    <span className="switch-thumb" />
                  </button>
                  <span>{medicine.isActive ? 'Active' : 'Paused'}</span>
                  {!medicine.notificationsEnabled && <span className="muted-chip"><BellOff size={12} /> Alerts off</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={Pill}
              title="Your medicine cabinet is empty"
              description="Add your first medicine to start receiving reminders and tracking doses."
              action={<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15} /> Add medicine</button>}
            />
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => (saving ? null : setModalOpen(false))}
        title={editing ? 'Edit medicine reminder' : 'Add medicine reminder'}
        subtitle="Set the schedule your clinician prescribed. You can pause reminders at any time."
        icon={Pill}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveMedicine} disabled={saving}>
              {saving ? <><InlineSpinner size={16} /> Saving…</> : editing ? 'Save changes' : 'Add reminder'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="medicine-name">Medicine name</label>
            <input
              id="medicine-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Metformin"
              maxLength={120}
            />
          </div>
          <div className="field">
            <label htmlFor="medicine-dosage">Dosage</label>
            <input
              id="medicine-dosage"
              value={form.dosage}
              onChange={(event) => updateField('dosage', event.target.value)}
              placeholder="e.g. 500 mg"
              maxLength={80}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="medicine-frequency">Frequency</label>
          <select
            id="medicine-frequency"
            value={form.frequency}
            onChange={(event) => updateField('frequency', event.target.value)}
          >
            {FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>{frequency}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Reminder times</label>
          <div className="time-input-list">
            {form.times.map((time, index) => (
              <div className="time-input-row" key={`${index}-${time}`}>
                <Clock3 size={16} />
                <input
                  type="time"
                  value={time}
                  onChange={(event) => updateTime(index, event.target.value)}
                  aria-label={`Reminder time ${index + 1}`}
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeTime(index)}
                  disabled={form.times.length === 1}
                  aria-label="Remove reminder time"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {form.times.length < 6 && (
              <button type="button" className="btn btn-ghost btn-sm add-time-btn" onClick={addTime}>
                <Plus size={14} /> Add another time
              </button>
            )}
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="medicine-start">Start date</label>
            <input
              id="medicine-start"
              type="date"
              value={form.startDate}
              onChange={(event) => updateField('startDate', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="medicine-end">End date</label>
            <input
              id="medicine-end"
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(event) => updateField('endDate', event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="medicine-instructions">Instructions <span className="optional">(optional)</span></label>
          <textarea
            id="medicine-instructions"
            rows={2}
            maxLength={300}
            value={form.instructions}
            onChange={(event) => updateField('instructions', event.target.value)}
            placeholder="e.g. Take after meals with a full glass of water"
          />
        </div>

        <div className="field">
          <label>Card colour</label>
          <div className="color-swatches">
            {MEDICINE_COLORS.map((color) => (
              <button
                type="button"
                key={color}
                className={`color-swatch med-${color} ${form.color === color ? 'selected' : ''}`}
                onClick={() => updateField('color', color)}
                aria-label={color}
              >
                <span />
              </button>
            ))}
          </div>
        </div>

        <label className="toggle-line">
          <span>
            <strong>Medicine reminders</strong>
            <small>Show browser notifications for this medicine when permission is granted.</small>
          </span>
          <span className={`switch ${form.notificationsEnabled ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={form.notificationsEnabled}
              onChange={(event) => updateField('notificationsEnabled', event.target.checked)}
            />
            <span className="switch-thumb" />
          </span>
        </label>

        {formError && <div className="form-alert">{formError}</div>}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteMedicine}
        title={`Delete ${deleteTarget?.name || 'this reminder'}?`}
        description="This removes the reminder and its recorded doses. This action cannot be undone."
        confirmLabel="Delete reminder"
        loading={deleting}
      />
    </div>
  );
}
