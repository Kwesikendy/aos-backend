const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/student', protect, dashboardController.getStudentDashboard);
router.get('/parent/child/:id', protect, dashboardController.getChildDetail);
router.get('/teacher', protect, dashboardController.getTeacherDashboard);
router.get('/admin', protect, dashboardController.getAdminDashboard);
router.get('/parent', protect, dashboardController.getParentDashboard);

module.exports = router;
