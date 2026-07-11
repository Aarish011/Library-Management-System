const Subscription = require('../models/Subscription');
const Reservation = require('../models/Reservation');
const Seat = require('../models/Seats');
const Notification = require('../models/Notification');

const REMINDER_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function planLabel(plan) {
  return plan === 'library_access' ? 'General Seat' : 'Reserved Seat';
}

function formatExpiry(value) {
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function upsertRenewalAlert(subscription, expired = false) {
  const broadcastKey = `renewal:${subscription._id}`;
  const existing = await Notification.findOne({
    user: subscription.user,
    broadcastKey,
  });

  const title = expired
    ? 'Subscription expired - seat released'
    : 'Subscription renewal due soon';
  const seatText = subscription.seat?.seatNumber
    ? ` Seat ${subscription.seat.seatNumber} is included in this membership.`
    : '';
  const message = expired
    ? `Your ${planLabel(subscription.plan)} membership expired on ${formatExpiry(
        subscription.endDate
      )}. Your seat has been released. Renew your fees to activate a seat again.`
    : `Your ${planLabel(subscription.plan)} membership expires on ${formatExpiry(
        subscription.endDate
      )}.${seatText} Renew before expiry to keep uninterrupted library access.`;

  if (existing) {
    existing.title = title;
    existing.message = message;
    existing.type = 'renewal';
    existing.isPersistent = true;
    existing.relatedSubscription = subscription._id;
    if (existing.isModified()) await existing.save();
    return { notification: existing, created: false };
  }

  const notification = await Notification.create({
    user: subscription.user,
    title,
    message,
    type: 'renewal',
    isRead: false,
    isPersistent: true,
    relatedSubscription: subscription._id,
    audience: 'system',
    broadcastKey,
  });
  return { notification, created: true };
}

async function processSubscriptionLifecycle() {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const io = global.io;

  const dueSoon = await Subscription.find({
    status: 'active',
    endDate: { $gt: now, $lte: reminderCutoff },
  }).populate('seat', 'seatNumber');

  let remindersCreated = 0;
  for (const subscription of dueSoon) {
    const { notification, created } = await upsertRenewalAlert(subscription);
    if (created) {
      remindersCreated += 1;
      if (io) {
        io.to(`user:${subscription.user}`).emit(
          'notification:new',
          notification
        );
      }
    }
  }

  const expiredSubscriptions = await Subscription.find({
    status: { $in: ['active', 'expired'] },
    endDate: { $lte: now },
    expiryProcessedAt: null,
  }).populate('seat', 'seatNumber');

  let seatsReleased = 0;
  for (const subscription of expiredSubscriptions) {
    subscription.status = 'expired';
    subscription.expiryProcessedAt = now;
    await subscription.save();

    await Reservation.updateMany(
      {
        user: subscription.user,
        status: { $in: ['active', 'confirmed'] },
      },
      { status: 'expired' }
    );

    const released = await Seat.updateMany(
      {
        heldBy: subscription.user,
        status: { $in: ['held', 'booked'] },
      },
      {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      }
    );
    seatsReleased += released.modifiedCount || 0;

    const { notification, created } = await upsertRenewalAlert(
      subscription,
      true
    );
    if (io) {
      if (created) {
        io.to(`user:${subscription.user}`).emit(
          'notification:new',
          notification
        );
      }
      io.emit('seat:released', {
        seatId: subscription.seat?._id || subscription.seat,
        seatNumber: subscription.seat?.seatNumber,
        userId: subscription.user,
        reason: 'subscription_expired',
      });
    }
  }

  return {
    remindersCreated,
    subscriptionsExpired: expiredSubscriptions.length,
    seatsReleased,
  };
}

module.exports = processSubscriptionLifecycle;
