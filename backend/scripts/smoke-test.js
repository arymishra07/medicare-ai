/**
 * End-to-end API smoke test for MediCare AI.
 *
 * Run the backend first, then execute:
 *   npm run test:api
 *
 * The test creates isolated patient/doctor accounts, exercises the main
 * workflows, and removes the accounts (and their related data) afterwards.
 * The seeded demo data is never modified or deleted.
 */

const BASE_URL = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const STAMP = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const PASSWORD = 'SmokeTest@123';
const NEW_PASSWORD = 'SmokeTest@456';

const createdUserIds = [];
let adminToken = null;
let passed = 0;
let failed = 0;
let currentStep = '';

const colors = process.stdout.isTTY
  ? {
      green: '\x1b[32m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      dim: '\x1b[2m',
      reset: '\x1b[0m',
    }
  : { green: '', red: '', cyan: '', dim: '', reset: '' };

const log = (message) => console.log(`${colors.dim}${message}${colors.reset}`);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertEqual = (actual, expected, label) => {
  assert(
    actual === expected,
    `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
  );
};

const formatDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const nextWeekday = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return formatDate(date);
};

const request = async (
  path,
  { method = 'GET', token, body, formData, expected = 200, raw = false } = {}
) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
  } catch (error) {
    throw new Error(`Could not reach ${BASE_URL}${path}. Is the backend running? ${error.message}`);
  }

  const allowed = Array.isArray(expected) ? expected : [expected];
  const contentType = response.headers.get('content-type') || '';

  if (raw) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!allowed.includes(response.status)) {
      throw new Error(
        `${method} ${path} returned ${response.status} (expected ${allowed.join('/')}); body: ${buffer
          .toString('utf8')
          .slice(0, 500)}`
      );
    }
    return { status: response.status, headers: response.headers, buffer };
  }

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!allowed.includes(response.status)) {
    throw new Error(
      `${method} ${path} returned ${response.status} (expected ${allowed.join('/')}): ${
        json.message || text.slice(0, 500)
      }`
    );
  }

  if (!allowed.includes(response.status) && contentType.includes('json')) {
    // Kept for readability; the check above always runs first.
  }

  return { status: response.status, body: json, headers: response.headers };
};

const step = async (name, fn) => {
  currentStep = name;
  try {
    await fn();
    passed += 1;
    console.log(`${colors.green}PASS${colors.reset}  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`${colors.red}FAIL${colors.reset}  ${name}`);
    console.error(`      ${error.message}`);
    throw error;
  }
};

const login = async (email, password, expected = 200) => {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
    expected,
  });
  return response.body;
};

const cleanup = async () => {
  if (!adminToken) return;

  for (const userId of createdUserIds.slice().reverse()) {
    try {
      await request(`/admin/users/${userId}`, {
        method: 'DELETE',
        token: adminToken,
        expected: [200, 404],
      });
    } catch (error) {
      console.warn(`${colors.dim}Cleanup warning for ${userId}: ${error.message}${colors.reset}`);
    }
  }
};

