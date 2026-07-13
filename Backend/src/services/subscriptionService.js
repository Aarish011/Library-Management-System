const Subscription = require('../models/Subscription');
const Reservation = require('../models/Reservation');
const Seat = require('../models/Seats');
const Notification = require('../models/Notification');
const LockerAllocation = require('../models/LockerAllocation');
const AuditLog = require('../models/AuditLog');

const LOCKER_DEPOSIT = 250;
const LOCKER_RENT = 100;
const TOTAL_LOCKERS = 36;
const GENERAL_SEAT_SLOTS = ['morning', 'evening'];
const FULL_DAY_SLOT = 'full_day';

const PLANS = [
  {
    id: 'library_access',
    plan: 'library_access',
    name: 'Library Access',
    price: 1000,
    duration: 30,
    reservesSeat: true,
    allowedSeatRange: [66, 75],
    lockerDeposit: LOCKER_DEPOSIT,
    lockerRent: LOCKER_RENT,
    slots: GENERAL_SEAT_SLOTS,
  },
  {
    id: 'reserved_seat',
    plan: 'reserved_seat',
    name: 'Library Access + Reserved Seat',
    price: 1500,
    duration: 30,
    reservesSeat: true,
    allowedSeatRange: [1, 65],
    lockerDeposit: LOCKER_DEPOSIT,
    lockerRent: 0,
    slots: [FULL_DAY_SLOT],
  },
];

function getPlan(planId) {
  return PLANS.find((plan) => plan.plan === planId || plan.id === planId);
}

function normalizeLockerSelected(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizeLockerNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > TOTAL_LOCKERS) {
    const error = new Error('Select a valid locker number between 1 and 36');
    error.statusCode = 400;
    throw error;
  }
  return String(number);
}

async function getAvailableLockers(userId = null) {
  const allocations = await LockerAllocation.find({ status: 'active' })
    .select('lockerNumber user')
    .lean();

  const occupied = new Map();
  allocations.forEach((allocation) => {
    if (allocation.lockerNumber) {
      occupied.set(String(allocation.lockerNumber), String(allocation.user));
    }
  });

  return Array.from({ length: TOTAL_LOCKERS }, (_, index) => {
    const lockerNumber = String(index + 1);
    const occupiedBy = occupied.get(lockerNumber) || null;
    const assignedToCurrentUser =
      userId && occupiedBy === String(userId);

    return {
      lockerNumber,
      status:
        occupiedBy && !assignedToCurrentUser ? 'occupied' : 'available',
      assignedToCurrentUser,
    };
  });
}

function normalizeSlot(planConfig, slot) {
  if (planConfig?.plan === 'library_access') {
    return GENERAL_SEAT_SLOTS.includes(slot) ? slot : null;
  }

  return FULL_DAY_SLOT;
}

function getLockerRentForPlan(planConfig, lockerSelected = false) {
  const wantsLocker = normalizeLockerSelected(lockerSelected);
  if (!wantsLocker) return 0;
  return planConfig.plan === 'library_access' ? planConfig.lockerRent || LOCKER_RENT : 0;
}

async function getActiveLockerAllocation(userId) {
  return LockerAllocation.findOne({
    user: userId,
    status: 'active',
    securityDepositStatus: { $in: ['paid', 'partially_refunded', 'deducted'] },
    refundedAt: null,
  });
}

async function validateLockerSelection(userId, lockerSelected, lockerNumber) {
  const wantsLocker = normalizeLockerSelected(lockerSelected);
  const activeLocker = await getActiveLockerAllocation(userId);

  if (!wantsLocker) {
    return {
      lockerSelected: false,
      lockerNumber: null,
      activeLocker,
    };
  }

  const selectedLockerNumber =
    normalizeLockerNumber(lockerNumber) || activeLocker?.lockerNumber || null;

  if (!selectedLockerNumber) {
    const error = new Error('Select a locker number before payment');
    error.statusCode = 400;
    throw error;
  }

  const conflictingLocker = await LockerAllocation.findOne({
    lockerNumber: selectedLockerNumber,
    status: 'active',
    user: { $ne: userId },
  }).select('_id lockerNumber');

  if (conflictingLocker) {
    const error = new Error(`Locker ${selectedLockerNumber} is already assigned`);
    error.statusCode = 409;
    throw error;
  }

  return {
    lockerSelected: true,
    lockerNumber: selectedLockerNumber,
    activeLocker,
  };
}

async function shouldChargeLockerDeposit(userId) {
  const activeLocker = await getActiveLockerAllocation(userId);
  if (activeLocker) return false;

  const legacyPaidLocker = await Subscription.findOne({
    user: userId,
    lockerSelected: true,
    lockerDeposit: { $gt: 0 },
    status: { $in: ['active', 'pending'] },
  }).select('_id');

  return !legacyPaidLocker;
}

