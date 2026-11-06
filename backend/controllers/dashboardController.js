const Appointment = require('../models/Appointment');
const Medicine = require('../models/Medicine');
const MedicalRecord = require('../models/MedicalRecord');
const Notification = require('../models/Notification');
const User = require('../models/User');
const DoctorAvailability = require('../models/DoctorAvailability');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const {
  toDateString,
  buildLastNDays,
  buildLastNMonths,
} = require('../utils/date');
const {
  buildDoseSchedule,
  buildAdherence,
} = require('../services/medicineService');

const shortDay = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

const patientDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = toDateString();
  const days = buildLastNDays(7);

  const [
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    medicines,
    recentReports,
    reportCount,
    unreadNotifications,
  ] = await Promise.all([
    Appointment.countDocuments({ patient: userId }),
    Appointment.countDocuments({
      patient: userId,
      date: { $gte: today },
      status: { $in: ['pending', 'approved'] },
    }),
    Appointment.countDocuments({ patient: userId, status: 'completed' }),
    Medicine.find({ user: userId }),
    MedicalRecord.find({ patient: userId })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('-file.filename'),
    MedicalRecord.countDocuments({ patient: userId }),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  const upcoming = await Appointment.find({
    patient: userId,
    date: { $gte: today },
    status: { $in: ['pending', 'approved'] },
  })
    .populate('doctor', 'name specialization hospital location consultationFee rating')
    .sort({ date: 1, startTime: 1 })
    .limit(4);

  const activityAppointments = await Appointment.find({
    patient: userId,
    date: { $in: days },
  }).select('date status');

  const activityMap = new Map(
    days.map((date) => [date, { date, appointments: 0, dosesTaken: 0 }])
  );

  activityAppointments.forEach((appointment) => {
    const entry = activityMap.get(appointment.date);
    if (entry) entry.appointments += 1;
  });

  medicines.forEach((medicine) => {
    medicine.logs.forEach((log) => {
      const entry = activityMap.get(log.date);
      if (entry && log.status === 'taken') entry.dosesTaken += 1;
    });
  });

  const activity = days.map((date) => ({
    ...activityMap.get(date),
    day: shortDay(date),
  }));

  const activeMedicines = medicines.filter(
    (medicine) =>
      medicine.isActive && medicine.startDate <= today && medicine.endDate >= today
  );

  res.json({
    success: true,
    data: {
      stats: {
        totalAppointments,
        upcomingAppointments,
        completedAppointments,
        activeMedicines: activeMedicines.length,
        totalReports: reportCount,
        unreadNotifications,
        adherence: buildAdherence(medicines, 7),
      },
      upcomingAppointmentsList: upcoming,
      todaySchedule: buildDoseSchedule(medicines, today),
      recentReports,
      activity,
      healthTip:
        'Small, consistent habits matter. A 20-minute walk, hydration and a consistent sleep schedule support long-term health.',
    },
  });
});

const doctorDashboard = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const today = toDateString();
  const days = buildLastNDays(7);

  const [
    todaysAppointments,
    pendingRequests,
    totalPatients,
    completedAppointments,
    totalAppointments,
    availability,
    recentPending,
  ] = await Promise.all([
    Appointment.find({ doctor: doctorId, date: today })
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup')
      .sort({ startTime: 1 }),
    Appointment.countDocuments({ doctor: doctorId, status: 'pending' }),
    Appointment.distinct('patient', { doctor: doctorId }),
    Appointment.countDocuments({ doctor: doctorId, status: 'completed' }),
    Appointment.countDocuments({ doctor: doctorId }),
    DoctorAvailability.findOne({ doctor: doctorId }).lean(),
    Appointment.find({ doctor: doctorId, status: 'pending' })
      .populate('patient', 'name email phone gender')
      .sort({ date: 1, startTime: 1 })
      .limit(5),
  ]);

  const weeklyAppointments = await Appointment.find({
    doctor: doctorId,
    date: { $in: days },
  }).select('date status');

  const weeklyMap = new Map(days.map((date) => [date, 0]));
  weeklyAppointments.forEach((appointment) => {
    if (weeklyMap.has(appointment.date)) {
      weeklyMap.set(appointment.date, weeklyMap.get(appointment.date) + 1);
    }
  });

  const weekly = days.map((date) => ({
    date,
    day: shortDay(date),
    appointments: weeklyMap.get(date) || 0,
  }));

  const uniquePatients = await Appointment.aggregate([
    { $match: { doctor: doctorId } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$patient',
        lastDate: { $first: '$date' },
        visits: { $sum: 1 },
      },
    },
    { $sort: { lastDate: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'patient',
      },
    },
    { $unwind: '$patient' },
    {
      $project: {
        _id: 0,
        patient: {
          _id: '$patient._id',
          name: '$patient.name',
          email: '$patient.email',
          phone: '$patient.phone',
        },
        lastDate: 1,
        visits: 1,
      },
    },
  ]);

  const todayAvailability = availability?.weeklySchedule?.find(
    (day) => day.dayOfWeek === new Date(`${today}T00:00:00`).getDay()
  );

  const revenue = await Appointment.aggregate([
    { $match: { doctor: doctorId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        todaysAppointments: todaysAppointments.length,
        pendingRequests,
        totalPatients: totalPatients.length,
        completedAppointments,
        totalAppointments,
        estimatedEarnings: (revenue[0]?.total || 0) * (req.user.consultationFee || 0),
        rating: req.user.rating,
      },
      todaysAppointments,
      pendingRequestsList: recentPending,
      weekly,
      recentPatients: uniquePatients,
      todayAvailability: todayAvailability || null,
    },
  });
});

