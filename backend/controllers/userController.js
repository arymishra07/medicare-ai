const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAuditLog } = require('../utils/audit');
const { ROLES } = require('../config/constants');

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'name',
    'phone',
    'gender',
    'dateOfBirth',
    'address',
    'bloodGroup',
    'emergencyContact',
  ];

  if (req.user.role === ROLES.DOCTOR) {
    allowed.push(
      'specialization',
      'qualification',
      'experienceYears',
      'consultationFee',
      'bio',
      'hospital',
      'location'
    );
  }

  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (!Object.keys(updates).length) {
    throw ApiError.badRequest('No valid profile fields were provided');
  }

  Object.assign(req.user, updates);
  await req.user.save();

  await writeAuditLog(req, {
    action: 'PROFILE_UPDATE',
    targetType: 'User',
    targetId: req.user._id,
    description: 'Profile details updated',
    metadata: { fields: Object.keys(updates) },
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: req.user },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  const sameAsOld = await user.comparePassword(newPassword);
  if (sameAsOld) {
    throw ApiError.badRequest('Your new password must be different from your current password');
  }

  user.password = newPassword;
  await user.save();

  await writeAuditLog(req, {
    action: 'PASSWORD_CHANGE',
    targetType: 'User',
    targetId: user._id,
    description: 'Password changed',
  });

  res.json({ success: true, message: 'Password changed successfully' });
});

const getDoctorsDirectoryContext = asyncHandler(async (req, res) => {
  // Lightweight helper used by the profile screen for doctor role context.
  res.json({ success: true, data: { role: req.user.role } });
});

module.exports = { updateProfile, changePassword, getDoctorsDirectoryContext };
