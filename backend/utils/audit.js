const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit trail helper. Never breaks the main request.
 */
const writeAuditLog = async (req, { action, targetType = 'System', targetId = null, description = '', metadata = {} }) => {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: req.user?.name || 'System',
      actorRole: req.user?.role || 'system',
      action,
      targetType,
      targetId,
      description,
      metadata,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
    });
  } catch (error) {
    console.warn('[audit] Failed to write audit log:', error.message);
  }
};

module.exports = { writeAuditLog };
