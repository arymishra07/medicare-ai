const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

const protect = asyncHandler(async (req, _res, next) => {
  let token = null;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Please sign in to access this resource');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Your session is invalid or has expired. Please sign in again.');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    throw ApiError.unauthorized('The account linked to this session no longer exists');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  }

  req.user = user;
  return next();
});

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action requires ${roles.join(' or ')} access`));
  }
  return next();
};

module.exports = { protect, authorize };