function calculatePlanFees(planConfig, lockerSelected = false, chargeLockerDeposit = true) {
  const wantsLocker = normalizeLockerSelected(lockerSelected);
  const seatFee = planConfig.price;
  const lockerRent = getLockerRentForPlan(planConfig, wantsLocker);
  const lockerDeposit =
    wantsLocker && chargeLockerDeposit ? planConfig.lockerDeposit || LOCKER_DEPOSIT : 0;

  return {
    seatFee,
    lockerRent,
    lockerDeposit,
    total: seatFee + lockerRent + lockerDeposit,
  };
}

function getPlanAmount(planConfig, lockerSelected = false, chargeLockerDeposit = true) {
  return calculatePlanFees(planConfig, lockerSelected, chargeLockerDeposit).total;
}

function buildSubscriptionPayload(
  userId,
  planConfig,
  seatId = null,
  startDate = new Date(),
  lockerSelected = false,
  slot = FULL_DAY_SLOT,
  chargeLockerDeposit = true,
  lockerNumber = null
) {
  const endDate = new Date(startDate.getTime() + planConfig.duration * 24 * 60 * 60 * 1000);
  const wantsLocker = normalizeLockerSelected(lockerSelected);
  const fees = calculatePlanFees(planConfig, wantsLocker, chargeLockerDeposit);

  return {
    user: userId,
    seat: planConfig.reservesSeat ? seatId : null,
    plan: planConfig.plan,
    slot: normalizeSlot(planConfig, slot) || FULL_DAY_SLOT,
    startDate,
    endDate,
    status: 'active',
    amount: fees.total,
    lockerSelected: wantsLocker,
    lockerDeposit: fees.lockerDeposit,
    lockerRent: fees.lockerRent,
    lockerNumber: wantsLocker ? normalizeLockerNumber(lockerNumber) : null,
  };
}

async function ensureLockerAllocationForPayment(
  userId,
  subscription,
  actorId = null,
  securityAlreadyCovered = false
) {
  if (!subscription.lockerSelected) return null;
  const lockerNumber = normalizeLockerNumber(subscription.lockerNumber);
  if (!lockerNumber) {
    const error = new Error('Select a locker number before activating locker access');
    error.statusCode = 400;
    throw error;
  }

  let allocation = await LockerAllocation.findOne({
    user: userId,
    status: 'active',
  });

  const conflictingLocker = await LockerAllocation.findOne({
    lockerNumber,
    status: 'active',
    user: { $ne: userId },
  }).select('_id lockerNumber');

  if (conflictingLocker) {
    const error = new Error(`Locker ${lockerNumber} is already assigned`);
    error.statusCode = 409;
    throw error;
  }

  const created = !allocation;
  if (!allocation) {
    allocation = await LockerAllocation.create({
      user: userId,
      lockerNumber,
      status: 'active',
      securityDepositAmount: LOCKER_DEPOSIT,
      securityDepositStatus:
        subscription.lockerDeposit > 0 || securityAlreadyCovered ? 'paid' : 'unpaid',
    });
  } else if (allocation.lockerNumber !== lockerNumber) {
    allocation.lockerNumber = lockerNumber;
  }

  if (subscription.lockerDeposit > 0) {
    allocation.securityDepositAmount = subscription.lockerDeposit;
    allocation.securityDepositStatus = 'paid';
    allocation.refundedAmount = 0;
    allocation.refundedAt = null;
    await allocation.save();

    await AuditLog.create({
      actor: actorId,
      user: userId,
      entityType: 'LockerAllocation',
      entity: allocation._id,
      action: created ? 'locker_security_deposit_collected' : 'locker_security_deposit_paid',
      amount: subscription.lockerDeposit,
      metadata: {
        subscription: subscription._id,
        plan: subscription.plan,
        lockerNumber,
      },
    });
  }

  if (securityAlreadyCovered && allocation.securityDepositStatus === 'unpaid') {
    allocation.securityDepositAmount = LOCKER_DEPOSIT;
    allocation.securityDepositStatus = 'paid';
    allocation.refundedAt = null;
    await allocation.save();
  }

  if (allocation.isModified()) {
    await allocation.save();
  }

  return allocation;
}

async function getCurrentReservation(userId, slot = null) {
  const filter = {
    user: userId,
    status: { $in: ['active', 'confirmed'] },
  };

  if (slot) filter.slot = slot;

  return Reservation.findOne({
    ...filter,
  })
    .populate('seat', 'seatNumber')
    .sort({ createdAt: -1 });
}

async function confirmCurrentReservation(userId, slot = null) {
  const filter = {
    user: userId,
    status: 'active',
  };

  if (slot) filter.slot = slot;

  const reservation = await Reservation.findOne({
    ...filter,
  }).sort({ createdAt: -1 });

  if (!reservation) return null;

  reservation.status = 'confirmed';
  await reservation.save();

  await Seat.findByIdAndUpdate(reservation.seat, {
    status: 'booked',
    heldBy: userId,
    holdExpiresAt: null,
  });

  return reservation;
}

async function clearRenewalAlerts(userId) {
  await Notification.deleteMany({
    user: userId,
    type: 'renewal',
    isPersistent: true,
  });
}

