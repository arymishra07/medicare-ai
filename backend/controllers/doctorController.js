const User = require('../models/User');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const MedicalRecord = require('../models/MedicalRecord');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { SPECIALIZATIONS } = require('../config/constants');
const {
  toDateString,
  getDayOfWeek,
  generateSlots,
  isPastSlot,
} = require('../utils/date');

const listDoctors = asyncHandler(async (req, res) => {
  const { search = '', specialization = '', location = '', limit = 50 } = req.query;

  const query = { role: 'doctor', isVerified: true, isActive: true };
  if (specialization) query.specialization = specialization;
  if (location) query.location = new RegExp(location, 'i');

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') },
      { hospital: new RegExp(search, 'i') },
      { location: new RegExp(search, 'i') },
    ];
  }

  const doctors = await User.find(query)
    .select(
      'name email phone specialization qualification experienceYears consultationFee bio hospital location rating reviewsCount isVerified'
    )
    .sort({ rating: -1, reviewsCount: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .lean();

  const availability = await DoctorAvailability.find({
    doctor: { $in: doctors.map((doctor) => doctor._id) },
  }).lean();

  const availabilityByDoctor = new Map(
    availability.map((item) => [String(item.doctor), item])
  );

  const data = doctors.map((doctor) => {
    const schedule = availabilityByDoctor.get(String(doctor._id));
    const availableDays = schedule?.weeklySchedule
      ? schedule.weeklySchedule.filter((day) => day.isAvailable).map((day) => day.dayOfWeek)
      : [];
    return {
      ...doctor,
      availableDays,
      slotDuration: schedule?.slotDuration || 30,
    };
  });

  res.json({ success: true, data: { doctors: data } });
});

const getSpecializations = asyncHandler(async (_req, res) => {
  const counts = await User.aggregate([
    { $match: { role: 'doctor', isVerified: true, isActive: true } },
    { $group: { _id: '$specialization', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((item) => [item._id, item.count]));

  res.json({
    success: true,
    data: {
      specializations: SPECIALIZATIONS.map((name) => ({
        name,
        doctors: countMap.get(name) || 0,
      })),
    },
  });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await User.findOne({
    _id: req.params.id,
    role: 'doctor',
    isActive: true,
  }).select('-password');

  if (!doctor) throw ApiError.notFound('Doctor not found');
  if (!doctor.isVerified && String(req.user?._id) !== String(doctor._id)) {
    throw ApiError.notFound('Doctor not found');
  }

  const availability = await DoctorAvailability.findOne({ doctor: doctor._id }).lean();
  const appointmentCount = await Appointment.countDocuments({
    doctor: doctor._id,
    status: 'completed',
  });

  res.json({
    success: true,
    data: {
      doctor,
      availability,
      completedAppointments: appointmentCount,
    },
  });
});

const getDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    throw ApiError.badRequest('Please provide a valid date in YYYY-MM-DD format');
  }

  const doctor = await User.findOne({
    _id: req.params.id,
    role: 'doctor',
    isVerified: true,
    isActive: true,
  });
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const availability = await DoctorAvailability.findOne({ doctor: doctor._id });
  if (!availability) {
    return res.json({ success: true, data: { slots: [], reason: 'The doctor has not set availability yet.' } });
  }

  const dayOfWeek = getDayOfWeek(date);
  const daySchedule = availability.weeklySchedule.find((day) => day.dayOfWeek === dayOfWeek);

  if (!daySchedule?.isAvailable) {
    return res.json({
      success: true,
      data: {
        slots: [],
        reason: `${doctor.name} is not available on ${new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}.`,
      },
    });
  }

  const blocked = availability.blockedDates.find((item) => item.date === date);
  if (blocked) {
    return res.json({
      success: true,
      data: {
        slots: [],
        reason: blocked.reason || 'The doctor is unavailable on this date.',
      },
    });
  }

  const activeAppointments = await Appointment.find({
    doctor: doctor._id,
    date,
    status: { $in: ['pending', 'approved'] },
  }).select('startTime');

  const booked = activeAppointments.map((appointment) => appointment.startTime);
  let slots = generateSlots({
    startTime: daySchedule.startTime,
    endTime: daySchedule.endTime,
    breakStart: daySchedule.breakStart,
    breakEnd: daySchedule.breakEnd,
    duration: availability.slotDuration,
    booked,
  });

  if (date === toDateString()) {
    slots = slots.filter((slot) => !isPastSlot(date, slot.startTime));
  }

  if (date < toDateString()) {
    slots = [];
  }

  res.json({
    success: true,
    data: {
      slots,
      date,
      slotDuration: availability.slotDuration,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee,
      },
    },
  });
});

