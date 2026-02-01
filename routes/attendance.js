// Attendance Routes for AcademyOS
// Defines API endpoints for attendance

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused'];

/**
 * @route   GET /api/attendance
 */
router.get('/', [
  protect,
  authorize(['teacher', 'admin']),
  query('class').optional().isUUID(),
  query('student').optional().isUUID()
], attendanceController.getAttendance);

/**
 * @route   GET /api/attendance/class/:classId/date/:date
 */
router.get('/class/:classId/date/:date', [
  protect,
  authorize(['teacher', 'admin']),
  param('classId').isUUID(),
  param('date').isISO8601()
], attendanceController.getClassAttendance);

/**
 * @route   GET /api/attendance/class/:classId/roster
 */
router.get('/class/:classId/roster', [
  protect,
  authorize(['teacher', 'admin']),
  param('classId').isUUID()
], attendanceController.getClassRoster);

/**
 * @route   POST /api/attendance/mark
 */
router.post('/mark', [
  protect,
  authorize(['teacher', 'admin']),
  body('classId').isUUID(),
  body('studentId').isUUID(),
  body('status').isIn(ATTENDANCE_STATUS)
], attendanceController.markAttendance);

/**
 * @route   PUT /api/attendance/:id
 */
router.put('/:id', [
  protect,
  authorize(['teacher', 'admin']),
  param('id').isUUID()
], attendanceController.updateAttendance);

/**
 * @route   POST /api/attendance/bulk
 */
router.post('/bulk', [
  protect,
  authorize(['teacher', 'admin']),
  body('classId').isUUID(),
  body('attendanceData').isArray()
], attendanceController.bulkMarkAttendance);

/**
 * @route   PATCH /api/attendance/:id/excuse
 */
router.patch('/:id/excuse', [
  protect,
  authorize(['teacher', 'admin']),
  param('id').isUUID(),
  body('approved').isBoolean()
], attendanceController.approveExcuse);

router.get('/student/:studentId/stats', protect, attendanceController.getStudentAttendanceStats);

module.exports = router;
