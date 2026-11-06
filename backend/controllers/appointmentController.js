const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const DoctorAvailability = require('../models/DoctorAvailability');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAuditLog } = require('../utils/audit');
const { createNotification } = require('../services/notificationService');
const { APPOINTMENT_STATUS } = require('../config/constants');
const {
  toDateString,
  getDayOfWeek,
  generateSlots,
  isPastSlot,
  formatTime12,
  getWeekdayName,
} = require('../utils/date');

const ACTIVE_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.APPROVED];

const populateAppointment = (query) =>
  query
    .populate('patient', 'name email phone gender dateOfBirth bloodGroup address emergencyContact')
    .populate(
      'doctor',
      'name email phone specialization qualification experienceYears consultationFee hospital location rating isVerified'
    );

const buildSlot = async ({ doctorId, date, startTime, excludeAppointmentId = null }) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    throw ApiError.badRequest('Please provide a valid appointment date');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '')) {
    throw ApiError.badRequest('Please provide a valid appointment time');
  }
  if (date < toDateString()) {
    throw ApiError.badRequest('Appointments cannot be booked for a past date');
  }
  if (date === toDateString() && isPastSlot(date, startTime)) {
    throw ApiError.badRequest('That time has already passed today. Please choose a later slot.');
  }

  const doctor = await User.findOne({
    _id: doctorId,
    role: 'doctor',
    isActive: true,
    isVerified: true,
  });
  if (!doctor) throw ApiError.notFound('Doctor not found or not available for booking');

  const availability = await DoctorAvailability.findOne({ doctor: doctor._id });
  if (!availability) throw ApiError.conflict('This doctor has not published their availability yet');

  const daySchedule = availability.weeklySchedule.find(
    (day) => day.dayOfWeek === getDayOfWeek(date)
  );

  if (!daySchedule?.isAvailable) {
    throw ApiError.conflict(
      `Dr. ${doctor.name.replace(/^Dr\.\s*/, '')} is not available on ${getWeekdayName(date)}`
    );
  }

  if (availability.blockedDates.some((item) => item.date === date)) {
    throw ApiError.conflict('The doctor is unavailable on the selected date');
  }

  const slotEnd = generateSlots({
    startTime: daySchedule.startTime,
    endTime: daySchedule.endTime,
    breakStart: daySchedule.breakStart,
    breakEnd: daySchedule.breakEnd,
    duration: availability.slotDuration,
  }).find((slot) => slot.startTime === startTime);

  if (!slotEnd) {
    throw ApiError.badRequest('The selected time is outside the doctor’s working hours or during a break');
  }

  const duplicateFilter = {
    doctor: doctor._id,
    date,
    startTime,
    status: { $in: ACTIVE_STATUSES },
  };
  if (excludeAppointmentId) {
    duplicateFilter._id = { $ne: excludeAppointmentId };
  }

  const existing = await Appointment.exists(duplicateFilter);
  if (existing) {
    throw ApiError.conflict('That time slot is already booked. Please choose another slot.');
  }

  return {
    doctor,
    startTime,
    endTime: slotEnd.endTime,
    duration: availability.slotDuration,
  };
};

const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, startTime, reason, symptoms = '', type = 'in-person' } = req.body;

  if (!mongoose.isValidObjectId(doctorId)) {
    throw ApiError.badRequest('Please select a valid doctor');
  }
  if (!['in-person', 'video'].includes(type)) {
    throw ApiError.badRequest('Invalid consultation type');
  }
  if (type === 'video') {
    // Video consult is intentionally shown as a preference; in-person workflow remains.
  }

  const slot = await buildSlot({ doctorId, date, startTime });

  const patientConflict = await Appointment.exists({
    patient: req.user._id,
    date,
    startTime,
    status: { $in: ACTIVE_STATUSES },
  });
  if (patientConflict) {
    throw ApiError.conflict('You already have an active appointment at this time');
  }

  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: slot.doctor._id,
    date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    reason,
    symptoms,
    type,
    status: APPOINTMENT_STATUS.PENDING,
    statusHistory: [
      {
        status: APPOINTMENT_STATUS.PENDING,
        changedBy: req.user._id,
        note: 'Appointment requested by patient',
      },
    ],
  });

  await Promise.all([
    createNotification({
      userId: slot.doctor._id,
      title: 'New appointment request',
      message: `${req.user.name} requested a ${type} appointment on ${date} at ${formatTime12(startTime)}.`,
      type: 'appointment',
      link: '/doctor/appointments',
    }),
    createNotification({
      userId: req.user._id,
      title: 'Appointment request sent',
      message: `Your request with Dr. ${slot.doctor.name.replace(/^Dr\.\s*/, '')} for ${date} at ${formatTime12(startTime)} is awaiting confirmation.`,
      type: 'appointment',
      link: '/patient/appointments',
    }),
  ]);

  await writeAuditLog(req, {
    action: 'APPOINTMENT_CREATE',
    targetType: 'Appointment',
    targetId: appointment._id,
    description: `Appointment requested with ${slot.doctor.name} on ${date} ${startTime}`,
  });

  const populated = await populateAppointment(Appointment.findById(appointment._id));

  res.status(201).json({
    success: true,
    message: 'Appointment request sent. You will be notified once the doctor confirms.',
    data: { appointment: populated },
  });
});

