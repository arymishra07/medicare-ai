import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  CalendarX,
  CheckCircle2,
  Clock3,
  Coffee,
  Copy,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { doctorService } from '../../services/doctorService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import { InlineSpinner, SkeletonCard } from '../../components/Loader';
import { addDays, formatDate, formatTime, todayString, WEEK_DAYS } from '../../utils/format';

const DEFAULT_DAY = {
  isAvailable: false,
  startTime: '09:00',
  endTime: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
};

const normalizeSchedule = (schedule = []) =>
  WEEK_DAYS.map((_day, dayOfWeek) => {
    const found = schedule.find((item) => item.dayOfWeek === dayOfWeek);
    return found
      ? {
          dayOfWeek,
          isAvailable: found.isAvailable,
          startTime: found.startTime || '09:00',
          endTime: found.endTime || '17:00',
          breakStart: found.breakStart || '13:00',
          breakEnd: found.breakEnd || '14:00',
        }
      : { dayOfWeek, ...DEFAULT_DAY, isAvailable: dayOfWeek >= 1 && dayOfWeek <= 5 };
  });

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const previewSlots = (day, duration) => {
  if (!day?.isAvailable) return [];
  const start = toMinutes(day.startTime);
  const end = toMinutes(day.endTime);
  const hasBreak = day.breakStart !== day.breakEnd;
  const bStart = toMinutes(day.breakStart);
  const bEnd = toMinutes(day.breakEnd);
  const slots = [];

  for (let cursor = start; cursor + duration <= end && slots.length < 12; cursor += duration) {
    const overlaps = hasBreak && cursor < bEnd && cursor + duration > bStart;
    if (!overlaps) {
      slots.push(`${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`);
    }
  }
  return slots;
};

