const Reservation = require('../models/Reservation');
const Seat = require('../models/Seats');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

async function markPendingPaymentsFailedForReservations(
  reservationIds,
  reason = 'Seat hold expired before payment'
) {
  if (!reservationIds || reservationIds.length === 0) return 0;

  const result = await Payment.updateMany(
    {
      reservation: { $in: reservationIds },
      status: 'pending',
    },
    {
      status: 'failed',
      failureReason: reason,
      verifiedAt: new Date(),
    }
  );

  return result.modifiedCount || 0;
}

async function syncSeatStatusForReservations(seatId, session = null) {
  const activeReservations = await Reservation.find({
    seat: seatId,
    status: { $in: ['active', 'confirmed'] },
  })
    .select('user slot status reservedUntil')
    .session(session);

  if (activeReservations.length === 0) {
    await Seat.findByIdAndUpdate(
      seatId,
      { status: 'available', heldBy: null, holdExpiresAt: null },
      session ? { session } : undefined
    );
    return;
  }

  const heldReservation = activeReservations.find(
    (reservation) => reservation.status === 'active'
  );
  const hasFullDay = activeReservations.some(
    (reservation) => reservation.slot === 'full_day'
  );
  const generalSlots = new Set(
    activeReservations
      .filter((reservation) => ['morning', 'evening'].includes(reservation.slot))
      .map((reservation) => reservation.slot)
  );
  const bothGeneralSlotsBooked =
    generalSlots.has('morning') && generalSlots.has('evening');

  await Seat.findByIdAndUpdate(
    seatId,
    {
      status: heldReservation
        ? 'held'
        : hasFullDay || bothGeneralSlotsBooked
          ? 'booked'
          : 'available',
      heldBy: heldReservation?.user || null,
      holdExpiresAt: heldReservation?.reservedUntil || null,
    },
    session ? { session } : undefined
  );
}

// Get active reservation for current user
exports.getActiveReservation = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeReservation = await Reservation.findOne({
      user: userId,
      status: { $in: ['active', 'confirmed'] },
    })
      .populate('seat', 'seatNumber zone status')
      .sort({ createdAt: -1 });

    if (!activeReservation) {
      return res.json({
        success: true,
        message: 'No active reservation found',
        data: null,
      });
    }

    // Only temporary holds expire. Confirmed booked seats remain current seats.
    if (activeReservation.status === 'active' && new Date() > activeReservation.reservedUntil) {
      await activeReservation.updateOne({ status: 'expired' });
      await markPendingPaymentsFailedForReservations([activeReservation._id]);

      await syncSeatStatusForReservations(activeReservation.seat._id);

      return res.json({
        success: true,
        message: 'Reservation has expired',
        data: null,
      });
    }

    const timeLeft =
      activeReservation.status === 'active'
        ? Math.max(
            0,
            Math.floor((activeReservation.reservedUntil - new Date()) / 1000)
          )
        : null;

    res.json({
      success: true,
      message: 'Active reservation found',
      data: {
        reservation: activeReservation,
        timeLeft,
        seat: activeReservation.seat,
      },
    });
  } catch (error) {
    console.error('Get active reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active reservation',
    });
  }
};

// Get reservation status by ID
exports.getReservationStatus = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user._id;

    const reservation = await Reservation.findOne({
      _id: reservationId,
      user: userId,
    }).populate('seat', 'seatNumber zone status');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    let status = reservation.status;
    let timeLeft = null;

    // Check if active reservation has expired
    if (status === 'active' && new Date() > reservation.reservedUntil) {
      await reservation.updateOne({ status: 'expired' });
      status = 'expired';
      await markPendingPaymentsFailedForReservations([reservation._id]);

      await syncSeatStatusForReservations(reservation.seat._id);
    }

    if (status === 'active') {
      timeLeft = Math.floor((reservation.reservedUntil - new Date()) / 1000);
    }

    res.json({
      success: true,
      data: {
        reservationId: reservation._id,
        status,
        timeLeft,
        seat: reservation.seat,
        reservedUntil: reservation.reservedUntil,
      },
    });
  } catch (error) {
    console.error('Get reservation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reservation status',
    });
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reservationId } = req.params;
    const userId = req.user._id;

    // Find reservation
    const reservation = await Reservation.findOne({
      _id: reservationId,
      user: userId,
      status: 'active',
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Active reservation not found',
      });
    }

    // Cancel reservation
    await reservation.updateOne({ status: 'cancelled' }, { session });

    await syncSeatStatusForReservations(reservation.seat, session);

    await session.commitTransaction();
    session.endSession();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('seat:released', {
        seatId: reservation.seat,
        reservationId: reservation._id,
        reason: 'cancelled',
      });
    }

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel reservation',
    });
  }
};

// Create a new reservation (called from seat controller)
exports.createReservation = async (
  userId,
  seatId,
  duration = 300,
  plan,
  slot = 'full_day'
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seat = await Seat.findById(seatId).session(session);
    if (!seat) {
      throw new Error('Seat not found');
    }

    if (!seat.isActive) {
      throw new Error('Seat is not available');
    }

    if (slot === 'full_day' && seat.status !== 'available') {
      throw new Error(`Seat is ${seat.status}`);
    }

    const slotConflict = await Reservation.findOne({
      seat: seatId,
      slot,
      status: { $in: ['active', 'confirmed'] },
    }).session(session);

    if (slotConflict) {
      throw new Error(
        slot === 'full_day'
          ? 'Seat is already booked'
          : `The ${slot} slot is already booked for this seat`
      );
    }

    // Check if user has active reservation
    const existingReservation = await Reservation.findOne({
      user: userId,
      status: { $in: ['active', 'confirmed'] },
    }).session(session);

    if (existingReservation) {
      throw new Error('You already have a seat reservation');
    }

    // Create reservation
    const reservedUntil = new Date(Date.now() + duration * 1000);
    const reservation = await Reservation.create(
      [
        {
          user: userId,
          seat: seatId,
          plan,
          slot,
          reservedUntil,
          duration,
          status: 'active',
        },
      ],
      { session }
    );

    await syncSeatStatusForReservations(seatId, session);
    const bookedSeat = await Seat.findById(seatId).session(session);

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      data: {
        reservation: reservation[0],
        seat: bookedSeat,
        timeLeft: duration,
        reservedUntil,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Check and release expired reservations (called by cron job)
exports.cleanupExpiredReservations = async () => {
  try {
    const now = new Date();

    // Find expired active reservations
    const expiredReservations = await Reservation.find({
      status: 'active',
      reservedUntil: { $lt: now },
    });

    if (expiredReservations.length === 0) {
      console.log('No expired reservations to clean up');
      return { count: 0 };
    }

    console.log(
      `Cleaning up ${expiredReservations.length} expired reservations`
    );

    const reservationIds = expiredReservations.map((r) => r._id);
    const seatIds = [...new Set(expiredReservations.map((r) => String(r.seat)))];

    // Update reservations to expired
    await Reservation.updateMany(
      { _id: { $in: reservationIds } },
      { status: 'expired' }
    );
    const failedPayments = await markPendingPaymentsFailedForReservations(
      reservationIds
    );

    for (const seatId of seatIds) {
      await syncSeatStatusForReservations(seatId);
    }

    // Emit socket events
    const io = global.io;
    if (io) {
      expiredReservations.forEach((reservation) => {
        io.emit('seat:released', {
          seatId: reservation.seat,
          reservationId: reservation._id,
          reason: 'expired',
        });
      });
    }

    return { count: expiredReservations.length, failedPayments };
  } catch (error) {
    console.error('Cleanup expired reservations error:', error);
    throw error;
  }
};
