const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateProfile, changePassword } = require('../controllers/userController');

const router = express.Router();

router.use(protect);

router.patch(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('phone').optional().trim().isLength({ max: 25 }),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
    body('dateOfBirth').optional({ nullable: true }).isISO8601(),
    body('address').optional().trim().isLength({ max: 250 }),
    body('bloodGroup').optional().isIn(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('emergencyContact').optional().trim().isLength({ max: 30 }),
    body('experienceYears').optional().isInt({ min: 0, max: 60 }),
    body('consultationFee').optional().isFloat({ min: 0, max: 100000 }),
    body('bio').optional().trim().isLength({ max: 800 }),
  ],
  validate,
  updateProfile
);

router.patch(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8, max: 72 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Za-z]/)
      .withMessage('New password must include a letter')
      .matches(/\d/)
      .withMessage('New password must include a number'),
  ],
  validate,
  changePassword
);

module.exports = router;
