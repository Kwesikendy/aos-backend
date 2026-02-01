// Course Routes for AcademyOS
// Defines API endpoints for course management

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

// Constants
const COURSE_STATUS = ['draft', 'published', 'archived'];
const COURSE_LEVEL = ['beginner', 'intermediate', 'advanced'];

/**
 * @route   GET /api/courses
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(COURSE_STATUS),
  query('level').optional().isIn(COURSE_LEVEL),
  query('instructor').optional().isUUID(),
  query('isFree').optional().isIn(['true', 'false']),
  query('search').optional().trim().isLength({ max: 100 })
], courseController.getCourses);

/**
 * @route   GET /api/courses/my
 */
router.get('/my', [
  protect,
  authorize('teacher', 'admin')
], courseController.getMyCourses);

/**
 * @route   GET /api/courses/:id
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid course ID')
], courseController.getCourse);

/**
 * @route   POST /api/courses
 */
// ...
router.post('/', [
  protect,
  authorize('admin'),
  [
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('code').trim().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9\-]+$/),
    body('level').optional().isIn(COURSE_LEVEL),
    body('price').optional().isFloat({ min: 0 })
  ]
], courseController.createCourse);

/**
 * @route   PUT /api/courses/:id
 */
router.put('/:id', [
  protect,
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 5, max: 200 })
], courseController.updateCourse);

/**
 * @route   DELETE /api/courses/:id
 */
router.delete('/:id', [
  protect,
  param('id').isUUID()
], courseController.deleteCourse);

/**
 * @route   POST /api/courses/:id/instructors
 */
router.post('/:id/instructors', [
  protect,
  param('id').isUUID(),
  body('instructorId').isUUID()
], courseController.addInstructor);

/**
 * @route   GET /api/courses/:id/stats
 */
router.get('/:id/stats', [
  protect,
  param('id').isUUID()
], courseController.getCourseStats);

/**
 * @route   POST /api/courses/:id/enroll
 * @desc    Enroll in a course
 * @access  Protected (students)
 */
const enrollmentController = require('../controllers/enrollmentController');

router.post('/:id/enroll', [
  protect,
  param('id').isUUID().withMessage('Invalid course ID')
], async (req, res) => {
  // Adapt the enrollment controller to work with courseId from params
  req.body.courseId = req.params.id;
  return enrollmentController.enrollInCourse(req, res);
});

/**
 * @route   GET /api/courses/:id/enrollment-status
 * @desc    Check if current user is enrolled in a course
 * @access  Protected
 */
router.get('/:id/enrollment-status', [
  protect,
  param('id').isUUID().withMessage('Invalid course ID')
], async (req, res) => {
  // Adapt the enrollment controller to work with courseId from params
  req.params.courseId = req.params.id;
  return enrollmentController.getEnrollmentStatus(req, res);
});

module.exports = router;

