const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  getUpcomingCount,
} = require('../controllers/appointmentController');

const router = express.Router();

router.use(protect);

router.get('/upcoming-count', getUpcomingCount);

router.get('/', listAppointments);

router.post(
  '/',
  authorize('patient'),
  [
    body('doctorId').isMongoId().withMessage('Please select a doctor'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Please choose a valid date'),
    body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Please choose a valid time'),
    body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Please describe your reason (5–500 characters)'),
    body('symptoms').optional().trim().isLength({ max: 500 }),
    body('type').optional().isIn(['in-person', 'video']),
  ],
  validate,
  createAppointment
);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid appointment id')],
  validate,
  getAppointmentById
);

router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid appointment id'),
    body('status')
      .isIn(['pending', 'approved', 'rejected', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    body('note').optional().trim().isLength({ max: 1000 }),
    body('cancellationReason').optional().trim().isLength({ max: 400 }),
  ],
  validate,
  updateAppointmentStatus
);

router.put(
  '/:id/reschedule',
  [
    param('id').isMongoId().withMessage('Invalid appointment id'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Please choose a valid date'),
    body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Please choose a valid time'),
  ],
  validate,
  rescheduleAppointment
);

module.exports = router;
