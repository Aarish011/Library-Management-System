const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { protect } = require('../middleware/auth');

// Get active reservation
router.get('/active', protect, reservationController.getActiveReservation);

// Get reservation status
router.get(
  '/:reservationId/status',
  protect,
  reservationController.getReservationStatus
);

// Cancel reservation
router.delete(
  '/:reservationId',
  protect,
  reservationController.cancelReservation
);

module.exports = router;
