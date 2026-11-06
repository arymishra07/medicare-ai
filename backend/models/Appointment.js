const mongoose = require('mongoose');
const {
  APPOINTMENT_STATUS_VALUES,
  APPOINTMENT_STATUS,
} = require('../config/constants');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD (kept as string for reliable slot uniqueness)
      required: [true, 'Appointment date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be HH:MM'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:MM'],
    },
    reason: {
      type: String,
      required: [true, 'Please describe the reason for your visit'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    symptoms: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUS_VALUES,
      default: APPOINTMENT_STATUS.PENDING,
      index: true,
    },
    type: {
      type: String,
      enum: ['in-person', 'video'],
      default: 'in-person',
    },
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    statusHistory: [
      {
        status: { type: String, enum: APPOINTMENT_STATUS_VALUES },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * A doctor cannot have two active appointments in the same slot.
 * Partial index frees the slot when an appointment is rejected/cancelled.
 */
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } },
    name: 'unique_active_doctor_slot',
  }
);

appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
