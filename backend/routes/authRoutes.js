const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  register,
  login,
  getMe,
  logout,
  getSessionSummary,
} = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
    body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('password')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Za-z]/)
      .withMessage('Password must include a letter')
      .matches(/\d/)
      .withMessage('Password must include a number'),
    body('role').optional().isIn(['patient', 'doctor']).withMessage('Invalid account type'),
    body('phone').optional().trim().isLength({ max: 25 }),
    body('specialization').optional().trim().isLength({ max: 80 }),
    body('qualification').optional().trim().isLength({ max: 150 }),
    body('experienceYears').optional().isInt({ min: 0, max: 60 }),
    body('consultationFee').optional().isFloat({ min: 0, max: 100000 }),
    body('hospital').optional().trim().isLength({ max: 150 }),
    body('location').optional().trim().isLength({ max: 100 }),
    body('bio').optional().trim().isLength({ max: 800 }),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', protect, getMe);
router.get('/session', protect, getSessionSummary);
router.post('/logout', protect, logout);

module.exports = router;
