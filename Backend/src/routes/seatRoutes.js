const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const { protect, girlsZoneOnly } = require('../middleware/auth');

// Get all seats
router.get('/', protect, seatController.getSeats);

// Get seat layout
router.get('/layout', protect, seatController.getSeatLayout);

// Reserve a seat (with timer)
router.post('/reserve', protect, seatController.reserveSeat);

// Extend reservation
router.put('/extend/:reservationId', protect, seatController.extendReservation);

// Cancel reservation
router.delete(
  '/cancel/:reservationId',
  protect,
  seatController.cancelReservation
);
console.log('🔥 seatRoutes loaded');

module.exports = router;
