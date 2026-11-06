const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

const ROLE_VALUES = Object.values(ROLES);

const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUS);

const ACTIVE_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.APPROVED,
];

const MEDICINE_LOG_STATUS = {
  TAKEN: 'taken',
  SKIPPED: 'skipped',
};

const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Gynecology',
  'Psychiatry',
  'Dentistry',
  'Ophthalmology',
  'Endocrinology',
  'ENT',
  'Gastroenterology',
  'Pulmonology',
];

const REPORT_TYPES = [
  'Lab Report',
  'Blood Test',
  'Radiology',
  'Prescription',
  'Discharge Summary',
  'Vaccination',
  'Other',
];

const NOTIFICATION_TYPES = [
  'appointment',
  'medicine',
  'report',
  'system',
  'message',
];

const ALLOWED_REPORT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

module.exports = {
  ROLES,
  ROLE_VALUES,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_VALUES,
  ACTIVE_APPOINTMENT_STATUSES,
  MEDICINE_LOG_STATUS,
  SPECIALIZATIONS,
  REPORT_TYPES,
  NOTIFICATION_TYPES,
  ALLOWED_REPORT_MIME_TYPES,
  WEEK_DAYS,
};
