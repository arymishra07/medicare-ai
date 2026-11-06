const User = require('../models/User');
const DoctorAvailability = require('../models/DoctorAvailability');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { writeAuditLog } = require('../utils/audit');
const { createNotification, notifyAdmins } = require('../services/notificationService');
const { ROLES } = require('../config/constants');

const publicUser = (user) => {
  const object = user.toObject ? user.toObject() : { ...user };
  delete object.password;
  return object;
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = ROLES.PATIENT, phone = '' } = req.body;

  if (![ROLES.PATIENT, ROLES.DOCTOR].includes(role)) {
    throw ApiError.badRequest('You can only register as a patient or a doctor');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Try signing in instead.');
  }

  if (role === ROLES.DOCTOR && !req.body.specialization) {
    throw ApiError.badRequest('Please choose your medical specialization');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role,
    phone,
    specialization: role === ROLES.DOCTOR ? req.body.specialization : '',
    qualification: role === ROLES.DOCTOR ? req.body.qualification || '' : '',
    experienceYears: role === ROLES.DOCTOR ? Number(req.body.experienceYears) || 0 : 0,
    consultationFee: role === ROLES.DOCTOR ? Number(req.body.consultationFee) || 0 : 0,
    hospital: role === ROLES.DOCTOR ? req.body.hospital || '' : '',
    location: role === ROLES.DOCTOR ? req.body.location || '' : '',
    bio: role === ROLES.DOCTOR ? req.body.bio || '' : '',
    isVerified: role === ROLES.DOCTOR ? false : true,
  });

  if (role === ROLES.DOCTOR) {
    await DoctorAvailability.create({
      doctor: user._id,
      weeklySchedule: DoctorAvailability.defaultSchedule(),
    });
    await notifyAdmins(User, {
      title: 'New doctor registration',
      message: `${user.name} registered as a ${user.specialization} specialist and is awaiting verification.`,
      type: 'system',
      link: '/admin/doctors',
    });
  }

  await createNotification({
    userId: user._id,
    title: `Welcome to MediCare AI, ${user.name.split(' ')[0]}!`,
    message:
      role === ROLES.DOCTOR
        ? 'Your account is ready. An administrator will verify your profile before it appears in the doctor directory.'
        : 'Your health workspace is ready. Book appointments, track medicines and upload medical reports securely.',
    type: 'system',
    link: role === ROLES.DOCTOR ? '/doctor/dashboard' : '/patient/dashboard',
  });

  req.user = user;
  await writeAuditLog(req, {
    action: 'AUTH_REGISTER',
    targetType: 'User',
    targetId: user._id,
    description: `${role} account created`,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { token: signToken(user), user: publicUser(user) },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  req.user = user;
  await writeAuditLog(req, {
    action: 'AUTH_LOGIN',
    targetType: 'User',
    targetId: user._id,
    description: 'User signed in',
  });

  res.json({
    success: true,
    message: 'Welcome back',
    data: { token: signToken(user), user: publicUser(user) },
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

const logout = asyncHandler(async (req, res) => {
  await writeAuditLog(req, {
    action: 'AUTH_LOGOUT',
    targetType: 'User',
    targetId: req.user._id,
    description: 'User signed out',
  });
  res.json({ success: true, message: 'Signed out successfully' });
});

const getSessionSummary = asyncHandler(async (req, res) => {
  const [unreadNotifications, availability] = await Promise.all([
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    req.user.role === ROLES.DOCTOR
      ? DoctorAvailability.findOne({ doctor: req.user._id }).lean()
      : null,
  ]);

  res.json({
    success: true,
    data: { user: req.user, unreadNotifications, availability },
  });
});

module.exports = { register, login, getMe, logout, getSessionSummary };
