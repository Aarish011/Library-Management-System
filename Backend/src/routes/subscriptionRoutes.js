const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

// Get all plans
router.get('/plans', subscriptionController.getPlans);

// Get active subscription
router.get('/active', protect, subscriptionController.getActiveSubscription);

// Create subscription
router.post('/', protect, subscriptionController.createSubscription);

// Renew subscription
router.put(
  '/renew/:subscriptionId',
  protect,
  subscriptionController.renewSubscription
);

// Cancel subscription
router.put(
  '/cancel/:subscriptionId',
  protect,
  subscriptionController.cancelSubscription
);

module.exports = router;
