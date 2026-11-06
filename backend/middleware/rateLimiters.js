const rateLimit = require('express-rate-limit');

const standardize = (message) => ({
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message,
  },
});

const apiLimiter = rateLimit({
  ...standardize('Too many requests. Please slow down and try again shortly.'),
  max: Number(process.env.RATE_LIMIT_MAX) || 600,
});

const authLimiter = rateLimit({
  ...standardize('Too many authentication attempts. Please try again in 15 minutes.'),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 40,
});

const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.CHAT_RATE_LIMIT_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have reached the chat limit for now. Please try again in a few minutes.',
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload limit reached. Please try again later.',
  },
});

module.exports = { apiLimiter, authLimiter, chatLimiter, uploadLimiter };