const getMyAvailability = asyncHandler(async (req, res) => {
  let availability = await DoctorAvailability.findOne({ doctor: req.user._id });
  if (!availability) {
    availability = await DoctorAvailability.create({
      doctor: req.user._id,
      weeklySchedule: DoctorAvailability.defaultSchedule(),
    });
  }

  res.json({ success: true, data: { availability } });
});

const updateMyAvailability = asyncHandler(async (req, res) => {
  const { weeklySchedule, slotDuration, blockedDates, timezone } = req.body;

  if (!Array.isArray(weeklySchedule) || weeklySchedule.length !== 7) {
    throw ApiError.badRequest('Weekly schedule must contain all 7 days');
  }

  const seen = new Set();
  for (const day of weeklySchedule) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw ApiError.badRequest('Each schedule entry needs a valid day of week');
    }
    if (seen.has(day.dayOfWeek)) {
      throw ApiError.badRequest('Each day can only appear once in the schedule');
    }
    seen.add(day.dayOfWeek);

    if (day.isAvailable) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.endTime)) {
        throw ApiError.badRequest('Working hours must be valid times');
      }
      if (day.startTime >= day.endTime) {
        throw ApiError.badRequest('End time must be after start time');
      }
      if (day.breakStart && day.breakEnd) {
        if (day.breakStart !== day.breakEnd) {
          if (day.breakStart >= day.breakEnd) {
            throw ApiError.badRequest('Break end time must be after break start time');
          }
          if (day.breakStart < day.startTime || day.breakEnd > day.endTime) {
            throw ApiError.badRequest('Break time must fall within working hours');
          }
        }
      }
    }
  }

  let availability = await DoctorAvailability.findOne({ doctor: req.user._id });
  if (!availability) {
    availability = new DoctorAvailability({ doctor: req.user._id });
  }

  availability.weeklySchedule = weeklySchedule;
  availability.slotDuration = slotDuration || availability.slotDuration;
  availability.blockedDates = Array.isArray(blockedDates) ? blockedDates.slice(0, 60) : [];
  availability.timezone = timezone || availability.timezone;
  await availability.save();

  res.json({
    success: true,
    message: 'Availability updated successfully',
    data: { availability },
  });
});

const getMyPatients = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ doctor: req.user._id })
    .populate('patient', 'name email phone gender dateOfBirth bloodGroup address emergencyContact')
    .sort({ date: -1, startTime: -1 })
    .lean();

  const map = new Map();

  appointments.forEach((appointment) => {
    if (!appointment.patient) return;
    const id = String(appointment.patient._id);
    if (!map.has(id)) {
      map.set(id, {
        patient: appointment.patient,
        totalVisits: 0,
        completedVisits: 0,
        lastVisit: null,
        nextVisit: null,
        lastReason: '',
        status: 'active',
      });
    }
    const entry = map.get(id);
    entry.totalVisits += 1;
    if (appointment.status === 'completed') {
      entry.completedVisits += 1;
      if (!entry.lastVisit || appointment.date > entry.lastVisit) {
        entry.lastVisit = appointment.date;
        entry.lastReason = appointment.reason;
      }
    }
    if (['pending', 'approved'].includes(appointment.status) && appointment.date >= toDateString()) {
      if (!entry.nextVisit || appointment.date < entry.nextVisit) {
        entry.nextVisit = appointment.date;
      }
    }
  });

  const patientIds = [...map.keys()];
  const recordCounts = await MedicalRecord.aggregate([
    { $match: { patient: { $in: patientIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: '$patient', count: { $sum: 1 } } },
  ]);
  const recordMap = new Map(recordCounts.map((item) => [String(item._id), item.count]));

  const patients = [...map.entries()]
    .map(([id, entry]) => ({
      ...entry,
      recordsCount: recordMap.get(id) || 0,
    }))
    .sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''));

  res.json({ success: true, data: { patients } });
});

const getPatientDetail = asyncHandler(async (req, res) => {
  const hasRelationship = await Appointment.exists({
    doctor: req.user._id,
    patient: req.params.patientId,
  });
  if (!hasRelationship) {
    throw ApiError.forbidden('You can only view patients who have booked an appointment with you');
  }

  const patient = await User.findOne({ _id: req.params.patientId, role: 'patient' }).select(
    '-password'
  );
  if (!patient) throw ApiError.notFound('Patient not found');

  const [appointments, records] = await Promise.all([
    Appointment.find({ doctor: req.user._id, patient: patient._id })
      .sort({ date: -1, startTime: -1 })
      .lean(),
    MedicalRecord.find({ patient: patient._id }).sort({ createdAt: -1 }).select('-file.filename').lean(),
  ]);

  res.json({ success: true, data: { patient, appointments, records } });
});

module.exports = {
  listDoctors,
  getSpecializations,
  getDoctorById,
  getDoctorSlots,
  getMyAvailability,
  updateMyAvailability,
  getMyPatients,
  getPatientDetail,
};
