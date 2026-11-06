const express = require('express');
const { param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadReport } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiters');
const {
  createRecord,
  listRecords,
  downloadRecord,
  getRecordById,
  deleteRecord,
} = require('../controllers/recordController');

const router = express.Router();

router.use(protect);

router.get('/', listRecords);

router.post('/', authorize('patient'), uploadLimiter, uploadReport, createRecord);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid report id')],
  validate,
  getRecordById
);

router.get(
  '/:id/download',
  [param('id').isMongoId().withMessage('Invalid report id')],
  validate,
  downloadRecord
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid report id')],
  validate,
  deleteRecord
);

module.exports = router;
