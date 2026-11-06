const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    Notification.countDocuments({ user: req.user._id }),
  ]);

  res.json({
    success: true,
    data: { notifications, unreadCount, total },
  });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) throw ApiError.notFound('Notification not found');

  notification.isRead = true;
  await notification.save();

  res.json({ success: true, message: 'Notification marked as read' });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) throw ApiError.notFound('Notification not found');
  res.json({ success: true, message: 'Notification removed' });
});

module.exports = { listNotifications, markRead, markAllRead, deleteNotification };