async function activateSubscriptionForUser(userId, planId, options = {}) {
  const planConfig = getPlan(planId);

  if (!planConfig) {
    const error = new Error('Invalid subscription plan');
    error.statusCode = 400;
    throw error;
  }

  const selectedSlot = normalizeSlot(planConfig, options.slot);
  if (!selectedSlot) {
    const error = new Error('Select morning or evening slot for the general seat package');
    error.statusCode = 400;
    throw error;
  }

  const reservation = planConfig.reservesSeat
    ? await getCurrentReservation(userId, selectedSlot)
    : null;
  const seatId = reservation?.seat?._id || null;
  if (planConfig.reservesSeat && !seatId) {
    const error = new Error('Select and hold a seat before activating the reserved seat package');
    error.statusCode = 400;
    throw error;
  }

  if (reservation?.plan && reservation.plan !== planConfig.plan) {
    const error = new Error('The selected payment plan does not match your seat hold');
    error.statusCode = 400;
    throw error;
  }

  if (planConfig.reservesSeat) {
    const seatNumber = Number(reservation.seat.seatNumber);
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
  }

  const lockerSelection = await validateLockerSelection(
    userId,
    options.lockerSelected,
    options.lockerNumber
  );
  const chargeLockerDeposit = lockerSelection.lockerSelected
    ? await shouldChargeLockerDeposit(userId)
    : false;

  await Subscription.updateMany(
    { user: userId, status: { $in: ['active', 'pending'] } },
    { status: 'cancelled' }
  );

  const subscription = await Subscription.create(
    buildSubscriptionPayload(
      userId,
      planConfig,
      seatId,
      new Date(),
      lockerSelection.lockerSelected,
      selectedSlot,
      chargeLockerDeposit,
      lockerSelection.lockerNumber
    )
  );

  if (planConfig.reservesSeat) {
    await confirmCurrentReservation(userId, selectedSlot);
  }
  await ensureLockerAllocationForPayment(userId, subscription, options.actorId || null);
  await clearRenewalAlerts(userId);

  const populated = await Subscription.findById(subscription._id).populate(
    'seat',
    'seatNumber zone status'
  );

  return {
    subscription: populated,
    totalDays: planConfig.duration,
    daysRemaining: planConfig.duration,
  };
}

async function renewSubscriptionForUser(userId, subscriptionId, planId, options = {}) {
  const subscription = await Subscription.findOne({ _id: subscriptionId, user: userId });

  if (!subscription) {
    const error = new Error('Subscription not found');
    error.statusCode = 404;
    throw error;
  }

  const planConfig = getPlan(planId || subscription.plan);
  if (!planConfig) {
    const error = new Error('Invalid subscription plan');
    error.statusCode = 400;
    throw error;
  }

  const startDate = subscription.endDate > new Date() ? subscription.endDate : new Date();
  const selectedSlot = normalizeSlot(planConfig, options.slot || subscription.slot);
  const existingDepositCovered = Boolean(
    subscription.lockerSelected && subscription.lockerDeposit > 0
  );
  const wantsLocker = normalizeLockerSelected(
    options.lockerSelected ?? subscription.lockerSelected
  );
  const lockerSelection = await validateLockerSelection(
    userId,
    wantsLocker,
    options.lockerNumber || subscription.lockerNumber
  );
  const chargeLockerDeposit = wantsLocker
    ? await shouldChargeLockerDeposit(userId)
    : false;
  const payload = buildSubscriptionPayload(
    userId,
    planConfig,
    subscription.seat,
    startDate,
    lockerSelection.lockerSelected,
    selectedSlot,
    chargeLockerDeposit,
    lockerSelection.lockerNumber
  );

  subscription.plan = payload.plan;
  subscription.startDate = payload.startDate;
  subscription.endDate = payload.endDate;
  subscription.status = 'active';
  subscription.expiryProcessedAt = null;
  subscription.amount = payload.amount;
  subscription.lockerSelected = payload.lockerSelected;
  subscription.lockerDeposit = payload.lockerDeposit;
  subscription.lockerRent = payload.lockerRent;
  subscription.lockerNumber = payload.lockerNumber;
  subscription.slot = payload.slot;
  await subscription.save();
  await ensureLockerAllocationForPayment(
    userId,
    subscription,
    options.actorId || null,
    existingDepositCovered
  );

  const populated = await Subscription.findById(subscription._id).populate(
    'seat',
    'seatNumber zone status'
  );

  await clearRenewalAlerts(userId);

  return {
    subscription: populated,
    totalDays: planConfig.duration,
    daysRemaining: planConfig.duration,
  };
}

module.exports = {
  PLANS,
  LOCKER_DEPOSIT,
  LOCKER_RENT,
  TOTAL_LOCKERS,
  GENERAL_SEAT_SLOTS,
  FULL_DAY_SLOT,
  getPlan,
  getPlanAmount,
  calculatePlanFees,
  normalizeSlot,
  normalizeLockerNumber,
  getAvailableLockers,
  getLockerRentForPlan,
  getActiveLockerAllocation,
  shouldChargeLockerDeposit,
  validateLockerSelection,
  normalizeLockerSelected,
  activateSubscriptionForUser,
  renewSubscriptionForUser,
};
