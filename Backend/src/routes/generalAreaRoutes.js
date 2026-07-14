const express = require('express');
const router = express.Router();
const generalAreaController = require('../controllers/generalAreaController');
const { protect, adminAuth } = require('../middleware/auth');

router.get('/availability', generalAreaController.getAvailability);
router.post('/book', protect, generalAreaController.createPendingBooking);

router.get('/admin/overview', protect, adminAuth, generalAreaController.getAdminOverview);
router.put('/admin/settings', protect, adminAuth, generalAreaController.updateSettings);
router.put('/admin/bookings/:bookingId/cancel', protect, adminAuth, generalAreaController.cancelBooking);
router.put('/admin/bookings/:bookingId/slot', protect, adminAuth, generalAreaController.changeBookingSlot);

module.exports = router;
