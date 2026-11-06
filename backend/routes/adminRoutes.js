const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listUsers,
  updateUser,
  deleteUser,
  listDoctorsWithStats,
  getAuditLogs,
  getAdminAnalytics,
} = require('../controllers/adminController');
const {
  listAppointments,
  updateAppointmentStatus,
} = require('../controllers/appointmentController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/users', listUsers);
router.patch(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('phone').optional().trim().isLength({ max: 25 }),
    body('isActive').optional().isBoolean(),
    body('isVerified').optional().isBoolean(),
    body('experienceYears').optional().isInt({ min: 0, max: 60 }),
    body('consultationFee').optional().isFloat({ min: 0, max: 100000 }),
    body('bio').optional().trim().isLength({ max: 800 }),
  ],
  validate,
  updateUser
);
router.delete(
  '/users/:id',
  [param('id').isMongoId().withMessage('Invalid user id')],
  validate,
  deleteUser
);

router.get('/doctors', listDoctorsWithStats);

router.get('/appointments', listAppointments);
router.patch(
  '/appointments/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid appointment id'),
    body('status').isIn(['pending', 'approved', 'rejected', 'completed', 'cancelled']),
  ],
  validate,
  updateAppointmentStatus
);

router.get('/audit-logs', getAuditLogs);
router.get(
  '/analytics',
  [query('range').optional().isInt({ min: 1, max: 365 })],
  validate,
  getAdminAnalytics
);

module.exports = router;
