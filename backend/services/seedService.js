const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Medicine = require('../models/Medicine');
const MedicalRecord = require('../models/MedicalRecord');
const ChatMessage = require('../models/ChatMessage');
const DoctorAvailability = require('../models/DoctorAvailability');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { toDateString, addDays } = require('../utils/date');

const DOCTORS = [
  {
    name: 'Dr. Arjun Sharma',
    email: 'dr.arjun@medicare.ai',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD (Cardiology)',
    experienceYears: 14,
    consultationFee: 900,
    hospital: 'Apollo Heart Institute',
    location: 'Bengaluru',
    rating: 4.9,
    reviewsCount: 312,
    phone: '+91 98450 11223',
    bio: 'Interventional cardiologist focused on preventive heart care, hypertension and complex coronary disease.',
  },
  {
    name: 'Dr. Meera Iyer',
    email: 'dr.meera@medicare.ai',
    specialization: 'Dermatology',
    qualification: 'MBBS, MD (Dermatology)',
    experienceYears: 9,
    consultationFee: 700,
    hospital: 'Skin & Soul Clinic',
    location: 'Mumbai',
    rating: 4.8,
    reviewsCount: 204,
    phone: '+91 98201 44556',
    bio: 'Treats acne, pigmentation, eczema and hair loss with a practical, evidence-based approach.',
  },
  {
    name: 'Dr. Rohan Kapoor',
    email: 'dr.rohan@medicare.ai',
    specialization: 'Pediatrics',
    qualification: 'MBBS, DCH, DNB (Pediatrics)',
    experienceYears: 11,
    consultationFee: 650,
    hospital: "Rainbow Children's Hospital",
    location: 'New Delhi',
    rating: 4.9,
    reviewsCount: 268,
    phone: '+91 98110 77889',
    bio: 'Paediatrician with a special interest in newborn care, childhood nutrition and asthma.',
  },
  {
    name: 'Dr. Sana Khan',
    email: 'dr.sana@medicare.ai',
    specialization: 'Neurology',
    qualification: 'MBBS, DM (Neurology)',
    experienceYears: 12,
    consultationFee: 1000,
    hospital: 'NeuroCare Centre',
    location: 'Bengaluru',
    rating: 4.8,
    reviewsCount: 187,
    phone: '+91 99001 33445',
    bio: 'Neurologist treating migraine, epilepsy, stroke rehabilitation and movement disorders.',
  },
  {
    name: 'Dr. Vikram Rao',
    email: 'dr.vikram@medicare.ai',
    specialization: 'General Medicine',
    qualification: 'MBBS, MD (Internal Medicine)',
    experienceYears: 8,
    consultationFee: 500,
    hospital: 'CityCare Clinic',
    location: 'Pune',
    rating: 4.7,
    reviewsCount: 355,
    phone: '+91 97654 22110',
    bio: 'Internal medicine physician for adult primary care, infections, diabetes and preventive health.',
  },
  {
    name: 'Dr. Ananya Das',
    email: 'dr.ananya@medicare.ai',
    specialization: 'Gynecology',
    qualification: 'MBBS, MS (Obstetrics & Gynecology)',
    experienceYears: 10,
    consultationFee: 800,
    hospital: 'Motherhood Women’s Hospital',
    location: 'Kolkata',
    rating: 4.8,
    reviewsCount: 223,
    phone: '+91 98300 66778',
    bio: 'Women’s health specialist supporting pregnancy care, PCOS and preventive gynaecology.',
  },
];

const PATIENTS = [
  {
    name: 'Priya Sharma',
    email: 'patient@medicare.ai',
    phone: '+91 98765 43210',
    gender: 'female',
    dateOfBirth: new Date('1994-06-18'),
    bloodGroup: 'O+',
    address: '24, Palm Grove Road, Indiranagar, Bengaluru',
    emergencyContact: '+91 98765 00011',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    phone: '+91 99887 66554',
    gender: 'male',
    dateOfBirth: new Date('1988-02-11'),
    bloodGroup: 'B+',
    address: '12 Lake View Apartments, Powai, Mumbai',
  },
  {
    name: 'Neha Gupta',
    email: 'neha@example.com',
    phone: '+91 91234 56780',
    gender: 'female',
    dateOfBirth: new Date('1997-11-30'),
    bloodGroup: 'A+',
    address: '78 Green Park, New Delhi',
  },
  {
    name: 'Kabir Singh',
    email: 'kabir@example.com',
    phone: '+91 90909 12345',
    gender: 'male',
    dateOfBirth: new Date('1980-08-05'),
    bloodGroup: 'AB+',
    address: '5 Hill Road, Bandra West, Mumbai',
  },
  {
    name: 'Anjali Nair',
    email: 'anjali@example.com',
    phone: '+91 88990 11223',
    gender: 'female',
    dateOfBirth: new Date('1991-04-22'),
    bloodGroup: 'O-',
    address: '31 Marine Drive, Kochi',
  },
];