const run = async () => {
  console.log(`\nMediCare AI API smoke test`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test run: ${STAMP}\n`);

  let patientA;
  let patientB;
  let doctor;
  let patientAToken;
  let patientBToken;
  let doctorToken;
  let appointmentId;
  let secondAppointmentId;
  let slotDate;
  let slots;
  let medicineId;
  let recordId;

  const patientAEmail = `smoke.patient.a.${STAMP}@example.com`;
  const patientBEmail = `smoke.patient.b.${STAMP}@example.com`;
  const doctorEmail = `smoke.doctor.${STAMP}@example.com`;

  try {
    await step('Health check is reachable', async () => {
      const response = await request('/health');
      assertEqual(response.body.success, true, 'success flag');
      assertEqual(response.body.status, 'ok', 'health status');
    });

    await step('Invalid credentials are rejected', async () => {
      const response = await login('nobody@example.com', 'WrongPass123', 401);
      assertEqual(response.success, false, 'success flag');
      assert(response.message, 'an error message is returned');
    });

    await step('Admin can sign in', async () => {
      const response = await login('admin@medicare.ai', 'Admin@123');
      assert(response.data.token, 'token is returned');
      assertEqual(response.data.user.role, 'admin', 'role');
      adminToken = response.data.token;
    });

    await step('Patient registration and profile session work', async () => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Priya Smoke',
          email: patientAEmail,
          password: PASSWORD,
          role: 'patient',
          phone: '+91 90000 10001',
        },
        expected: 201,
      });
      patientA = response.body.data.user;
      patientAToken = response.body.data.token;
      createdUserIds.push(patientA._id);
      assertEqual(patientA.role, 'patient', 'role');
      assertEqual(patientA.isVerified, true, 'patient verification');

      const me = await request('/auth/me', { token: patientAToken });
      assertEqual(me.body.data.user.email, patientAEmail, 'session email');

      const session = await request('/auth/session', { token: patientAToken });
      assertEqual(session.body.data.user._id, patientA._id, 'session user');
      assert(typeof session.body.data.unreadNotifications === 'number', 'unread count');
    });

    await step('Duplicate email registration is rejected', async () => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: { name: 'Duplicate Patient', email: patientAEmail, password: PASSWORD },
        expected: 409,
      });
      assertEqual(response.body.success, false, 'success flag');
    });

    await step('Second patient can register', async () => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Rahul Smoke',
          email: patientBEmail,
          password: PASSWORD,
          role: 'patient',
        },
        expected: 201,
      });
      patientB = response.body.data.user;
      patientBToken = response.body.data.token;
      createdUserIds.push(patientB._id);
    });

    await step('Doctor registration creates an unverified profile', async () => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: {
          name: `Dr. Smoke ${STAMP}`,
          email: doctorEmail,
          password: PASSWORD,
          role: 'doctor',
          specialization: 'General Medicine',
          qualification: 'MBBS, MD',
          experienceYears: 8,
          consultationFee: 500,
          hospital: 'Smoke Test Clinic',
          location: 'Bengaluru',
          bio: 'Temporary account used by the API smoke test.',
        },
        expected: 201,
      });
      doctor = response.body.data.user;
      doctorToken = response.body.data.token;
      createdUserIds.push(doctor._id);
      assertEqual(doctor.role, 'doctor', 'role');
      assertEqual(doctor.isVerified, false, 'new doctors start unverified');
    });

    await step('Unverified doctors stay out of the public directory', async () => {
      const response = await request(`/doctors?search=${encodeURIComponent(STAMP)}`, {
        token: patientAToken,
      });
      assertEqual(response.body.data.doctors.length, 0, 'directory results');
    });

    await step('Admin can verify a doctor', async () => {
      const doctors = await request(`/admin/doctors?search=${encodeURIComponent(STAMP)}`, {
        token: adminToken,
      });
      const pending = doctors.body.data.doctors.find((item) => item._id === doctor._id);
      assert(pending, 'new doctor appears in the admin list');
      assertEqual(pending.isVerified, false, 'admin sees unverified state');

      const response = await request(`/admin/users/${doctor._id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { isVerified: true },
      });
      assertEqual(response.body.data.user.isVerified, true, 'verified state');
    });

    await step('Verified doctor appears in the directory with slots', async () => {
      const directory = await request(`/doctors?search=${encodeURIComponent(STAMP)}`, {
        token: patientAToken,
      });
      const found = directory.body.data.doctors.find((item) => item._id === doctor._id);
      assert(found, 'doctor is visible after verification');
      assertEqual(found.specialization, 'General Medicine', 'specialization');

      slotDate = nextWeekday();
      const slotResponse = await request(`/doctors/${doctor._id}/slots?date=${slotDate}`, {
        token: patientAToken,
      });
      slots = slotResponse.body.data.slots;
      assert(Array.isArray(slots) && slots.length >= 3, 'at least three bookable slots');
    });

    await step('Patient can book an appointment', async () => {
      const response = await request('/appointments', {
        method: 'POST',
        token: patientAToken,
        body: {
          doctorId: doctor._id,
          date: slotDate,
          startTime: slots[0].startTime,
          reason: 'Smoke test consultation for a persistent cough',
          symptoms: 'Dry cough for four days',
          type: 'video',
        },
        expected: 201,
      });
      const appointment = response.body.data.appointment;
      appointmentId = appointment._id;
      assertEqual(appointment.status, 'pending', 'initial status');
      assertEqual(appointment.type, 'video', 'consultation type');
      assert(appointment.doctor?._id === doctor._id, 'doctor populated');
      assert(appointment.patient?._id === patientA._id, 'patient populated');
    });

    await step('Double-booking the same doctor slot is blocked', async () => {
      const response = await request('/appointments', {
        method: 'POST',
        token: patientBToken,
        body: {
          doctorId: doctor._id,
          date: slotDate,
          startTime: slots[0].startTime,
          reason: 'Attempting to book an already reserved slot',
        },
        expected: 409,
      });
      assertEqual(response.body.success, false, 'success flag');
      assert(/already booked/i.test(response.body.message), 'conflict message');
    });

    await step('Another patient can book a different slot', async () => {
      const response = await request('/appointments', {
        method: 'POST',
        token: patientBToken,
        body: {
          doctorId: doctor._id,
          date: slotDate,
          startTime: slots[1].startTime,
          reason: 'Second smoke appointment for a separate time',
        },
        expected: 201,
      });
      secondAppointmentId = response.body.data.appointment._id;
      assert(secondAppointmentId, 'second appointment id');
    });

    await step('Appointment privacy is enforced', async () => {
      const response = await request(`/appointments/${appointmentId}`, {
        token: patientBToken,
        expected: 403,
      });
      assertEqual(response.body.success, false, 'success flag');
    });

    await step('Rescheduling into a booked slot is blocked', async () => {
      const response = await request(`/appointments/${appointmentId}/reschedule`, {
        method: 'PUT',
        token: patientAToken,
        body: { date: slotDate, startTime: slots[1].startTime },
        expected: 409,
      });
      assert(/already booked/i.test(response.body.message), 'conflict message');
    });

    await step('Patient can reschedule to an available slot', async () => {
      const response = await request(`/appointments/${appointmentId}/reschedule`, {
        method: 'PUT',
        token: patientAToken,
        body: {
          date: slotDate,
          startTime: slots[2].startTime,
          reason: 'Smoke test schedule change',
        },
      });
      assertEqual(response.body.data.appointment.startTime, slots[2].startTime, 'new slot');
      assertEqual(response.body.data.appointment.status, 'pending', 'resets to pending');
    });

    await step('Doctor can approve an appointment', async () => {
      const response = await request(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        token: doctorToken,
        body: { status: 'approved', note: 'Confirmed by smoke test' },
      });
      assertEqual(response.body.data.appointment.status, 'approved', 'approved status');

      const list = await request(`/appointments?scope=upcoming`, { token: doctorToken });
      assert(
        list.body.data.appointments.some((item) => item._id === appointmentId),
        'appointment in doctor upcoming list'
      );

      const upcoming = await request('/appointments/upcoming-count', {
        token: patientAToken,
      });
      assert(upcoming.body.data.count >= 1, 'patient upcoming count');
    });

    await step('Doctor dashboard and patient list expose the relationship', async () => {
      const dashboard = await request('/dashboard/doctor', { token: doctorToken });
      assert(dashboard.body.data.stats.totalAppointments >= 2, 'doctor appointment total');

      const patients = await request('/doctors/me/patients', { token: doctorToken });
      const patientIds = patients.body.data.patients.map((item) => item.patient._id);
      assert(patientIds.includes(patientA._id), 'patient A in doctor list');
      assert(patientIds.includes(patientB._id), 'patient B in doctor list');

      const detail = await request(`/doctors/me/patients/${patientA._id}`, {
        token: doctorToken,
      });
      assertEqual(detail.body.data.patient._id, patientA._id, 'patient detail');
    });

    await step('Medicine reminder can be created and listed', async () => {
      const today = formatDate(new Date());
      const response = await request('/medicines', {
        method: 'POST',
        token: patientAToken,
        body: {
          name: 'Smoke Test Medicine',
          dosage: '500 mg',
          times: ['08:00', '20:00'],
          startDate: today,
          endDate: addDays(today, 7),
          frequency: 'Twice daily',
          instructions: 'Take after food with water.',
          color: 'teal',
          isActive: true,
          notificationsEnabled: true,
        },
        expected: 201,
      });
      medicineId = response.body.data.medicine._id;
      assert(medicineId, 'medicine id');

      const list = await request('/medicines', { token: patientAToken });
      assert(
        list.body.data.medicines.some((item) => item._id === medicineId),
        'medicine in list'
      );
      assert(Array.isArray(list.body.data.todaySchedule), 'today schedule returned');
    });

    await step('A dose can be logged and adherence updates', async () => {
      const today = formatDate(new Date());
      const response = await request(`/medicines/${medicineId}/log`, {
        method: 'POST',
        token: patientAToken,
        body: { date: today, time: '08:00', status: 'taken' },
      });
      const logEntry = response.body.data.medicine.logs.find(
        (item) => item.date === today && item.time === '08:00'
      );
      assert(logEntry, 'dose log saved');
      assertEqual(logEntry.status, 'taken', 'dose status');

      const todaySchedule = await request('/medicines/today', { token: patientAToken });
      const dose = todaySchedule.body.data.doses.find(
        (item) => item.medicineId === medicineId && item.time === '08:00'
      );
      assertEqual(dose.status, 'taken', 'today dose status');

      const stats = await request('/medicines/stats', { token: patientAToken });
      assert(stats.body.data.total >= 1, 'medicine total');
      assert(stats.body.data.adherence.taken >= 1, 'taken doses counted');
    });

    await step('Medicine reminder can be updated and deleted', async () => {
      const updated = await request(`/medicines/${medicineId}`, {
        method: 'PUT',
        token: patientAToken,
        body: { dosage: '250 mg', color: 'blue', instructions: 'Updated by smoke test.' },
      });
      assertEqual(updated.body.data.medicine.dosage, '250 mg', 'updated dosage');
      assertEqual(updated.body.data.medicine.color, 'blue', 'updated color');

      await request(`/medicines/${medicineId}`, {
        method: 'DELETE',
        token: patientAToken,
      });

      const list = await request('/medicines', { token: patientAToken });
      assert(
        !list.body.data.medicines.some((item) => item._id === medicineId),
        'medicine removed from list'
      );
      medicineId = null;
    });

    await step('Health chat answers general questions safely', async () => {
      const response = await request('/chat/message', {
        method: 'POST',
        token: patientAToken,
        body: { message: 'How can I manage a mild fever at home?' },
        expected: 201,
      });
      const reply = response.body.data.assistantMessage;
      assert(reply, 'assistant message returned');
      assert(reply.content.length > 100, 'substantive reply');
      assert(/fever/i.test(reply.content), 'reply addresses the question');
    });

    await step('Health chat escalates emergency symptoms', async () => {
      const response = await request('/chat/message', {
        method: 'POST',
        token: patientAToken,
        body: { message: 'I have crushing chest pain and I cannot breathe properly.' },
        expected: 201,
      });
      const reply = response.body.data.assistantMessage;
      assertEqual(reply.category, 'emergency', 'emergency category');
      assertEqual(reply.flagged, true, 'flagged');
      assert(/emergency services/i.test(reply.content), 'emergency guidance');

      const history = await request('/chat/history', { token: patientAToken });
      assert(history.body.data.messages.length >= 4, 'chat history saved');
      assert(history.body.data.suggestions.length > 0, 'suggestions returned');
      assert(history.body.data.disclaimer, 'medical disclaimer returned');

      const suggestions = await request('/chat/suggestions', { token: patientAToken });
      assert(suggestions.body.data.suggestions.length > 0, 'suggestion endpoint');
    });

    await step('Medical report can be uploaded and downloaded securely', async () => {
      const formData = new FormData();
      formData.append('title', 'Smoke Test Blood Report');
      formData.append('type', 'Blood Test');
      formData.append('description', 'Generated by the API smoke test.');
      formData.append('recordDate', formatDate(new Date()));
      formData.append('tags', 'smoke,blood');
      formData.append(
        'file',
        new Blob(['%PDF-1.4\n% Smoke test medical report\n%%EOF\n'], {
          type: 'application/pdf',
        }),
        'smoke-report.pdf'
      );

      const response = await request('/records', {
        method: 'POST',
        token: patientAToken,
        formData,
        expected: 201,
      });
      const record = response.body.data.record;
      recordId = record._id;
      assertEqual(record.title, 'Smoke Test Blood Report', 'report title');
      assertEqual(record.file.mimeType, 'application/pdf', 'report mime type');
      assert(!record.file.filename, 'internal filename is hidden');

      const list = await request('/records', { token: patientAToken });
      assert(
        list.body.data.records.some((item) => item._id === recordId),
        'report in patient list'
      );

      const download = await request(`/records/${recordId}/download`, {
        token: patientAToken,
        raw: true,
      });
      assert(download.buffer.length > 10, 'downloaded file has content');
      assert(
        download.buffer.toString('utf8').startsWith('%PDF-1.4'),
        'download matches uploaded PDF'
      );
      assert(
        /application\/pdf/.test(download.headers.get('content-type') || ''),
        'download content type'
      );
    });

    await step('Report access is limited to owner, treating doctor and admin', async () => {
      await request(`/records/${recordId}`, {
        token: patientBToken,
        expected: 403,
      });
      await request(`/records/${recordId}`, {
        token: doctorToken,
      });
      await request(`/records/${recordId}`, {
        token: adminToken,
      });
      const doctorDownload = await request(`/records/${recordId}/download`, {
        token: doctorToken,
        raw: true,
      });
      assert(doctorDownload.buffer.length > 10, 'doctor can download report');
      await request(`/records/${recordId}`, {
        method: 'DELETE',
        token: patientBToken,
        expected: 403,
      });
      await request(`/records/${recordId}`, {
        method: 'DELETE',
        token: doctorToken,
        expected: 403,
      });
    });

    await step('Patient can delete their own report', async () => {
      await request(`/records/${recordId}`, {
        method: 'DELETE',
        token: patientAToken,
      });
      await request(`/records/${recordId}`, {
        token: patientAToken,
        expected: 404,
      });
      recordId = null;
    });

    await step('Notifications can be listed, marked read and deleted', async () => {
      const list = await request('/notifications', { token: patientAToken });
      assert(list.body.data.notifications.length > 0, 'notifications exist');
      assert(list.body.data.unreadCount > 0, 'unread notifications exist');

      const notificationId = list.body.data.notifications[0]._id;
      await request(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        token: patientAToken,
      });
      await request('/notifications/read-all', {
        method: 'PATCH',
        token: patientAToken,
      });

      const after = await request('/notifications', { token: patientAToken });
      assertEqual(after.body.data.unreadCount, 0, 'all notifications read');

      await request(`/notifications/${notificationId}`, {
        method: 'DELETE',
        token: patientAToken,
      });
    });

    await step('Profile update and password change work', async () => {
      const profile = await request('/users/profile', {
        method: 'PATCH',
        token: patientAToken,
        body: {
          name: 'Priya Smoke Updated',
          phone: '+91 90000 20002',
          bloodGroup: 'O+',
          emergencyContact: '+91 90000 30003',
        },
      });
      assertEqual(profile.body.data.user.name, 'Priya Smoke Updated', 'updated name');
      assertEqual(profile.body.data.user.phone, '+91 90000 20002', 'updated phone');

      const wrong = await request('/users/password', {
        method: 'PATCH',
        token: patientAToken,
        body: { currentPassword: 'NotMyPassword123', newPassword: NEW_PASSWORD },
        expected: 400,
      });
      assert(/incorrect/i.test(wrong.body.message), 'incorrect password message');

      await request('/users/password', {
        method: 'PATCH',
        token: patientAToken,
        body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      });

      await login(patientAEmail, PASSWORD, 401);
      const relogin = await login(patientAEmail, NEW_PASSWORD);
      patientAToken = relogin.data.token;
    });

    await step('Patient dashboard returns live medical data', async () => {
      const response = await request('/dashboard/patient', { token: patientAToken });
      const data = response.body.data;
      assert(data.stats.totalAppointments >= 1, 'appointment total');
      assert(data.stats.upcomingAppointments >= 1, 'upcoming appointments');
      assert(Array.isArray(data.upcomingAppointmentsList), 'upcoming list');
      assert(Array.isArray(data.activity) && data.activity.length === 7, 'activity chart');
      assert(data.healthTip, 'health tip');
    });

    await step('Admin dashboards and analytics are available', async () => {
      const dashboard = await request('/dashboard/admin', { token: adminToken });
      assert(dashboard.body.data.stats.totalPatients >= 2, 'patient count');
      assert(dashboard.body.data.stats.totalDoctors >= 1, 'doctor count');
      assert(Array.isArray(dashboard.body.data.trend), 'trend data');
      assert(Array.isArray(dashboard.body.data.statusData), 'status data');

      const users = await request(`/admin/users?search=${encodeURIComponent(STAMP)}`, {
        token: adminToken,
      });
      assert(users.body.data.users.length >= 3, 'registered test users are listed');

      const doctors = await request(`/admin/doctors?search=${encodeURIComponent(STAMP)}`, {
        token: adminToken,
      });
      assert(doctors.body.data.doctors.length >= 1, 'doctor admin list');

      const appointments = await request('/admin/appointments', { token: adminToken });
      assert(appointments.body.data.appointments.length >= 2, 'admin appointment list');

      const analytics = await request('/admin/analytics?range=30', { token: adminToken });
      assert(Array.isArray(analytics.body.data.usersByRole), 'users by role');
      assert(Array.isArray(analytics.body.data.appointmentsByStatus), 'appointments by status');
      assert(analytics.body.data.range === 30, 'analytics range');

      const audit = await request('/admin/audit-logs', { token: adminToken });
      assert(audit.body.data.logs.length > 0, 'audit logs recorded');
    });

    await step('Admin can manage user account status', async () => {
      const updated = await request(`/admin/users/${patientB._id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { phone: '+91 90000 12345' },
      });
      assertEqual(updated.body.data.user.phone, '+91 90000 12345', 'admin profile update');

      await request(`/admin/users/${patientB._id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { isActive: false },
      });
      await login(patientBEmail, PASSWORD, 403);
      await request('/auth/me', { token: patientBToken, expected: 403 });

      await request(`/admin/users/${patientB._id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { isActive: true },
      });
      const relogin = await login(patientBEmail, PASSWORD);
      patientBToken = relogin.data.token;
    });

    await step('Admin self-protection rules hold', async () => {
      const me = await request('/auth/me', { token: adminToken });
      const adminId = me.body.data.user._id;

      await request(`/admin/users/${adminId}`, {
        method: 'PATCH',
        token: adminToken,
        body: { isActive: false },
        expected: 400,
      });
      await request(`/admin/users/${adminId}`, {
        method: 'DELETE',
        token: adminToken,
        expected: 400,
      });
    });

    await step('Role-based access control is enforced', async () => {
      await request('/admin/users', { token: patientAToken, expected: 403 });
      await request('/dashboard/doctor', { token: patientAToken, expected: 403 });
      await request('/chat/history', { token: doctorToken, expected: 403 });
      await request('/medicines', { token: doctorToken, expected: 403 });
      await request('/appointments', {
        method: 'POST',
        token: adminToken,
        body: {
          doctorId: doctor._id,
          date: slotDate,
          startTime: slots[2].startTime,
          reason: 'An admin should not be able to create a patient appointment',
        },
        expected: 403,
      });
      await request('/appointments', { expected: 401 });
    });

    await step('Chat history can be cleared', async () => {
      await request('/chat/history', { method: 'DELETE', token: patientAToken });
      const history = await request('/chat/history', { token: patientAToken });
      assertEqual(history.body.data.messages.length, 0, 'chat history cleared');
    });
  } finally {
    log('\nCleaning up temporary smoke-test accounts...');
    await cleanup();
  }

  console.log(
    `\n${failed === 0 ? colors.green : colors.red}${passed} passed, ${failed} failed${
      colors.reset
    }\n`
  );
};

run().catch((error) => {
  console.error(`\n${colors.red}Smoke test stopped at: ${currentStep}${colors.reset}`);
  console.error(error.stack || error.message);
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exitCode = 1;
});
