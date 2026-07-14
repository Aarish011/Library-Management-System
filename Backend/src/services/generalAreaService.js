const GeneralAreaSettings = require('../models/GeneralAreaSettings');
const GeneralSlotBooking = require('../models/GeneralSlotBooking');
const Subscription = require('../models/Subscription');

const GENERAL_AREA_SLOTS = [
  { slot: 'morning', label: 'Morning' },
  { slot: 'evening', label: 'Evening' },
  { slot: 'wholeDay', label: 'Whole Day' },
];

function normalizeGeneralSlot(slot) {
  return GENERAL_AREA_SLOTS.some((item) => item.slot === slot) ? slot : null;
}

async function getGeneralAreaSettings() {
  let settings = await GeneralAreaSettings.findOne();
  if (!settings) {
    settings = await GeneralAreaSettings.create({});
  }
  return settings;
}

function getSlotStatus({ capacity, booked, isOpen, bookingEnabled }) {
  if (!bookingEnabled || !isOpen) return 'temporarily-closed';
  if (capacity <= 0 || booked >= capacity) return 'full';
  const remaining = capacity - booked;
  if (remaining <= Math.max(2, Math.ceil(capacity * 0.15))) return 'almost-full';
  return 'available';
}

async function getGeneralAreaAvailability() {
  const settings = await getGeneralAreaSettings();
  await GeneralSlotBooking.updateMany(
    {
      status: 'active',
      endDate: { $lt: new Date() },
    },
    { status: 'expired' }
  );
  const counts = await GeneralSlotBooking.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$slot', booked: { $sum: 1 } } },
  ]);

  const bookedBySlot = counts.reduce((map, item) => {
    map[item._id] = item.booked;
    return map;
  }, {});

  const slots = GENERAL_AREA_SLOTS.map(({ slot, label }) => {
    const slotSettings = settings.slots?.[slot] || {};
    const capacity = Number(slotSettings.capacity || 0);
    const booked = Number(bookedBySlot[slot] || 0);
    const remaining = Math.max(capacity - booked, 0);
    const isOpen = Boolean(slotSettings.isOpen);
    const status = getSlotStatus({
      capacity,
      booked,
      isOpen,
      bookingEnabled: settings.bookingEnabled,
    });

    return {
      slot,
      label,
      capacity,
      booked,
      remaining,
      isOpen,
      status,
    };
  });

  return {
    bookingEnabled: settings.bookingEnabled,
    slots,
  };
}

async function assertGeneralSlotCanBeBooked(userId, slot, options = {}) {
  const selectedSlot = normalizeGeneralSlot(slot);
  if (!selectedSlot) {
    const error = new Error('Select a valid general area slot');
    error.statusCode = 400;
    throw error;
  }

  const availability = await getGeneralAreaAvailability();
  if (!availability.bookingEnabled) {
    const error = new Error('General area booking is temporarily closed');
    error.statusCode = 403;
    throw error;
  }

  const selected = availability.slots.find((item) => item.slot === selectedSlot);
  if (!selected?.isOpen || selected.status === 'temporarily-closed') {
    const error = new Error(`${selected?.label || 'Selected slot'} booking is temporarily closed`);
    error.statusCode = 403;
    throw error;
  }

  if (selected.remaining <= 0) {
    const error = new Error(`${selected.label} slot is full`);
    error.statusCode = 409;
    throw error;
  }

  const existingGeneralBooking = await GeneralSlotBooking.findOne({
    user: userId,
    status: 'active',
    ...(options.ignoreBookingId ? { _id: { $ne: options.ignoreBookingId } } : {}),
  }).select('_id status slot');

  if (existingGeneralBooking) {
    const error = new Error('You already have a general area slot booking');
    error.statusCode = 409;
    throw error;
  }

  const activeReservedSubscription = await Subscription.findOne({
    user: userId,
    plan: 'reserved_seat',
    status: { $in: ['active', 'pending'] },
  }).select('_id');

  if (activeReservedSubscription) {
    const error = new Error('You already have a reserved seat subscription');
    error.statusCode = 409;
    throw error;
  }

  return selected;
}

async function createPendingGeneralSlotBooking(userId, slot, paymentId = null) {
  const selected = await assertGeneralSlotCanBeBooked(userId, slot);
  await GeneralSlotBooking.updateMany(
    { user: userId, status: 'pending' },
    { status: 'cancelled' }
  );
  const booking = await GeneralSlotBooking.create({
    user: userId,
    slot: selected.slot,
    status: 'pending',
    payment: paymentId,
  });
  return booking;
}

async function activateGeneralSlotBooking(bookingId, subscriptionId, paymentId, startDate, endDate) {
  if (!bookingId) return null;

  const booking = await GeneralSlotBooking.findById(bookingId);
  if (!booking) {
    const error = new Error('General area booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== 'pending') {
    return booking;
  }

  await assertGeneralSlotCanBeBooked(booking.user, booking.slot, {
    ignoreBookingId: booking._id,
  });

  booking.status = 'active';
  booking.subscription = subscriptionId;
  booking.payment = paymentId || booking.payment;
  booking.startDate = startDate;
  booking.endDate = endDate;
  await booking.save();
  return booking;
}

module.exports = {
  GENERAL_AREA_SLOTS,
  normalizeGeneralSlot,
  getGeneralAreaSettings,
  getGeneralAreaAvailability,
  assertGeneralSlotCanBeBooked,
  createPendingGeneralSlotBooking,
  activateGeneralSlotBooking,
};
