const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { chatLimiter } = require('../middleware/rateLimiters');
const {
  getHistory,
  sendMessage,
  clearHistory,
  getSuggestions,
} = require('../controllers/chatController');

const router = express.Router();

router.use(protect, authorize('patient'));

router.get('/history', getHistory);
router.get('/suggestions', getSuggestions);
router.delete('/history', clearHistory);
router.post(
  '/message',
  chatLimiter,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Please enter a message (maximum 2000 characters)'),
  ],
  validate,
  sendMessage
);

module.exports = router;
