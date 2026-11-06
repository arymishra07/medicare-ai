const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const medicineRoutes = require('./medicineRoutes');
const recordRoutes = require('./recordRoutes');
const chatRoutes = require('./chatRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'MediCare AI API',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/doctors',
      '/api/appointments',
      '/api/medicines',
      '/api/records',
      '/api/chat',
      '/api/dashboard',
      '/api/admin',
      '/api/notifications',
    ],
  });
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'MediCare AI API',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/medicines', medicineRoutes);
router.use('/records', recordRoutes);
router.use('/chat', chatRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
