const mongoose = require('mongoose');
const { MEDICINE_LOG_STATUS } = require('../config/constants');

const medicineLogSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Log date must be YYYY-MM-DD'],
    },
    time: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Log time must be HH:MM'],
    },
    status: {
      type: String,
      enum: Object.values(MEDICINE_LOG_STATUS),
      required: true,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const medicineSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: 120,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
      maxlength: 80,
    },
    frequency: {
      type: String,
      enum: ['Once daily', 'Twice daily', 'Three times daily', 'Weekly', 'As needed'],
      default: 'Once daily',
    },
    times: {
      type: [String],
      validate: {
        validator(times) {
          return (
            Array.isArray(times) &&
            times.length > 0 &&
            times.length <= 6 &&
            times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
          );
        },
        message: 'Provide between 1 and 6 valid reminder times (HH:MM)',
      },
      required: true,
    },
    startDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'],
    },
    endDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    color: {
      type: String,
      enum: ['teal', 'blue', 'green', 'violet', 'amber', 'rose'],
      default: 'teal',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    logs: {
      type: [medicineLogSchema],
      default: [],
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

medicineSchema.index({ user: 1, isActive: 1 });
medicineSchema.index({ 'logs.date': 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