const listAppointments = asyncHandler(async (req, res) => {
  const { status, date, from, to, scope, search = '', limit = 100 } = req.query;

  const filter = {};
  if (req.user.role === 'patient') filter.patient = req.user._id;
  if (req.user.role === 'doctor') filter.doctor = req.user._id;

  if (status) {
    const statuses = String(status)
      .split(',')
      .filter((value) =>
        Object.values(APPOINTMENT_STATUS).includes(value)
      );
    if (statuses.length) filter.status = { $in: statuses };
  }

  if (date) filter.date = date;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  if (scope === 'upcoming') {
    filter.date = { ...(filter.date || {}), $gte: toDateString() };
    filter.status = { $in: ACTIVE_STATUSES };
  }

  if (scope === 'past') {
    filter.$or = [
      { date: { $lt: toDateString() } },
      { status: { $in: [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.REJECTED] } },
    ];
  }

  if (search && req.user.role === 'admin') {
    const users = await User.find({
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ],
    }).select('_id');
    filter.$or = [{ patient: { $in: users.map((u) => u._id) } }, { doctor: { $in: users.map((u) => u._id) } }];
  }

  const sortDirection = scope === 'past' ? -1 : 1;
  const appointments = await populateAppointment(
    Appointment.find(filter)
      .sort({ date: sortDirection, startTime: sortDirection })
      .limit(Math.min(Number(limit) || 100, 300))
  );

  res.json({ success: true, data: { appointments } });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await populateAppointment(Appointment.findById(req.params.id));
  if (!appointment) throw ApiError.notFound('Appointment not found');

  const userId = String(req.user._id);
  const isOwner = String(appointment.patient?._id) === userId;
  const isDoctor = String(appointment.doctor?._id) === userId;

  if (req.user.role !== 'admin' && !isOwner && !isDoctor) {
    throw ApiError.forbidden('You do not have access to this appointment');
  }

  res.json({ success: true, data: { appointment } });
});

