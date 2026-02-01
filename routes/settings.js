const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/', settingsController.getSettings);
router.put('/', authorize('admin'), settingsController.updateSettings);

module.exports = router;