const adminDashboard = asyncHandler(async (req, res) => {
  const today = toDateString();
  const months = buildLastNMonths(6);

  const [
    totalPatients,
    totalDoctors,
    totalAppointments,
    pendingAppointments,
    pendingDoctors,
    todaysAppointments,
    statusDistribution,
    specialtyDistribution,
    recentAppointments,
    recentUsers,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({ role: 'patient' }),
    User.countDocuments({ role: 'doctor' }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'doctor', isVerified: false }),
    Appointment.countDocuments({ date: today }),
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { role: 'doctor', isVerified: true } },
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Appointment.find()
      .populate('patient', 'name email')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 })
      .limit(6),
    User.find()
      .select('name email role isVerified isActive createdAt specialization')
      .sort({ createdAt: -1 })
      .limit(5),
    AuditLog.find().sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const monthlyRegistrations = await User.aggregate([
    {
      $match: {
        role: { $in: ['patient', 'doctor'] },
        createdAt: { $gte: months[0].start },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          role: '$role',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyAppointments = await Appointment.aggregate([
    { $match: { createdAt: { $gte: months[0].start } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);

  const trend = months.map((month) => {
    const keyMatches = (item) => item._id.year === month.year && item._id.month === month.month;
    const patients = monthlyRegistrations.find((item) => keyMatches(item) && item._id.role === 'patient');
    const doctors = monthlyRegistrations.find((item) => keyMatches(item) && item._id.role === 'doctor');
    const appointments = monthlyAppointments.find((item) => keyMatches(item));
    return {
      month: month.label,
      year: month.year,
      patients: patients?.count || 0,
      doctors: doctors?.count || 0,
      appointments: appointments?.count || 0,
    };
  });

  const statusColors = {
    pending: '#f59e0b',
    approved: '#0d9488',
    completed: '#22c55e',
    rejected: '#f97316',
    cancelled: '#94a3b8',
  };

  const statusData = Object.entries(statusColors).map(([name, color]) => {
    const found = statusDistribution.find((item) => item._id === name);
    return { name, value: found?.count || 0, color };
  });

  const totalRevenue = await Appointment.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: {
        from: 'users',
        localField: 'doctor',
        foreignField: '_id',
        as: 'doctorInfo',
      },
    },
    { $unwind: '$doctorInfo' },
    {
      $group: {
        _id: null,
        total: { $sum: '$doctorInfo.consultationFee' },
      },
    },
  ]);

  const previousMonth = trend[trend.length - 2]?.appointments || 0;
  const currentMonth = trend[trend.length - 1]?.appointments || 0;
  const appointmentGrowth =
    previousMonth === 0
      ? currentMonth > 0
        ? 100
        : 0
      : Math.round(((currentMonth - previousMonth) / previousMonth) * 100);

  res.json({
    success: true,
    data: {
      stats: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        pendingAppointments,
        pendingDoctors,
        todaysAppointments,
        totalRevenue: totalRevenue[0]?.total || 0,
        appointmentGrowth,
      },
      trend,
      statusData,
      specialtyData: specialtyDistribution.map((item) => ({
        name: item._id || 'Unassigned',
        value: item.count,
      })),
      recentAppointments,
      recentUsers,
      recentAuditLogs,
    },
  });
});

module.exports = { patientDashboard, doctorDashboard, adminDashboard };
