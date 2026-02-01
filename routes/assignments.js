// Assignment Routes for AcademyOS
// Defines API endpoints for assignment management

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const assignmentController = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');

// Constants
const ASSIGNMENT_TYPE = ['quiz', 'test', 'homework', 'project', 'paper', 'presentation'];
const ASSIGNMENT_STATUS = ['draft', 'published', 'closed', 'graded'];

/**
 * @route   GET /api/assignments
 */
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('course').optional().isUUID(),
  query('class').optional().isUUID(),
  query('type').optional().isIn(ASSIGNMENT_TYPE),
  query('status').optional().isIn(ASSIGNMENT_STATUS)
], assignmentController.getAssignments);

/**
 * @route   GET /api/assignments/:id
 */
router.get('/:id', [
  param('id').isUUID()
], assignmentController.getAssignment);

/**
 * @route   POST /api/assignments
 */
router.post('/', [
  protect,
  authorize(['teacher', 'admin']),
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('course').isUUID(),
    body('class').optional().isUUID(),
    body('type').optional().isIn(ASSIGNMENT_TYPE),
    body('dueDate').isISO8601()
  ]
], assignmentController.createAssignment);

/**
 * @route   PUT /api/assignments/:id
 */
router.put('/:id', [
  protect,
  param('id').isUUID()
], assignmentController.updateAssignment);

/**
 * @route   DELETE /api/assignments/:id
 */
router.delete('/:id', [
  protect,
  param('id').isUUID()
], assignmentController.deleteAssignment);

/**
 * @route   POST /api/assignments/:id/resources
 */
router.post('/:id/resources', [
  protect,
  param('id').isUUID(),
  body('title').trim().isLength({ min: 1 })
], assignmentController.addResource);

// Placeholders for unimplemented features
router.post('/:id/submissions', protect, assignmentController.submitAssignment);
router.post('/:id/grade', protect, assignmentController.gradeAssignment);
router.get('/:id/stats', protect, assignmentController.getAssignmentStats);

module.exports = router;
