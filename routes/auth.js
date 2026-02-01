// Authentication Routes for AcademyOS
// Defines API endpoints for user authentication

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    {firstName, lastName, email, password, role, phone, dateOfBirth}
 */
router.post('/register', [
  // Validation rules
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .optional()
    .isIn(['admin', 'teacher', 'student', 'parent'])
    .withMessage('Invalid role specified'),

  body('phone')
    .optional()
    .matches(/^\+?[0-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    })
], authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @body    {email, password}
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
], authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token validity
 * @access  Private
 */
router.get('/verify', protect, authController.verifyToken);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token (placeholder for future implementation)
 * @access  Private
 */
router.post('/refresh', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token refresh endpoint - implement refresh token logic here'
  });
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (placeholder for future implementation)
 * @access  Public
 */
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Password reset requested - implement email sending logic here'
  });
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token (placeholder for future implementation)
 * @access  Public
 */
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Password reset - implement password update logic here'
  });
});

module.exports = router;
