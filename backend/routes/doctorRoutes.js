const express = require('express');
const { param, query, body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listDoctors,
  getSpecializations,
  getDoctorById,
  getDoctorSlots,
  getMyAvailability,
  updateMyAvailability,
  getMyPatients,
  getPatientDetail,
} = require('../controllers/doctorController');

const router = express.Router();

router.use(protect);

router.get('/specializations', getSpecializations);

router.get('/me/availability', authorize('doctor'), getMyAvailability);
router.put(
  '/me/availability',
  authorize('doctor'),
  [
    body('weeklySchedule').isArray({ min: 7, max: 7 }).withMessage('All 7 days are required'),
    body('slotDuration').optional().isIn([15, 20, 30, 45, 60]),
    body('blockedDates').optional().isArray({ max: 60 }),
  ],
  validate,
  updateMyAvailability
);

router.get('/me/patients', authorize('doctor'), getMyPatients);
router.get(
  '/me/patients/:patientId',
  authorize('doctor'),
  [param('patientId').isMongoId().withMessage('Invalid patient id')],
  validate,
  getPatientDetail
);

router.get('/', listDoctors);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid doctor id')],
  validate,
  getDoctorById
);

router.get(
  '/:id/slots',
  [
    param('id').isMongoId().withMessage('Invalid doctor id'),
    query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
  ],
  validate,
  getDoctorSlots
);

module.exports = router;
