// Class Routes for AcademyOS
// Defines API endpoints for class management

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const classController = require('../controllers/classController');
const { protect, authorize } = require('../middleware/auth');

// Constants
const CLASS_STATUS = ['scheduled', 'live', 'completed', 'cancelled'];
const RECURRENCE_PATTERN = ['daily', 'weekly', 'biweekly', 'monthly'];

/**
 * @route   GET /api/classes
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('course').optional().isUUID().withMessage('Invalid course ID'), // Prisma uses UUIDs usually, but check if we use mongo-like IDs. Schema says UUID.
  query('instructor').optional().isUUID(),
  query('status').optional().isIn(CLASS_STATUS),
  query('isOnline').optional().isIn(['true', 'false']),
  query('upcoming').optional().isIn(['true', 'false'])
], classController.getClasses);

/**
 * @route   GET /api/classes/my
 */
router.get('/my', [
  protect,
  authorize('teacher', 'admin')
], classController.getMyClasses);

/**
 * @route   GET /api/classes/:id
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid class ID')
], classController.getClass);

/**
 * @route   POST /api/classes
 */
router.post('/', [
  protect,
  authorize('admin', 'teacher'),
  [
    body('title').trim().isLength({ min: 3, max: 100 }),
    body('course').isUUID(),
    body('instructor').isUUID(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('isRecurring').optional().isBoolean(),
    body('recurrencePattern').optional().isIn(RECURRENCE_PATTERN),
    body('isOnline').optional().isBoolean(),
    body('meetingLink').optional({ checkFalsy: true }).isURL()
  ]
], classController.createClass);

/**
 * @route   PUT /api/classes/:id
 */
router.put('/:id', [
  protect,
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 3, max: 100 })
], classController.updateClass);

/**
 * @route   DELETE /api/classes/:id
 */
router.delete('/:id', [
  protect,
  param('id').isUUID()
], classController.deleteClass);

/**
 * @route   PATCH /api/classes/:id/status
 */
router.patch('/:id/status', [
  protect,
  param('id').isUUID(),
  body('status').isIn(CLASS_STATUS)
], classController.updateClassStatus);

module.exports = router;