export default function DoctorAvailability() {
  const toast = useToast();
  const [schedule, setSchedule] = useState(normalizeSchedule());
  const [slotDuration, setSlotDuration] = useState(30);
  const [blockedDates, setBlockedDates] = useState([]);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newBlock, setNewBlock] = useState({ date: addDays(todayString(), 1), reason: '' });

  const load = async () => {
    setError('');
    try {
      const { data } = await doctorService.myAvailability();
      const availability = data.data.availability;
      setSchedule(normalizeSchedule(availability.weeklySchedule));
      setSlotDuration(availability.slotDuration || 30);
      setBlockedDates(availability.blockedDates || []);
      if (availability.timezone) setTimezone(availability.timezone);
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
    const available = schedule.filter((day) => day.isAvailable);
    let minutes = 0;
    let slots = 0;
    available.forEach((day) => {
      const breakMinutes =
        day.breakStart !== day.breakEnd
          ? Math.max(0, toMinutes(day.breakEnd) - toMinutes(day.breakStart))
          : 0;
      const working = Math.max(0, toMinutes(day.endTime) - toMinutes(day.startTime) - breakMinutes);
      minutes += working;
      slots += Math.floor(working / slotDuration);
    });
    return {
      days: available.length,
      hours: (minutes / 60).toFixed(1),
      slots,
    };
  }, [schedule, slotDuration]);

  const previewDay = useMemo(() => {
    const todayIndex = new Date().getDay();
    for (let offset = 0; offset < 7; offset += 1) {
      const index = (todayIndex + offset) % 7;
      if (schedule[index]?.isAvailable) return schedule[index];
    }
    return schedule.find((day) => day.isAvailable) || null;
  }, [schedule]);

  const slots = useMemo(
    () => (previewDay ? previewSlots(previewDay, Number(slotDuration)) : []),
    [previewDay, slotDuration]
  );

  const updateDay = (dayOfWeek, field, value) => {
    setSchedule((current) =>
      current.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day))
    );
  };

  const toggleDay = (dayOfWeek) => {
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, isAvailable: !day.isAvailable } : day
      )
    );
  };

  const toggleBreak = (day) => {
    if (day.breakStart === day.breakEnd) {
      updateDay(day.dayOfWeek, 'breakStart', '13:00');
      updateDay(day.dayOfWeek, 'breakEnd', '14:00');
    } else {
      updateDay(day.dayOfWeek, 'breakStart', day.startTime);
      updateDay(day.dayOfWeek, 'breakEnd', day.startTime);
    }
  };

  const copyWeekdays = () => {
    const monday = schedule[1];
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek >= 1 && day.dayOfWeek <= 5
          ? { ...day, isAvailable: true, startTime: monday.startTime, endTime: monday.endTime, breakStart: monday.breakStart, breakEnd: monday.breakEnd }
          : day
      )
    );
    toast.info('Weekday hours copied', 'Monday’s schedule was applied to Tuesday–Friday.');
  };

  const addBlockedDate = () => {
    if (!newBlock.date) {
      toast.warning('Choose a date to block');
      return;
    }
    if (newBlock.date < todayString()) {
      toast.warning('That date has already passed');
      return;
    }
    if (blockedDates.some((item) => item.date === newBlock.date)) {
      toast.warning('That date is already blocked');
      return;
    }
    setBlockedDates((current) => [
      ...current,
      { date: newBlock.date, reason: newBlock.reason.trim() },
    ].sort((a, b) => a.date.localeCompare(b.date)));
    setNewBlock({ date: addDays(todayString(), 1), reason: '' });
  };

  const save = async () => {
    const invalid = schedule.find(
      (day) => day.isAvailable && (!day.startTime || !day.endTime || day.startTime >= day.endTime)
    );
    if (invalid) {
      toast.error('Check your working hours', `${WEEK_DAYS[invalid.dayOfWeek]} needs an end time after its start time.`);
      return;
    }
    const invalidBreak = schedule.find(
      (day) =>
        day.isAvailable &&
        day.breakStart !== day.breakEnd &&
        (day.breakStart >= day.breakEnd ||
          day.breakStart < day.startTime ||
          day.breakEnd > day.endTime)
    );
    if (invalidBreak) {
      toast.error('Check the break window', `${WEEK_DAYS[invalidBreak.dayOfWeek]}’s break must fall inside working hours.`);
      return;
    }

    setSaving(true);
    try {
      await doctorService.updateAvailability({
        weeklySchedule: schedule,
        slotDuration: Number(slotDuration),
        blockedDates,
        timezone,
      });
      toast.success('Availability saved', 'Patients will now see your updated slots.');
    } catch (err) {
      toast.error('Could not save availability', getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <SkeletonCard height={180} />
        <SkeletonCard height={520} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Your clinical calendar"
        title="Working hours & availability"
        subtitle="Set clear, realistic hours. Patients can only book slots that fit your schedule and breaks."
        actions={
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><InlineSpinner size={16} /> Saving…</> : <><Save size={16} /> Save availability</>}
          </button>
        }
      />

      <div className="availability-summary">
        <div className="availability-stat">
          <span className="records-summary-icon teal"><CalendarRange size={19} /></span>
          <div><strong>{stats.days} days</strong><span>Available each week</span></div>
        </div>
        <div className="availability-stat">
          <span className="records-summary-icon blue"><Clock3 size={19} /></span>
          <div><strong>{stats.hours} hrs</strong><span>Weekly clinic time</span></div>
        </div>
        <div className="availability-stat">
          <span className="records-summary-icon green"><Sparkles size={19} /></span>
          <div><strong>{stats.slots} slots</strong><span>Bookable appointments</span></div>
        </div>
        <div className="availability-stat">
          <span className="records-summary-icon violet"><CalendarX size={19} /></span>
          <div><strong>{blockedDates.length}</strong><span>Blocked dates</span></div>
        </div>
      </div>

      <div className="dashboard-grid availability-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Recurring schedule</span>
              <h2>Weekly working hours</h2>
            </div>
            <div className="card-head-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyWeekdays}>
                <Copy size={14} /> Copy Monday to weekdays
              </button>
            </div>
          </div>

          <div className="availability-list">
            {schedule.map((day) => (
              <div className={`availability-row ${day.isAvailable ? '' : 'off'}`} key={day.dayOfWeek}>
                <label className="availability-day">
                  <span className={`switch ${day.isAvailable ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={() => toggleDay(day.dayOfWeek)}
                      aria-label={`Toggle availability on ${WEEK_DAYS[day.dayOfWeek]}`}
                    />
                    <span className="switch-thumb" />
                  </span>
                  <strong>{WEEK_DAYS[day.dayOfWeek]}</strong>
                </label>

                {day.isAvailable ? (
                  <div className="availability-controls">
                    <div className="time-range">
                      <label>
                        <span>From</span>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(event) => updateDay(day.dayOfWeek, 'startTime', event.target.value)}
                        />
                      </label>
                      <span className="time-dash">–</span>
                      <label>
                        <span>To</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(event) => updateDay(day.dayOfWeek, 'endTime', event.target.value)}
                        />
                      </label>
                    </div>

                    <div className={`break-controls ${day.breakStart === day.breakEnd ? 'no-break' : ''}`}>
                      <label className="break-toggle">
                        <input
                          type="checkbox"
                          checked={day.breakStart !== day.breakEnd}
                          onChange={() => toggleBreak(day)}
                        />
                        <Coffee size={14} /> Break
                      </label>
                      {day.breakStart !== day.breakEnd && (
                        <div className="time-range">
                          <input
                            type="time"
                            value={day.breakStart}
                            onChange={(event) => updateDay(day.dayOfWeek, 'breakStart', event.target.value)}
                            aria-label={`${WEEK_DAYS[day.dayOfWeek]} break start`}
                          />
                          <span className="time-dash">–</span>
                          <input
                            type="time"
                            value={day.breakEnd}
                            onChange={(event) => updateDay(day.dayOfWeek, 'breakEnd', event.target.value)}
                            aria-label={`${WEEK_DAYS[day.dayOfWeek]} break end`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="day-off-label">Not consulting</span>
                )}
              </div>
            ))}
          </div>

          <div className="availability-settings">
            <div className="field">
              <label htmlFor="slot-duration">Appointment slot length</label>
              <select
                id="slot-duration"
                value={slotDuration}
                onChange={(event) => setSlotDuration(Number(event.target.value))}
              >
                {[15, 20, 30, 45, 60].map((duration) => (
                  <option key={duration} value={duration}>{duration} minutes</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="timezone">Timezone</label>
              <select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (ET)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
              </select>
            </div>
          </div>

          <div className="availability-note">
            <CheckCircle2 size={15} />
            Saving updates the live booking calendar immediately. Existing appointments are not changed.
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Patient view</span>
                <h2>Slot preview</h2>
              </div>
              <Badge tone="teal">{slotDuration} min</Badge>
            </div>
            {previewDay ? (
              <>
                <p className="preview-day-label">
                  First available day: <strong>{WEEK_DAYS[previewDay.dayOfWeek]}</strong>
                </p>
                <div className="preview-slots">
                  {slots.length ? slots.map((time) => (
                    <span className="preview-slot" key={time}>{formatTime(time)}</span>
                  )) : <p className="muted-text">No slots fit this schedule. Adjust hours or break times.</p>}
                </div>
                <span className="field-hint">Preview only — booked slots are hidden from patients automatically.</span>
              </>
            ) : (
              <EmptyState icon={CalendarX} title="No available days" description="Turn on at least one day to open booking." compact />
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Time off</span>
                <h2>Blocked dates</h2>
              </div>
              <Badge tone="neutral">{blockedDates.length}</Badge>
            </div>

            <div className="blocked-form">
              <div className="field">
                <label htmlFor="block-date">Date</label>
                <input
                  id="block-date"
                  type="date"
                  min={todayString()}
                  value={newBlock.date}
                  onChange={(event) => setNewBlock((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="block-reason">Reason <span className="optional">(optional)</span></label>
                <input
                  id="block-reason"
                  value={newBlock.reason}
                  maxLength={200}
                  onChange={(event) => setNewBlock((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Conference, leave…"
                />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addBlockedDate}>
                <Plus size={14} /> Block date
              </button>
            </div>

            {blockedDates.length ? (
              <div className="blocked-list">
                {blockedDates.map((item) => (
                  <div className="blocked-item" key={item.date}>
                    <span className="blocked-icon"><CalendarX size={15} /></span>
                    <div>
                      <strong>{formatDate(item.date)}</strong>
                      {item.reason && <span>{item.reason}</span>}
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setBlockedDates((current) => current.filter((entry) => entry.date !== item.date))}
                      aria-label={`Remove blocked date ${item.date}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text blocked-empty">No upcoming time off. Add a date when you’ll be unavailable.</p>
            )}
          </section>

          <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save all availability'}
          </button>
        </aside>
      </div>
    </div>
  );
}
