const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const Subscription = require('../models/Subscription');
const { createOrder, verifyPaymentSignature } = require('../services/razorpayService');
const {
  getPlan,
  getPlanAmount,
  normalizeLockerSelected,
  activateSubscriptionForUser,
} = require('../services/subscriptionService');

async function getActiveSubscription(userId) {
  return Subscription.findOne({
    user: userId,
    status: 'active',
    endDate: { $gte: new Date() },
  }).sort({ endDate: -1 });
}

async function ensureSeatHoldForReservedPlan(userId, planConfig) {
  if (!planConfig.reservesSeat) return;

  const reservation = await Reservation.findOne({
    user: userId,
    status: { $in: ['active', 'confirmed'] },
  }).sort({ createdAt: -1 });

  if (!reservation) {
    const error = new Error('Select and hold a seat before paying for the reserved seat package');
    error.statusCode = 400;
    throw error;
  }
}

function activeSubscriptionResponse(res, subscription) {
  return res.status(409).json({
    success: false,
    message: 'Your session is active. You cannot make another payment right now. Please ask for help from the library desk if you need changes.',
    data: { subscription },
  });
}

function getPaymentSelection(body = {}) {
  const requestedPlan = body.plan || body.planType;
  const planConfig = getPlan(requestedPlan);
  const lockerSelected = normalizeLockerSelected(body.lockerSelected);

  if (!planConfig) {
    const error = new Error('Invalid subscription plan');
    error.statusCode = 400;
    throw error;
  }

  return {
    planConfig,
    lockerSelected,
    lockerDeposit: lockerSelected ? planConfig.lockerDeposit : 0,
    amount: getPlanAmount(planConfig, lockerSelected),
  };
}

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { planConfig, lockerSelected, lockerDeposit, amount } = getPaymentSelection(req.body);

    const activeSubscription = await getActiveSubscription(req.user._id);
    if (activeSubscription) return activeSubscriptionResponse(res, activeSubscription);
    await ensureSeatHoldForReservedPlan(req.user._id, planConfig);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured on the server',
      });
    }

    const receipt = `sub_${Date.now()}_${String(req.user._id).slice(-6)}`;
    const order = await createOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        userId: String(req.user._id),
        plan: planConfig.plan,
        lockerSelected: String(lockerSelected),
      },
    });

    const payment = await Payment.create({
      user: req.user._id,
      plan: planConfig.plan,
      amount,
      lockerSelected,
      lockerDeposit,
      currency: order.currency,
      paymentMethod: 'razorpay',
      status: 'pending',
      razorpayOrderId: order.id,
    });

    res.status(201).json({
      success: true,
      message: 'Razorpay order created',
      data: {
        paymentId: payment._id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan: planConfig,
        lockerSelected,
        lockerDeposit,
        user: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
        },
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create Razorpay order',
    });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay verification fields',
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      user: req.user._id,
      razorpayOrderId: razorpay_order_id,
      status: 'pending',
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pending payment not found',
      });
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      payment.status = 'failed';
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay payment signature',
      });
    }

    const subscriptionData = await activateSubscriptionForUser(
      req.user._id,
      payment.plan,
      { lockerSelected: payment.lockerSelected }
    );

    payment.status = 'paid';
    payment.subscription = subscriptionData.subscription._id;
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paymentDate = new Date();
    payment.verifiedAt = new Date();
    await payment.save();

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: {
        payment,
        subscription: subscriptionData.subscription,
        totalDays: subscriptionData.totalDays,
        daysRemaining: subscriptionData.daysRemaining,
      },
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
};

exports.createDeskReference = async (req, res) => {
  try {
    const { planConfig, lockerSelected, lockerDeposit, amount } = getPaymentSelection(req.body);

    const activeSubscription = await getActiveSubscription(req.user._id);
    if (activeSubscription) return activeSubscriptionResponse(res, activeSubscription);
    await ensureSeatHoldForReservedPlan(req.user._id, planConfig);

    const referenceId = `DESK-${Date.now()}-${String(req.user._id).slice(-4).toUpperCase()}`;
    const payment = await Payment.create({
      user: req.user._id,
      plan: planConfig.plan,
      amount,
      lockerSelected,
      lockerDeposit,
      paymentMethod: 'pay_on_desk',
      status: 'pending',
      referenceId,
    });

    res.status(201).json({
      success: true,
      message: 'Pay-on-Desk reference created',
      data: {
        payment,
        referenceId,
        plan: planConfig,
        lockerSelected,
        lockerDeposit,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('subscription', 'plan startDate endDate status lockerSelected lockerDeposit')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



