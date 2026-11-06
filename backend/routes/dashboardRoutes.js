const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  patientDashboard,
  doctorDashboard,
  adminDashboard,
} = require('../controllers/dashboardController');

const router = express.Router();

router.use(protect);

router.get('/patient', authorize('patient'), patientDashboard);
router.get('/doctor', authorize('doctor'), doctorDashboard);
router.get('/admin', authorize('admin'), adminDashboard);

module.exports = router;
