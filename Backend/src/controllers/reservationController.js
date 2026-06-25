const Reservation = require('../models/Reservation');
const Seat = require('../models/Seats');
const mongoose = require('mongoose');

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

      // Release the seat
      await Seat.findByIdAndUpdate(activeReservation.seat._id, {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      });

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

      // Release the seat
      await Seat.findByIdAndUpdate(reservation.seat._id, {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      });
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

    // Release the seat
    await Seat.findByIdAndUpdate(
      reservation.seat,
      {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      },
      { session }
    );

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
exports.createReservation = async (userId, seatId, duration = 300) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if seat is available
    const seat = await Seat.findById(seatId).session(session);
    if (!seat) {
      throw new Error('Seat not found');
    }

    if (seat.status !== 'available') {
      throw new Error(`Seat is ${seat.status}`);
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
          reservedUntil,
          duration,
          status: 'active',
        },
      ],
      { session }
    );

    // Update seat status
    const bookedSeat = await Seat.findOneAndUpdate(
      { _id: seatId, status: 'available' },
      {
        status: 'held',
        heldBy: userId,
        holdExpiresAt: reservedUntil,
      },
      { new: true, session }
    );

    if (!bookedSeat) {
      throw new Error('Seat is no longer available');
    }

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
    const seatIds = expiredReservations.map((r) => r.seat);

    // Update reservations to expired
    await Reservation.updateMany(
      { _id: { $in: reservationIds } },
      { status: 'expired' }
    );

    // Release seats
    await Seat.updateMany(
      { _id: { $in: seatIds }, status: 'held' },
      {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      }
    );

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

    return { count: expiredReservations.length };
  } catch (error) {
    console.error('Cleanup expired reservations error:', error);
    throw error;
  }
};
