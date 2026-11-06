const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAuditLog } = require('../utils/audit');
const { toDateString } = require('../utils/date');
const { createNotification } = require('../services/notificationService');
const { uploadDir } = require('../middleware/upload');
const { REPORT_TYPES } = require('../config/constants');

const canAccessRecord = async (record, user) => {
  if (user.role === 'admin') return true;
  if (String(record.patient?._id || record.patient) === String(user._id)) return true;
  if (user.role === 'doctor') {
    const relationship = await Appointment.exists({
      doctor: user._id,
      patient: record.patient?._id || record.patient,
    });
    return Boolean(relationship);
  }
  return false;
};

const sanitizeRecord = (record) => {
  const object = record.toObject ? record.toObject() : { ...record };
  delete object.file.filename;
  return object;
};

const createRecord = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please attach a PDF, JPG or PNG report');
  }

  try {
    const { title, type = 'Lab Report', description = '', recordDate, tags } = req.body;

    if (type && !REPORT_TYPES.includes(type)) {
      throw ApiError.badRequest('Invalid report type');
    }

    const tagsArray = Array.isArray(tags)
      ? tags
      : typeof tags === 'string' && tags.trim()
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

    const record = await MedicalRecord.create({
      patient: req.user._id,
      uploadedBy: req.user._id,
      title,
      type,
      description,
      recordDate: recordDate || toDateString(),
      file: {
        originalName: path.basename(req.file.originalname),
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      tags: tagsArray.slice(0, 8),
    });

    await createNotification({
      userId: req.user._id,
      title: 'Medical report uploaded',
      message: `"${record.title}" was added to your secure health records.`,
      type: 'report',
      link: '/patient/reports',
    });

    await writeAuditLog(req, {
      action: 'RECORD_UPLOAD',
      targetType: 'MedicalRecord',
      targetId: record._id,
      description: `Uploaded ${record.title}`,
      metadata: { mimeType: record.file.mimeType, size: record.file.size },
    });

    res.status(201).json({
      success: true,
      message: 'Medical report uploaded securely',
      data: { record: sanitizeRecord(record) },
    });
  } catch (error) {
    await fsPromises.unlink(req.file.path).catch(() => {});
    throw error;
  }
});

const listRecords = asyncHandler(async (req, res) => {
  const filter = { isArchived: false };
  const { search = '', type, patientId } = req.query;

  if (req.user.role === 'patient') {
    filter.patient = req.user._id;
  } else if (req.user.role === 'doctor') {
    const patientIds = await Appointment.distinct('patient', {
      doctor: req.user._id,
      ...(patientId ? { patient: patientId } : {}),
    });
    filter.patient = { $in: patientIds };
  } else if (patientId) {
    filter.patient = patientId;
  }

  if (type) filter.type = type;
  if (search) filter.title = new RegExp(search, 'i');

  const records = await MedicalRecord.find(filter)
    .populate('patient', 'name email phone gender dateOfBirth bloodGroup')
    .sort({ recordDate: -1, createdAt: -1 })
    .limit(100);

  res.json({
    success: true,
    data: { records: records.map(sanitizeRecord) },
  });
});

const downloadRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw ApiError.notFound('Report not found');

  const allowed = await canAccessRecord(record, req.user);
  if (!allowed) {
    throw ApiError.forbidden('You are not authorized to access this medical report');
  }

  const safeFilename = path.basename(record.file.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!filePath.startsWith(uploadDir)) {
    throw ApiError.forbidden('Invalid file path');
  }

  await fsPromises.access(filePath, fs.constants.R_OK).catch(() => {
    throw ApiError.notFound('The report file could not be found on the server');
  });

  await writeAuditLog(req, {
    action: 'RECORD_DOWNLOAD',
    targetType: 'MedicalRecord',
    targetId: record._id,
    description: `Accessed report ${record.title}`,
  });

  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.query.inline === 'true' && record.file.mimeType !== 'application/pdf') {
    res.type(record.file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${record.file.originalName.replace(/["\\]/g, '')}"`
    );
    return fs.createReadStream(filePath).pipe(res);
  }

  return res.download(filePath, record.file.originalName);
});

const getRecordById = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id).populate(
    'patient',
    'name email phone'
  );
  if (!record) throw ApiError.notFound('Report not found');

  const allowed = await canAccessRecord(record, req.user);
  if (!allowed) {
    throw ApiError.forbidden('You are not authorized to access this medical report');
  }

  res.json({ success: true, data: { record: sanitizeRecord(record) } });
});

const deleteRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw ApiError.notFound('Report not found');

  if (req.user.role !== 'admin' && String(record.patient) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only delete your own reports');
  }

  const filePath = path.join(uploadDir, path.basename(record.file.filename));
  await fsPromises.unlink(filePath).catch(() => {});

  await record.deleteOne();

  await writeAuditLog(req, {
    action: 'RECORD_DELETE',
    targetType: 'MedicalRecord',
    targetId: record._id,
    description: `Deleted report ${record.title}`,
  });

  res.json({ success: true, message: 'Medical report deleted' });
});

/**
 * Shared helper for admin/doctor listings that need a patient lookup.
 */
const getPatientsWithRecords = async (req, res) => {
  const patients = await User.find({ role: 'patient', isActive: true })
    .select('name email phone')
    .lean();
  res.json({ success: true, data: { patients } });
};

module.exports = {
  createRecord,
  listRecords,
  downloadRecord,
  getRecordById,
  deleteRecord,
  getPatientsWithRecords,
};