const seedDemoData = async ({ force = false } = {}) => {
  const existing = await User.countDocuments();

  if (existing > 0 && !force) {
    return { skipped: true, message: 'Database already contains users; seed skipped.' };
  }

  if (force) {
    await Promise.all([
      Appointment.deleteMany({}),
      Medicine.deleteMany({}),
      MedicalRecord.deleteMany({}),
      ChatMessage.deleteMany({}),
      DoctorAvailability.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      User.deleteMany({}),
    ]);
    console.log('[seed] Existing collections cleared.');
  }

  const admin = await User.create({
    name: 'Aarav Mehta',
    email: 'admin@medicare.ai',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91 90000 00001',
    gender: 'male',
    isVerified: true,
  });

  const doctors = await User.create(
    DOCTORS.map((doctor) => ({
      ...doctor,
      password: 'Doctor@123',
      role: 'doctor',
      isVerified: true,
    }))
  );

  const patients = await User.create(
    PATIENTS.map((patient) => ({
      ...patient,
      password: 'Patient@123',
      role: 'patient',
      isVerified: true,
    }))
  );

  await DoctorAvailability.create(
    doctors.map((doctor) => ({
      doctor: doctor._id,
      weeklySchedule: DoctorAvailability.defaultSchedule(),
      slotDuration: 30,
    }))
  );

  const today = toDateString();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const inThreeDays = addDays(today, 3);
  const inFiveDays = addDays(today, 5);
  const inNineDays = addDays(today, 9);

  const appointmentSpecs = [
    // Priya's upcoming appointments
    {
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      date: inThreeDays,
      startTime: '10:00',
      endTime: '10:30',
      reason: 'Follow-up for blood pressure review and ECG discussion',
      symptoms: 'Occasional palpitations in the evening',
      status: 'approved',
      type: 'in-person',
    },
    {
      patient: patients[0]._id,
      doctor: doctors[1]._id,
      date: inFiveDays,
      startTime: '15:30',
      endTime: '16:00',
      reason: 'Recurring skin rash on both arms',
      symptoms: 'Itching and mild redness for two weeks',
      status: 'pending',
      type: 'in-person',
    },
    // Today's schedule for doctors
    {
      patient: patients[1]._id,
      doctor: doctors[0]._id,
      date: today,
      startTime: '09:30',
      endTime: '10:00',
      reason: 'Chest discomfort during morning walks',
      symptoms: 'Tightness after 20 minutes of walking',
      status: 'approved',
    },
    {
      patient: patients[2]._id,
      doctor: doctors[4]._id,
      date: today,
      startTime: '11:00',
      endTime: '11:30',
      reason: 'Persistent fever for three days',
      symptoms: 'Fever 101°F, body ache',
      status: 'pending',
    },
    {
      patient: patients[3]._id,
      doctor: doctors[3]._id,
      date: tomorrow,
      startTime: '14:00',
      endTime: '14:30',
      reason: 'Frequent migraines with visual aura',
      symptoms: 'Headache 2–3 times a week',
      status: 'pending',
    },
    {
      patient: patients[4]._id,
      doctor: doctors[2]._id,
      date: tomorrow,
      startTime: '10:30',
      endTime: '11:00',
      reason: 'Child vaccination and growth check',
      status: 'approved',
    },
    // Past completed appointments
    {
      patient: patients[0]._id,
      doctor: doctors[4]._id,
      date: addDays(today, -21),
      startTime: '09:00',
      endTime: '09:30',
      reason: 'Annual health check-up',
      status: 'completed',
      doctorNotes: 'Routine blood work reviewed. Continue current lifestyle plan.',
    },
    {
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      date: addDays(today, -35),
      startTime: '11:30',
      endTime: '12:00',
      reason: 'Initial cardiology consultation',
      status: 'completed',
      doctorNotes: 'ECG normal. Advised home BP monitoring twice daily.',
    },
    {
      patient: patients[1]._id,
      doctor: doctors[0]._id,
      date: addDays(today, -14),
      startTime: '14:30',
      endTime: '15:00',
      reason: 'Post-consultation review',
      status: 'completed',
    },
    {
      patient: patients[2]._id,
      doctor: doctors[1]._id,
      date: addDays(today, -9),
      startTime: '16:00',
      endTime: '16:30',
      reason: 'Treatment review for eczema',
      status: 'completed',
    },
    {
      patient: patients[3]._id,
      doctor: doctors[3]._id,
      date: addDays(today, -4),
      startTime: '12:00',
      endTime: '12:30',
      reason: 'Review of migraine treatment',
      status: 'completed',
    },
    {
      patient: patients[4]._id,
      doctor: doctors[5]._id,
      date: addDays(today, -2),
      startTime: '10:00',
      endTime: '10:30',
      reason: 'Routine women’s health consultation',
      status: 'completed',
    },
    {
      patient: patients[1]._id,
      doctor: doctors[4]._id,
      date: addDays(today, -5),
      startTime: '17:00',
      endTime: '17:30',
      reason: 'Travel health advice',
      status: 'cancelled',
      cancellationReason: 'Schedule conflict',
    },
    {
      patient: patients[2]._id,
      doctor: doctors[2]._id,
      date: inNineDays,
      startTime: '09:00',
      endTime: '09:30',
      reason: 'Fever follow-up for child',
      status: 'pending',
    },
  ];

  await Appointment.create(
    appointmentSpecs.map((spec) => ({
      ...spec,
      statusHistory: [
        {
          status: 'pending',
          changedBy: spec.patient,
          note: 'Appointment requested',
        },
        ...(spec.status !== 'pending'
          ? [
              {
                status: spec.status,
                changedBy: spec.status === 'cancelled' ? spec.patient : doctors[0]._id,
                note: spec.cancellationReason || 'Status updated',
              },
            ]
          : []),
      ],
    }))
  );

  await Medicine.create([
    {
      user: patients[0]._id,
      name: 'Metformin',
      dosage: '500 mg',
      frequency: 'Twice daily',
      times: ['08:00', '20:00'],
      startDate: addDays(today, -20),
      endDate: addDays(today, 40),
      instructions: 'Take after meals with a full glass of water.',
      color: 'teal',
      logs: [
        { date: today, time: '08:00', status: 'taken' },
        { date: yesterday, time: '08:00', status: 'taken' },
        { date: yesterday, time: '20:00', status: 'skipped' },
      ],
    },
    {
      user: patients[0]._id,
      name: 'Amlodipine',
      dosage: '5 mg',
      frequency: 'Once daily',
      times: ['07:30'],
      startDate: addDays(today, -30),
      endDate: addDays(today, 60),
      instructions: 'Take in the morning. Monitor blood pressure weekly.',
      color: 'blue',
      logs: [{ date: today, time: '07:30', status: 'taken' }],
    },
    {
      user: patients[0]._id,
      name: 'Vitamin D3',
      dosage: '1000 IU',
      frequency: 'Once daily',
      times: ['13:00'],
      startDate: addDays(today, -10),
      endDate: addDays(today, 80),
      instructions: 'Take with a meal containing healthy fats.',
      color: 'amber',
      logs: [],
    },
  ]);

  const notifications = [
    {
      user: patients[0]._id,
      title: 'Appointment confirmed',
      message: `Your cardiology appointment with Dr. Arjun Sharma on ${inThreeDays} at 10:00 AM is confirmed.`,
      type: 'appointment',
      link: '/patient/appointments',
    },
    {
      user: patients[0]._id,
      title: 'Medicine reminder',
      message: 'Vitamin D3 is scheduled for 1:00 PM today.',
      type: 'medicine',
      link: '/patient/medicines',
    },
    {
      user: doctors[0]._id,
      title: 'New appointment request',
      message: 'You have a new appointment request from Priya Sharma.',
      type: 'appointment',
      link: '/doctor/appointments',
    },
    {
      user: admin._id,
      title: 'Welcome to MediCare AI',
      message: 'Your admin workspace is ready. Review doctors and monitor platform activity.',
      type: 'system',
      link: '/admin/dashboard',
    },
  ];
  await Notification.create(notifications);

  console.log('[seed] Demo data created successfully.');
  return {
    skipped: false,
    counts: {
      users: 1 + doctors.length + patients.length,
      doctors: doctors.length,
      patients: patients.length,
      appointments: appointmentSpecs.length,
    },
  };
};

const ensureSeedData = async () => {
  const count = await User.countDocuments();
  if (count > 0) return { skipped: true };
  return seedDemoData();
};

module.exports = { seedDemoData, ensureSeedData, DEMO_ACCOUNTS: {
  admin: { email: 'admin@medicare.ai', password: 'Admin@123' },
  doctor: { email: 'dr.arjun@medicare.ai', password: 'Doctor@123' },
  patient: { email: 'patient@medicare.ai', password: 'Patient@123' },
} };
