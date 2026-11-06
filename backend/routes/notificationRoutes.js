const express = require('express');
const { param } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Invalid notification id')],
  validate,
  markRead
);
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid notification id')],
  validate,
  deleteNotification
);

module.exports = router;
