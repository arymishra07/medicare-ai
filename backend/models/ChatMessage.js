const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 6000,
    },
    category: {
      type: String,
      enum: ['general', 'symptom', 'emergency', 'medication', 'lifestyle', 'safety'],
      default: 'general',
    },
    flagged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
