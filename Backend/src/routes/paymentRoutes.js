const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Create Razorpay order
router.post(
  '/razorpay/create-order',
  protect,
  paymentController.createRazorpayOrder
);

// Verify Razorpay payment
router.post(
  '/razorpay/verify',
  protect,
  paymentController.verifyRazorpayPayment
);

// Create Pay on Desk reference
router.post(
  '/desk/create-reference',
  protect,
  paymentController.createDeskReference
);

// Get payment history
router.get('/history', protect, paymentController.getPaymentHistory);

// Get payment status
router.get('/status/:paymentId', protect, paymentController.getPaymentStatus);

module.exports = router;
