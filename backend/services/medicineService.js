const { toDateString, addDays, formatTime12 } = require('../utils/date');

const isMedicineActiveOn = (medicine, date) =>
  medicine.isActive && medicine.startDate <= date && medicine.endDate >= date;

/**
 * Builds today's dose schedule for a set of medicines.
 * A dose is "pending" until the user records taken/skipped.
 */
const buildDoseSchedule = (medicines, date = toDateString()) => {
  const doses = [];

  medicines.forEach((medicine) => {
    if (!isMedicineActiveOn(medicine, date)) return;

    medicine.times.forEach((time) => {
      const log = medicine.logs.find((item) => item.date === date && item.time === time);
      const now = new Date();
      const dueAt = new Date(`${date}T${time}:00`);
      doses.push({
        medicineId: medicine._id,
        name: medicine.name,
        dosage: medicine.dosage,
        color: medicine.color,
        instructions: medicine.instructions,
        time,
        displayTime: formatTime12(time),
        status: log?.status || 'pending',
        loggedAt: log?.loggedAt || null,
        isOverdue: !log && dueAt.getTime() < now.getTime(),
      });
    });
  });

  return doses.sort((a, b) => a.time.localeCompare(b.time));
};

const buildAdherence = (medicines, days = 7) => {
  const today = toDateString();
  const range = Array.from({ length: days }, (_value, index) => addDays(today, -(days - 1 - index)));
  let taken = 0;
  let skipped = 0;

  medicines.forEach((medicine) => {
    medicine.logs.forEach((log) => {
      if (!range.includes(log.date)) return;
      if (log.status === 'taken') taken += 1;
      if (log.status === 'skipped') skipped += 1;
    });
  });

  const total = taken + skipped;
  return {
    taken,
    skipped,
    total,
    percentage: total === 0 ? 100 : Math.round((taken / total) * 100),
    rangeStart: range[0],
    rangeEnd: range[range.length - 1],
  };
};

module.exports = { buildDoseSchedule, buildAdherence, isMedicineActiveOn };
