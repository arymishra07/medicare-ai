const mongoose = require('mongoose');
const { WEEK_DAYS } = require('../config/constants');

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    weeklySchedule: [
      {
        dayOfWeek: {
          type: Number,
          min: 0,
          max: 6,
          required: true,
        },
        isAvailable: {
          type: Boolean,
          default: false,
        },
        startTime: {
          type: String,
          match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be HH:MM'],
          default: '09:00',
        },
        endTime: {
          type: String,
          match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:MM'],
          default: '17:00',
        },
        breakStart: {
          type: String,
          match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Break start must be HH:MM'],
          default: '13:00',
        },
        breakEnd: {
          type: String,
          match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Break end must be HH:MM'],
          default: '14:00',
        },
      },
    ],
    slotDuration: {
      type: Number,
      enum: [15, 20, 30, 45, 60],
      default: 30,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    blockedDates: [
      {
        date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
        reason: { type: String, default: '', maxlength: 200 },
      },
    ],
  },
  { timestamps: true }
);

/**
 * Builds a default Monday-Friday 9-5 schedule for new doctors.
 */
doctorAvailabilitySchema.statics.defaultSchedule = function defaultSchedule() {
  return WEEK_DAYS.map((_day, dayOfWeek) => ({
    dayOfWeek,
    isAvailable: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
  }));
};

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
