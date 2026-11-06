const toDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const formatTime12 = (time) => {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

const addMinutes = (time, minutes) => minutesToTime(timeToMinutes(time) + minutes);

const isPastSlot = (dateString, startTime) => {
  const now = new Date();
  const slot = new Date(`${dateString}T${startTime}:00`);
  return slot.getTime() <= now.getTime();
};

const addDays = (dateString, days) => {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
};

const isDateInRange = (dateString, startDate, endDate) =>
  dateString >= startDate && dateString <= endDate;

/**
 * Generates slots for a working day, removing breaks and booked slots.
 */
const generateSlots = ({
  startTime,
  endTime,
  breakStart,
  breakEnd,
  duration = 30,
  booked = [],
}) => {
  const slots = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const bStart = breakStart ? timeToMinutes(breakStart) : null;
  const bEnd = breakEnd ? timeToMinutes(breakEnd) : null;
  const hasBreak = bStart !== null && bEnd !== null && bEnd > bStart;

  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    const slotStart = minutesToTime(cursor);
    const slotEnd = minutesToTime(cursor + duration);

    const overlapsBreak =
      hasBreak && cursor < bEnd && cursor + duration > bStart;

    if (!overlapsBreak && !booked.includes(slotStart)) {
      slots.push({ startTime: slotStart, endTime: slotEnd });
    }
  }

  return slots;
};

const getDayOfWeek = (dateString) => new Date(`${dateString}T00:00:00`).getDay();

const getWeekdayName = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

const buildLastNDays = (n = 7) => {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateString(d));
  }
  return days;
};

const buildLastNMonths = (n = 6) => {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }
  return months;
};

module.exports = {
  toDateString,
  timeToMinutes,
  minutesToTime,
  formatTime12,
  addMinutes,
  isPastSlot,
  addDays,
  isDateInRange,
  generateSlots,
  getDayOfWeek,
  getWeekdayName,
  buildLastNDays,
  buildLastNMonths,
};
