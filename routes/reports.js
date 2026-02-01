const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected and admin-only
router.use(protect);
router.use(authorize('admin'));

router.get('/enrollment', reportsController.getEnrollmentStats);
router.get('/attendance', reportsController.getAttendanceStats);
router.get('/performance', reportsController.getPerformanceStats);

module.exports = router;
