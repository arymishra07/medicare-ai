const mongoose = require('mongoose');
const { REPORT_TYPES, ALLOWED_REPORT_MIME_TYPES } = require('../config/constants');

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: 150,
    },
    type: {
      type: String,
      enum: REPORT_TYPES,
      default: 'Lab Report',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    recordDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Record date must be YYYY-MM-DD'],
      default: () => new Date().toISOString().slice(0, 10),
    },
    file: {
      originalName: { type: String, required: true },
      filename: { type: String, required: true },
      mimeType: {
        type: String,
        enum: ALLOWED_REPORT_MIME_TYPES,
        required: true,
      },
      size: { type: Number, required: true },
    },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
