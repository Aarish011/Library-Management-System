const Subscription = require('../models/Subscription');
const Reservation = require('../models/Reservation');
const Seat = require('../models/Seats');

const LOCKER_DEPOSIT = 250;

const PLANS = [
  {
    id: 'library_access',
    plan: 'library_access',
    name: 'Library Access',
    price: 1250,
    duration: 30,
    reservesSeat: false,
    lockerDeposit: LOCKER_DEPOSIT,
  },
  {
    id: 'reserved_seat',
    plan: 'reserved_seat',
    name: 'Library Access + Reserved Seat',
    price: 1500,
    duration: 30,
    reservesSeat: true,
    lockerDeposit: LOCKER_DEPOSIT,
  },
];

function getPlan(planId) {
  return PLANS.find((plan) => plan.plan === planId || plan.id === planId);
}

function normalizeLockerSelected(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function getPlanAmount(planConfig, lockerSelected = false) {
  return planConfig.price + (normalizeLockerSelected(lockerSelected) ? LOCKER_DEPOSIT : 0);
}

function buildSubscriptionPayload(userId, planConfig, seatId = null, startDate = new Date(), lockerSelected = false) {
  const endDate = new Date(startDate.getTime() + planConfig.duration * 24 * 60 * 60 * 1000);
  const wantsLocker = normalizeLockerSelected(lockerSelected);

  return {
    user: userId,
    seat: planConfig.reservesSeat ? seatId : null,
    plan: planConfig.plan,
    startDate,
    endDate,
    status: 'active',
    amount: getPlanAmount(planConfig, wantsLocker),
    lockerSelected: wantsLocker,
    lockerDeposit: wantsLocker ? LOCKER_DEPOSIT : 0,
  };
}

async function getCurrentSeatId(userId) {
  const reservation = await Reservation.findOne({
    user: userId,
    status: { $in: ['active', 'confirmed'] },
  }).sort({ createdAt: -1 });

  return reservation?.seat || null;
}

async function confirmCurrentReservation(userId) {
  const reservation = await Reservation.findOne({
    user: userId,
    status: 'active',
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

async function activateSubscriptionForUser(userId, planId, options = {}) {
  const planConfig = getPlan(planId);

  if (!planConfig) {
    const error = new Error('Invalid subscription plan');
    error.statusCode = 400;
    throw error;
  }

  await Subscription.updateMany(
    { user: userId, status: { $in: ['active', 'pending'] } },
    { status: 'cancelled' }
  );

  const seatId = planConfig.reservesSeat ? await getCurrentSeatId(userId) : null;
  if (planConfig.reservesSeat && !seatId) {
    const error = new Error('Select and hold a seat before activating the reserved seat package');
    error.statusCode = 400;
    throw error;
  }

  const subscription = await Subscription.create(
    buildSubscriptionPayload(userId, planConfig, seatId, new Date(), options.lockerSelected)
  );

  if (planConfig.reservesSeat) {
    await confirmCurrentReservation(userId);
  }

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
  const payload = buildSubscriptionPayload(
    userId,
    planConfig,
    subscription.seat,
    startDate,
    options.lockerSelected ?? subscription.lockerSelected
  );

  subscription.plan = payload.plan;
  subscription.startDate = payload.startDate;
  subscription.endDate = payload.endDate;
  subscription.status = 'active';
  subscription.amount = payload.amount;
  subscription.lockerSelected = payload.lockerSelected;
  subscription.lockerDeposit = payload.lockerDeposit;
  await subscription.save();

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

module.exports = {
  PLANS,
  LOCKER_DEPOSIT,
  getPlan,
  getPlanAmount,
  normalizeLockerSelected,
  activateSubscriptionForUser,
  renewSubscriptionForUser,
};