const ALLOWED_TRANSITIONS = {
  doctor: {
    pending: ['approved', 'rejected'],
    approved: ['completed', 'cancelled'],
    rejected: [],
    completed: [],
    cancelled: [],
  },
  patient: {
    pending: ['cancelled'],
    approved: ['cancelled'],
    rejected: [],
    completed: [],
    cancelled: [],
  },
  admin: {
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['completed', 'cancelled'],
    rejected: ['pending'],
    completed: [],
    cancelled: ['pending'],
  },
};

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status, note = '', cancellationReason = '' } = req.body;
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) throw ApiError.notFound('Appointment not found');

  const userId = String(req.user._id);
  const isOwner = String(appointment.patient) === userId;
  const isDoctor = String(appointment.doctor) === userId;

  if (req.user.role === 'patient' && !isOwner) {
    throw ApiError.forbidden('You can only manage your own appointments');
  }
  if (req.user.role === 'doctor' && !isDoctor) {
    throw ApiError.forbidden('You can only manage your own appointments');
  }

  if (!Object.values(APPOINTMENT_STATUS).includes(status)) {
    throw ApiError.badRequest('Invalid appointment status');
  }
  if (appointment.status === status) {
    throw ApiError.badRequest(`This appointment is already ${status}`);
  }

  const allowed = ALLOWED_TRANSITIONS[req.user.role]?.[appointment.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(
      `An appointment that is ${appointment.status} cannot be marked ${status}`
    );
  }

  if (status === APPOINTMENT_STATUS.CANCELLED && !cancellationReason.trim()) {
    throw ApiError.badRequest('Please provide a reason for cancelling the appointment');
  }

  appointment.status = status;
  if (note) appointment.doctorNotes = note;
  if (status === APPOINTMENT_STATUS.CANCELLED || status === APPOINTMENT_STATUS.REJECTED) {
    appointment.cancellationReason = cancellationReason || note;
  }
  appointment.statusHistory.push({
    status,
    changedBy: req.user._id,
    note: note || cancellationReason || `Status changed to ${status}`,
  });

  await appointment.save();

  const doctor = await User.findById(appointment.doctor).select('name');
  const patient = await User.findById(appointment.patient).select('name');
  const when = `${appointment.date} at ${formatTime12(appointment.startTime)}`;

  const messages = {
    approved: {
      title: 'Appointment confirmed',
      message: `Your appointment with ${doctor?.name || 'your doctor'} on ${when} has been confirmed.`,
      link: '/patient/appointments',
    },
    rejected: {
      title: 'Appointment declined',
      message: `Your request with ${doctor?.name || 'the doctor'} on ${when} could not be accommodated.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
      link: '/patient/appointments',
    },
    completed: {
      title: 'Appointment completed',
      message: `Your appointment with ${doctor?.name || 'your doctor'} on ${when} is marked complete.`,
      link: '/patient/appointments',
    },
    cancelled: {
      title: 'Appointment cancelled',
      message:
        req.user.role === 'patient'
          ? `${patient?.name || 'A patient'} cancelled the appointment on ${when}.`
          : `Your appointment on ${when} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
      link: req.user.role === 'patient' ? '/doctor/appointments' : '/patient/appointments',
    },
  };

  const notification = messages[status];
  if (notification) {
    const recipient =
      req.user.role === 'patient' ? appointment.doctor : appointment.patient;
    await createNotification({
      userId: recipient,
      title: notification.title,
      message: notification.message,
      type: 'appointment',
      link: notification.link,
    });
  }

  await writeAuditLog(req, {
    action: `APPOINTMENT_${status.toUpperCase()}`,
    targetType: 'Appointment',
    targetId: appointment._id,
    description: `${status} for appointment on ${when}`,
  });

  const populated = await populateAppointment(Appointment.findById(appointment._id));

  res.json({
    success: true,
    message: `Appointment ${status} successfully`,
    data: { appointment: populated },
  });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { date, startTime, reason = '' } = req.body;
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) throw ApiError.notFound('Appointment not found');

  const userId = String(req.user._id);
  const isOwner = String(appointment.patient) === userId;
  const isDoctor = String(appointment.doctor) === userId;

  if (req.user.role === 'patient' && !isOwner) {
    throw ApiError.forbidden('You can only reschedule your own appointments');
  }
  if (req.user.role === 'doctor' && !isDoctor) {
    throw ApiError.forbidden('You can only reschedule your own appointments');
  }
  if (!ACTIVE_STATUSES.includes(appointment.status)) {
    throw ApiError.badRequest('Only active appointments can be rescheduled');
  }

  const slot = await buildSlot({
    doctorId: appointment.doctor,
    date,
    startTime,
    excludeAppointmentId: appointment._id,
  });

  appointment.date = date;
  appointment.startTime = slot.startTime;
  appointment.endTime = slot.endTime;
  appointment.status = APPOINTMENT_STATUS.PENDING;
  appointment.cancellationReason = '';
  appointment.statusHistory.push({
    status: APPOINTMENT_STATUS.PENDING,
    changedBy: req.user._id,
    note: reason || `Rescheduled to ${date} at ${formatTime12(startTime)}`,
  });
  await appointment.save();

  const recipient = req.user.role === 'patient' ? appointment.doctor : appointment.patient;
  await createNotification({
    userId: recipient,
    title: 'Appointment rescheduled',
    message: `${req.user.name} rescheduled the appointment to ${date} at ${formatTime12(startTime)}. It is awaiting confirmation.`,
    type: 'appointment',
    link: req.user.role === 'patient' ? '/doctor/appointments' : '/patient/appointments',
  });

  await writeAuditLog(req, {
    action: 'APPOINTMENT_RESCHEDULE',
    targetType: 'Appointment',
    targetId: appointment._id,
    description: `Rescheduled to ${date} ${startTime}`,
  });

  const populated = await populateAppointment(Appointment.findById(appointment._id));
  res.json({
    success: true,
    message: 'Appointment rescheduled. It is pending confirmation.',
    data: { appointment: populated },
  });
});

const getUpcomingCount = asyncHandler(async (req, res) => {
  const filter = {
    date: { $gte: toDateString() },
    status: { $in: ACTIVE_STATUSES },
  };
  if (req.user.role === 'patient') filter.patient = req.user._id;
  if (req.user.role === 'doctor') filter.doctor = req.user._id;

  const count = await Appointment.countDocuments(filter);
  res.json({ success: true, data: { count } });
});

module.exports = {
  createAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  getUpcomingCount,
};
