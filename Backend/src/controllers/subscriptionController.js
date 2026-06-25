const Subscription = require('../models/Subscription');
const {
  PLANS,
  getPlan,
  activateSubscriptionForUser,
  renewSubscriptionForUser,
} = require('../services/subscriptionService');

exports.getPlans = async (req, res) => {
  try {
    res.json({ success: true, data: PLANS });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActiveSubscription = async (req, res) => {
  try {
    const now = new Date();

    const expired = await Subscription.updateMany(
      {
        user: req.user._id,
        status: 'active',
        endDate: { $lt: now },
      },
      { status: 'expired' }
    );

    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'pending'] },
    })
      .populate('seat', 'seatNumber zone status')
      .sort({ endDate: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        meta: { expiredUpdated: expired.modifiedCount || 0 },
      });
    }

    const totalDays = Math.max(
      1,
      Math.ceil((subscription.endDate - subscription.startDate) / 86400000)
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((subscription.endDate - now) / 86400000)
    );

    res.json({
      success: true,
      data: { subscription, totalDays, daysRemaining },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Subscription activation requires Razorpay payment verification. Use /api/payments/razorpay/create-order first.',
  });
};

exports.renewSubscription = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Subscription renewal requires Razorpay payment verification. Use /api/payments/razorpay/create-order first.',
  });
};

exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      {
        _id: req.params.subscriptionId,
        user: req.user._id,
        status: { $in: ['active', 'pending'] },
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found',
      });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: { subscription },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};