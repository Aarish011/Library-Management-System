const Seat = require('../models/Seats');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

async function releaseOrphanedSeatLocks() {
  const now = new Date();

  await Reservation.updateMany(
    {
      status: 'active',
      reservedUntil: { $lte: now },
    },
    { status: 'expired' }
  );

  const activeReservations = await Reservation.find({
    $or: [
      { status: 'confirmed' },
      { status: 'active', reservedUntil: { $gt: now } },
    ],
  })
    .select('seat user status')
    .lean();

  if (activeReservations.length === 0) {
    const result = await Seat.updateMany(
      { status: { $in: ['held', 'booked'] } },
      {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      }
    );

    return result.modifiedCount || 0;
  }

  const userIds = [...new Set(activeReservations.map((r) => String(r.user)))];
  const existingUsers = await User.find({ _id: { $in: userIds } })
    .select('_id')
    .lean();
  const existingUserIds = new Set(existingUsers.map((user) => String(user._id)));

  const validSeatIds = activeReservations
    .filter((reservation) => existingUserIds.has(String(reservation.user)))
    .map((reservation) => reservation.seat);

  const result = await Seat.updateMany(
    {
      status: { $in: ['held', 'booked'] },
      _id: { $nin: validSeatIds },
    },
    {
      status: 'available',
      heldBy: null,
      holdExpiresAt: null,
    }
  );

  return result.modifiedCount || 0;
}

module.exports = { releaseOrphanedSeatLocks };
