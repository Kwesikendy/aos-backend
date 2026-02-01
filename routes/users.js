// User Routes for AcademyOS
// Defines API endpoints for user management

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Constants for Roles
const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent'
};
const ROLE_LIST = Object.values(USER_ROLES);

/**
 * @route   GET /api/users
 */
router.get('/', [
  protect,
  authorize(USER_ROLES.ADMIN)
], [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(ROLE_LIST),
  query('isActive').optional().isIn(['true', 'false']),
  query('search').optional().trim().isLength({ max: 100 })
], userController.getUsers);

/**
 * @route   GET /api/users/stats
 */
router.get('/stats', [
  protect,
  authorize(USER_ROLES.ADMIN)
], userController.getUserStats);

/**
 * @route   GET /api/users/my-students
 * @desc    Get students for the logged-in teacher
 * @access  Protected (Teacher)
 */
router.get('/my-students', [
  protect,
  authorize(USER_ROLES.TEACHER)
], userController.getMyStudents);

/**
 * @route   POST /api/users/link-child
 * @desc    Link a student to the logged-in parent
 * @access  Protected (Parent)
 */
router.post('/link-child', [
  protect,
  authorize(USER_ROLES.PARENT),
  body('studentEmail').isEmail().withMessage('Valid student email is required')
], userController.linkChild);

/**
 * @route   GET /api/users/:id
 */
router.get('/:id', protect, userController.getUser);

/**
 * @route   PUT /api/users/:id
 */
router.put('/:id', [
  protect,
  [
    body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
    body('phone').optional().matches(/^\+?[0-9]\d{1,14}$/),
    body('dateOfBirth').optional().isISO8601(),
    body('avatar').optional().isURL()
  ]
], userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 */
router.delete('/:id', [
  protect,
  authorize(USER_ROLES.ADMIN)
], userController.deleteUser);

/**
 * @route   PATCH /api/users/:id/role
 */
router.patch('/:id/role', [
  protect,
  authorize(USER_ROLES.ADMIN),
  body('role').isIn(ROLE_LIST).withMessage('Invalid role specified')
], userController.changeUserRole);

module.exports = router;
