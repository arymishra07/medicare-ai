const Medicine = require('../models/Medicine');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAuditLog } = require('../utils/audit');
const { toDateString } = require('../utils/date');
const { buildDoseSchedule, buildAdherence } = require('../services/medicineService');

const normalizeTimes = (times) => {
  if (!Array.isArray(times)) throw ApiError.badRequest('Please add at least one reminder time');
  const cleaned = [...new Set(times)].sort();
  if (!cleaned.length) throw ApiError.badRequest('Please add at least one reminder time');
  if (cleaned.length > 6) throw ApiError.badRequest('You can add up to 6 reminder times');
  if (!cleaned.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    throw ApiError.badRequest('Reminder times must use HH:MM format');
  }
  return cleaned;
};

const listMedicines = asyncHandler(async (req, res) => {
  const filters = { user: req.user._id };
  if (req.query.active === 'true') filters.isActive = true;
  if (req.query.active === 'false') filters.isActive = false;

  const medicines = await Medicine.find(filters).sort({ isActive: -1, createdAt: -1 });
  const today = toDateString();

  res.json({
    success: true,
    data: {
      medicines,
      todaySchedule: buildDoseSchedule(medicines, today),
      adherence: buildAdherence(medicines),
    },
  });
});

const getTodaySchedule = asyncHandler(async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : toDateString();
  const medicines = await Medicine.find({ user: req.user._id, isActive: true });

  res.json({
    success: true,
    data: {
      date,
      doses: buildDoseSchedule(medicines, date),
      adherence: buildAdherence(medicines),
    },
  });
});

const createMedicine = asyncHandler(async (req, res) => {
  const {
    name,
    dosage,
    times,
    startDate,
    endDate,
    frequency = 'Once daily',
    instructions = '',
    color = 'teal',
    notificationsEnabled = true,
  } = req.body;

  if (startDate > endDate) {
    throw ApiError.badRequest('End date must be on or after the start date');
  }
  if (endDate < toDateString()) {
    throw ApiError.badRequest('End date cannot be in the past');
  }

  const medicine = await Medicine.create({
    user: req.user._id,
    name,
    dosage,
    times: normalizeTimes(times),
    startDate,
    endDate,
    frequency,
    instructions,
    color,
    notificationsEnabled,
  });

  await writeAuditLog(req, {
    action: 'MEDICINE_CREATE',
    targetType: 'Medicine',
    targetId: medicine._id,
    description: `Reminder created for ${medicine.name}`,
  });

  res.status(201).json({
    success: true,
    message: 'Medicine reminder added',
    data: { medicine },
  });
});

const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
  if (!medicine) throw ApiError.notFound('Medicine reminder not found');

  const editable = [
    'name',
    'dosage',
    'frequency',
    'startDate',
    'endDate',
    'instructions',
    'color',
    'isActive',
    'notificationsEnabled',
  ];

  editable.forEach((field) => {
    if (req.body[field] !== undefined) medicine[field] = req.body[field];
  });

  if (req.body.times !== undefined) {
    medicine.times = normalizeTimes(req.body.times);
  }

  if (medicine.startDate > medicine.endDate) {
    throw ApiError.badRequest('End date must be on or after the start date');
  }

  await medicine.save();

  await writeAuditLog(req, {
    action: 'MEDICINE_UPDATE',
    targetType: 'Medicine',
    targetId: medicine._id,
    description: `Reminder updated for ${medicine.name}`,
  });

  res.json({ success: true, message: 'Medicine reminder updated', data: { medicine } });
});

const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!medicine) throw ApiError.notFound('Medicine reminder not found');

  await writeAuditLog(req, {
    action: 'MEDICINE_DELETE',
    targetType: 'Medicine',
    targetId: medicine._id,
    description: `Reminder deleted for ${medicine.name}`,
  });

  res.json({ success: true, message: 'Medicine reminder deleted' });
});

const logDose = asyncHandler(async (req, res) => {
  const { date = toDateString(), time, status } = req.body;

  if (!['taken', 'skipped'].includes(status)) {
    throw ApiError.badRequest('Status must be either taken or skipped');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('Invalid log date');
  }
  if (date > toDateString()) {
    throw ApiError.badRequest('You cannot record a dose in the future');
  }

  const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
  if (!medicine) throw ApiError.notFound('Medicine reminder not found');

  if (!medicine.times.includes(time)) {
    throw ApiError.badRequest('That reminder time is not part of this medicine schedule');
  }
  if (date < medicine.startDate || date > medicine.endDate) {
    throw ApiError.badRequest('This date is outside the medicine’s scheduled range');
  }

  const existing = medicine.logs.find((log) => log.date === date && log.time === time);
  if (existing) {
    existing.status = status;
    existing.loggedAt = new Date();
  } else {
    medicine.logs.push({ date, time, status });
  }

  await medicine.save();

  res.json({
    success: true,
    message: `Dose marked as ${status}`,
    data: { medicine },
  });
});

const getMedicineStats = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({ user: req.user._id });
  const active = medicines.filter(
    (medicine) => medicine.isActive && medicine.endDate >= toDateString()
  );

  res.json({
    success: true,
    data: {
      total: medicines.length,
      active: active.length,
      adherence: buildAdherence(medicines, 30),
    },
  });
});

module.exports = {
  listMedicines,
  getTodaySchedule,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  logDose,
  getMedicineStats,
};
