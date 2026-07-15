const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');
const { protect, adminAuth } = require('../middleware/auth');

router.post('/', careerController.createApplication);
router.get('/admin', protect, adminAuth, careerController.getAdminApplications);
router.put('/admin/:applicationId', protect, adminAuth, careerController.updateAdminApplication);

module.exports = router;
