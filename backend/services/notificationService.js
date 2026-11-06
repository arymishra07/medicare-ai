const Notification = require('../models/Notification');

const createNotification = async ({ userId, title, message, type = 'system', link = '' }) => {
  try {
    if (!userId) return null;
    return await Notification.create({ user: userId, title, message, type, link });
  } catch (error) {
    console.warn('[notification] Failed to create notification:', error.message);
    return null;
  }
};

const notifyAdmins = async (User, payload) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    await Promise.all(admins.map((admin) => createNotification({ ...payload, userId: admin._id })));
  } catch (error) {
    console.warn('[notification] Failed to notify admins:', error.message);
  }
};

module.exports = { createNotification, notifyAdmins };
