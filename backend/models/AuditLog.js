const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'system' },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['User', 'Appointment', 'Medicine', 'MedicalRecord', 'ChatMessage', 'System'],
      default: 'System',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
