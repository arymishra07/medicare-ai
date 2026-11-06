const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listMedicines,
  getTodaySchedule,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  logDose,
  getMedicineStats,
} = require('../controllers/medicineController');

const router = express.Router();

router.use(protect, authorize('patient'));

router.get('/', listMedicines);
router.get('/today', getTodaySchedule);
router.get('/stats', getMedicineStats);

const medicineRules = ({ optional = false } = {}) => {
  const chain = (validator) => (optional ? validator.optional() : validator);

  return [
    chain(body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Medicine name is required')),
    chain(body('dosage').trim().isLength({ min: 1, max: 80 }).withMessage('Dosage is required')),
    chain(body('times').isArray({ min: 1, max: 6 }).withMessage('Add 1–6 reminder times')),
    chain(body('startDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid start date')),
    chain(body('endDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid end date')),
    chain(
      body('frequency')
        .isIn(['Once daily', 'Twice daily', 'Three times daily', 'Weekly', 'As needed'])
    ),
    chain(body('instructions').trim().isLength({ max: 300 })),
    chain(body('color').isIn(['teal', 'blue', 'green', 'violet', 'amber', 'rose'])),
    chain(body('isActive').isBoolean()),
    chain(body('notificationsEnabled').isBoolean()),
  ];
};

router.post('/', medicineRules(), validate, createMedicine);

router.put(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid medicine id'), ...medicineRules({ optional: true })],
  validate,
  updateMedicine
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid medicine id')],
  validate,
  deleteMedicine
);

router.post(
  '/:id/log',
  [
    param('id').isMongoId().withMessage('Invalid medicine id'),
    body('time').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid reminder time'),
    body('status').isIn(['taken', 'skipped']).withMessage('Invalid dose status'),
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  validate,
  logDose
);

module.exports = router;
