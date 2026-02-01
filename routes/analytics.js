const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// @route   GET /api/analytics
// @desc    Get system analytics
// @access  Admin only
router.get(
    '/',
    protect,
    authorize('admin'),
    analyticsController.getSystemAnalytics
);

module.exports = router;
