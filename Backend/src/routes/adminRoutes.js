const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminAuth } = require('../middleware/auth');
const imageUpload = require('../middleware/upload');

// Dashboard stats
router.get('/dashboard', protect, adminAuth, adminController.getDashboardStats);

// Student management
router.get('/students', protect, adminAuth, adminController.getStudents);
router.get(
  '/students/:studentId',
  protect,
  adminAuth,
  adminController.getStudentDetails
);
router.put(
  '/students/:studentId',
  protect,
  adminAuth,
  adminController.updateStudent
);
router.delete(
  '/students/:studentId',
  protect,
  adminAuth,
  adminController.deleteStudent
);

// Seat management
router.get('/seats', protect, adminAuth, adminController.getSeats);
router.put('/seats/:seatId', protect, adminAuth, adminController.updateSeat);
router.post('/seats', protect, adminAuth, adminController.createSeat);
router.delete('/seats/:seatId', protect, adminAuth, adminController.deleteSeat);

// Payment management
router.get('/payments', protect, adminAuth, adminController.getPayments);
router.get(
  '/payments/:paymentId',
  protect,
  adminAuth,
  adminController.getPaymentDetails
);
router.put(
  '/payments/:paymentId/confirm-desk',
  protect,
  adminAuth,
  adminController.confirmDeskPayment
);

// Subscription management
router.get(
  '/subscriptions',
  protect,
  adminAuth,
  adminController.getSubscriptions
);
router.get(
  '/subscriptions/:subscriptionId',
  protect,
  adminAuth,
  adminController.getSubscriptionDetails
);

// Notifications
router.post(
  '/notifications',
  protect,
  adminAuth,
  imageUpload.single('banner'),
  adminController.sendNotification
);

module.exports = router;
