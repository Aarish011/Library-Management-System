const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const Subscription = require('../models/Subscription');
const { createOrder, verifyPaymentSignature } = require('../services/razorpayService');
const {
  getPlan,
  calculatePlanFees,
  getAvailableLockers,
  normalizeSlot,
  normalizeLockerSelected,
  shouldChargeLockerDeposit,
  validateLockerSelection,
  activateSubscriptionForUser,
  renewSubscriptionForUser,
} = require('../services/subscriptionService');

const RENEWAL_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

async function getActiveSubscription(userId) {
  return Subscription.findOne({
    user: userId,
    status: 'active',
    endDate: { $gte: new Date() },
  }).sort({ endDate: -1 });
}

async function ensureSeatHoldForReservedPlan(userId, planConfig, slot) {
  if (!planConfig.reservesSeat) return;

  const reservation = await Reservation.findOne({
    user: userId,
    status: { $in: ['active', 'confirmed'] },
    slot,
  })
    .populate('seat', 'seatNumber')
    .sort({ createdAt: -1 });

  if (!reservation) {
    const error = new Error('Select and hold a seat before paying for the reserved seat package');
    error.statusCode = 400;
    throw error;
  }

  if (reservation.plan && reservation.plan !== planConfig.plan) {
    const error = new Error('The selected payment plan does not match your seat hold');
    error.statusCode = 400;
    throw error;
  }

  if (reservation.slot !== slot) {
    const error = new Error('The selected payment slot does not match your seat hold');
    error.statusCode = 400;
    throw error;
  }

  const seatNumber = Number(reservation.seat?.seatNumber);
  const [minimumSeat, maximumSeat] = planConfig.allowedSeatRange;
  if (seatNumber < minimumSeat || seatNumber > maximumSeat) {
    const error = new Error(
      planConfig.plan === 'library_access'
        ? 'The Rs. 1000 general slot plan allows seats 66 to 75 only'
        : 'The Rs. 1500 plan allows seats 1 to 65 only'
    );
    error.statusCode = 403;
    throw error;
  }

  return reservation;
}

function activeSubscriptionResponse(res, subscription) {
  return res.status(409).json({
    success: false,
    message: 'Your session is active. You cannot make another payment right now. Please ask for help from the library desk if you need changes.',
    data: { subscription },
  });
}

function getRenewalSubscription(activeSubscription, planConfig) {
  if (!activeSubscription) return null;

  const timeRemaining =
    new Date(activeSubscription.endDate).getTime() - Date.now();
  if (timeRemaining > RENEWAL_WINDOW_MS) return null;

  if (activeSubscription.plan !== planConfig.plan) {
    const error = new Error(
      'Renewal must use your current plan. Change plans after the current membership expires.'
    );
    error.statusCode = 409;
    throw error;
  }

  return activeSubscription;
}

async function getPaymentSelection(userId, body = {}) {
  const requestedPlan = body.plan || body.planType;
  const planConfig = getPlan(requestedPlan);
  const requestedLockerSelected = normalizeLockerSelected(body.lockerSelected);

  if (!planConfig) {
    const error = new Error('Invalid subscription plan');
    error.statusCode = 400;
      throw error;
  }

  const slot = normalizeSlot(planConfig, body.slot);
  if (!slot) {
    const error = new Error('Select morning or evening slot for the general seat package');
    error.statusCode = 400;
    throw error;
  }

  const lockerSelection = await validateLockerSelection(
    userId,
    requestedLockerSelected,
    body.lockerNumber
  );

  const chargeLockerDeposit = lockerSelection.lockerSelected
    ? await shouldChargeLockerDeposit(userId)
    : false;
  const fees = calculatePlanFees(
    planConfig,
    lockerSelection.lockerSelected,
    chargeLockerDeposit
  );

  return {
    planConfig,
    slot,
    lockerSelected: lockerSelection.lockerSelected,
    lockerNumber: lockerSelection.lockerNumber,
    lockerRent: fees.lockerRent,
    lockerDeposit: fees.lockerDeposit,
    amount: fees.total,
  };
}

