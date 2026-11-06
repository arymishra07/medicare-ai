const path = require('path');
const fsPromises = require('fs/promises');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Medicine = require('../models/Medicine');
const MedicalRecord = require('../models/MedicalRecord');
const ChatMessage = require('../models/ChatMessage');
const DoctorAvailability = require('../models/DoctorAvailability');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAuditLog } = require('../utils/audit');
const { createNotification } = require('../services/notificationService');
const { uploadDir } = require('../middleware/upload');

const listUsers = asyncHandler(async (req, res) => {
  const { role, search = '', status, verified, page = 1, limit = 30 } = req.query;

  const filter = {};
  if (role && ['patient', 'doctor', 'admin'].includes(role)) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (verified === 'true') filter.isVerified = true;
  if (verified === 'false') filter.isVerified = false;

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') },
    ];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Number(limit) || 30, 100);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: { page: pageNumber, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
    },
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw ApiError.notFound('User not found');

  if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
    throw ApiError.badRequest('You cannot deactivate your own admin account');
  }

  if (user.role === 'admin' && req.body.isActive === false) {
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: user._id } });
    if (activeAdmins === 0) {
      throw ApiError.badRequest('At least one active administrator is required');
    }
  }

  const allowed = ['name', 'phone', 'isActive', 'gender', 'address', 'emergencyContact'];
  if (user.role === 'doctor') {
    allowed.push(
      'isVerified',
      'specialization',
      'qualification',
      'experienceYears',
      'consultationFee',
      'hospital',
      'location',
      'bio'
    );
  }

  const previousVerified = user.isVerified;
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  await user.save({ validateBeforeSave: false });

  if (user.role === 'doctor' && user.isVerified && previousVerified === false) {
    await createNotification({
      userId: user._id,
      title: 'Professional profile verified',
      message:
        'Your doctor profile has been verified by MediCare AI. Your profile is now visible in the doctor directory.',
      type: 'system',
      link: '/doctor/dashboard',
    });
  }

  if (user.isActive === false) {
    await createNotification({
      userId: user._id,
      title: 'Account deactivated',
      message: 'Your MediCare AI account has been deactivated by an administrator.',
      type: 'system',
    });
  }

  await writeAuditLog(req, {
    action: 'ADMIN_USER_UPDATE',
    targetType: 'User',
    targetId: user._id,
    description: `Updated ${user.role} ${user.name}`,
    metadata: { changes: Object.keys(req.body) },
  });

  res.json({ success: true, message: 'User updated successfully', data: { user } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (String(user._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account from the admin console');
  }

  if (user.role === 'admin') {
    const otherAdmins = await User.countDocuments({ role: 'admin', _id: { $ne: user._id } });
    if (otherAdmins === 0) throw ApiError.badRequest('At least one administrator account is required');
  }

  const records = await MedicalRecord.find({
    $or: [{ patient: user._id }, { uploadedBy: user._id }],
  });

  await Promise.all(
    records.map((record) =>
      fsPromises
        .unlink(path.join(uploadDir, path.basename(record.file.filename)))
        .catch(() => {})
    )
  );

  await Promise.all([
    Appointment.deleteMany({ $or: [{ patient: user._id }, { doctor: user._id }] }),
    Medicine.deleteMany({ user: user._id }),
    MedicalRecord.deleteMany({ $or: [{ patient: user._id }, { uploadedBy: user._id }] }),
    ChatMessage.deleteMany({ user: user._id }),
    DoctorAvailability.deleteMany({ doctor: user._id }),
    Notification.deleteMany({ user: user._id }),
  ]);

  const snapshot = { name: user.name, email: user.email, role: user.role };
  await user.deleteOne();

  await writeAuditLog(req, {
    action: 'ADMIN_USER_DELETE',
    targetType: 'User',
    targetId: user._id,
    description: `Deleted ${snapshot.role} ${snapshot.name}`,
    metadata: snapshot,
  });

  res.json({ success: true, message: 'User and associated data deleted' });
});

const listDoctorsWithStats = asyncHandler(async (req, res) => {
  const { search = '', verified } = req.query;
  const filter = { role: 'doctor' };
  if (verified === 'true') filter.isVerified = true;
  if (verified === 'false') filter.isVerified = false;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') },
    ];
  }

  const doctors = await User.find(filter)
    .select('-password')
    .sort({ isVerified: 1, createdAt: -1 })
    .lean();

  const [appointmentStats, availability] = await Promise.all([
    Appointment.aggregate([
      { $match: { doctor: { $in: doctors.map((doctor) => doctor._id) } } },
      {
        $group: {
          _id: '$doctor',
          totalAppointments: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          patients: { $addToSet: '$patient' },
        },
      },
    ]),
    DoctorAvailability.find({
      doctor: { $in: doctors.map((doctor) => doctor._id) },
    }).lean(),
  ]);

  const statsMap = new Map(appointmentStats.map((item) => [String(item._id), item]));
  const availabilityMap = new Map(availability.map((item) => [String(item.doctor), item]));

  const data = doctors.map((doctor) => {
    const stats = statsMap.get(String(doctor._id));
    const availabilityDoc = availabilityMap.get(String(doctor._id));
    return {
      ...doctor,
      totalAppointments: stats?.totalAppointments || 0,
      completedAppointments: stats?.completed || 0,
      pendingAppointments: stats?.pending || 0,
      totalPatients: stats?.patients?.length || 0,
      availableDays:
        availabilityDoc?.weeklySchedule?.filter((day) => day.isAvailable).map((day) => day.dayOfWeek) || [],
    };
  });

  res.json({ success: true, data: { doctors: data } });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const logs = await AuditLog.find()
    .populate('actor', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: { logs } });
});

const getAdminAnalytics = asyncHandler(async (req, res) => {
  const { range = '30' } = req.query;
  const days = Math.min(Number(range) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [appointmentsByStatus, usersByRole, appointmentsTimeline] = await Promise.all([
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Appointment.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: { appointmentsByStatus, usersByRole, appointmentsTimeline, range: days },
  });
});

module.exports = {
  listUsers,
  updateUser,
  deleteUser,
  listDoctorsWithStats,
  getAuditLogs,
  getAdminAnalytics,
};
