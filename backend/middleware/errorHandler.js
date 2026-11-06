const multer = require('multer');
const ApiError = require('../utils/apiError');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Please check the highlighted fields';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    if (err.keyPattern?.doctor && err.keyPattern?.date) {
      message = 'That time slot has just been booked by another patient. Please choose another slot.';
    } else {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      message = `A record with that ${field} already exists`;
    }
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. Maximum size is ${Math.round((Number(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024)}MB.`
        : err.message;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed request body';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = { notFound, errorHandler };
