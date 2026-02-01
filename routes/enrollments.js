const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const enrollmentController = require('../controllers/enrollmentController');

router.post('/', protect, enrollmentController.enrollInCourse);
router.get('/my', protect, enrollmentController.getMyEnrollments);

module.exports = router;