exports.getAvailableLockers = async (req, res) => {
  try {
    const lockers = await getAvailableLockers(req.user._id);
    res.json({
      success: true,
      data: lockers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load lockers',
    });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { planConfig, slot, lockerSelected, lockerNumber, lockerRent, lockerDeposit, amount } =
      await getPaymentSelection(req.user._id, req.body);

    const activeSubscription = await getActiveSubscription(req.user._id);
    const renewalSubscription = getRenewalSubscription(
      activeSubscription,
      planConfig
    );
    if (activeSubscription && !renewalSubscription) {
      return activeSubscriptionResponse(res, activeSubscription);
    }
    const reservation = await ensureSeatHoldForReservedPlan(
      req.user._id,
      planConfig,
      slot
    );

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
        slot,
        lockerSelected: String(lockerSelected),
        lockerNumber: lockerNumber || '',
      },
    });

    const payment = await Payment.create({
      user: req.user._id,
      plan: planConfig.plan,
      slot,
      amount,
      lockerSelected,
      lockerNumber,
      lockerRent,
      lockerDeposit,
      currency: order.currency,
      paymentMethod: 'razorpay',
      status: 'pending',
      razorpayOrderId: order.id,
      reservation: reservation?._id || null,
      subscription: renewalSubscription?._id || null,
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
        slot,
        lockerSelected,
        lockerNumber,
        lockerRent,
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
    }).populate('reservation', 'status reservedUntil');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pending payment not found',
      });
    }

    if (
      payment.reservation &&
      (payment.reservation.status === 'expired' ||
        (payment.reservation.status === 'active' &&
          payment.reservation.reservedUntil <= new Date()))
    ) {
      payment.status = 'failed';
      payment.failureReason = 'Seat hold expired before payment';
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.verifiedAt = new Date();
      await payment.save();

      return res.status(409).json({
        success: false,
        message: 'Your seat hold expired. Please select the seat again and try payment again.',
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

    const subscriptionData = payment.subscription
      ? await renewSubscriptionForUser(
          req.user._id,
          payment.subscription,
          payment.plan,
          {
            lockerSelected: payment.lockerSelected,
            lockerNumber: payment.lockerNumber,
            slot: payment.slot,
            actorId: req.user._id,
          }
        )
      : await activateSubscriptionForUser(
          req.user._id,
          payment.plan,
          {
            lockerSelected: payment.lockerSelected,
            lockerNumber: payment.lockerNumber,
            slot: payment.slot,
            actorId: req.user._id,
          }
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
    const { planConfig, slot, lockerSelected, lockerNumber, lockerRent, lockerDeposit, amount } =
      await getPaymentSelection(req.user._id, req.body);

    const activeSubscription = await getActiveSubscription(req.user._id);
    const renewalSubscription = getRenewalSubscription(
      activeSubscription,
      planConfig
    );
    if (activeSubscription && !renewalSubscription) {
      return activeSubscriptionResponse(res, activeSubscription);
    }
    const reservation = await ensureSeatHoldForReservedPlan(
      req.user._id,
      planConfig,
      slot
    );

    const referenceId = `DESK-${Date.now()}-${String(req.user._id).slice(-4).toUpperCase()}`;
    const payment = await Payment.create({
      user: req.user._id,
      plan: planConfig.plan,
      slot,
      amount,
      lockerSelected,
      lockerNumber,
      lockerRent,
      lockerDeposit,
      paymentMethod: 'pay_on_desk',
      status: 'pending',
      referenceId,
      reservation: reservation?._id || null,
      subscription: renewalSubscription?._id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Pay-on-Desk reference created',
      data: {
        payment,
        referenceId,
        plan: planConfig,
        slot,
        lockerSelected,
        lockerNumber,
        lockerRent,
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
      .populate('subscription', 'plan slot startDate endDate status lockerSelected lockerDeposit lockerRent lockerNumber')
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



