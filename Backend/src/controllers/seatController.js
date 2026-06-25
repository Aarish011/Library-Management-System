const Seat = require('../models/Seats');
const Reservation = require('../models/Reservation');
const { createReservation } = require('./reservationController');

// Reserve a seat
exports.reserveSeat = async (req, res) => {
  try {
    const { seatId } = req.body;
    const userId = req.user._id;
    const duration = req.body.duration || 300;

    const seat = await Seat.findById(seatId);

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Seat not found',
      });
    }

    if (seat.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Seat is ${seat.status}`,
      });
    }

    // Check girls zone restriction
    if (seat.zone === 'girls' && req.user.gender !== 'female') {
      return res.status(403).json({
        success: false,
        message: 'This seat is reserved for girls only',
      });
    }

    const result = await createReservation(userId, seat._id, duration);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('seat:reserved', {
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        status: result.data.seat.status,
        userId,
        reservationId: result.data.reservation._id,
        reservedUntil: result.data.reservedUntil,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Seat reserved successfully',
      data: result.data,
    });
  } catch (error) {
    console.error('Reserve seat error:', error);

    // Handle CastError specifically
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid seat ID format. Please use a valid MongoDB ObjectId.',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reserve seat',
    });
  }
};

// Extend reservation
exports.extendReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { extraTime = 120 } = req.body;
    const userId = req.user._id;

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

    if (new Date() > reservation.reservedUntil) {
      await reservation.updateOne({ status: 'expired' });
      await Seat.findByIdAndUpdate(reservation.seat, {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      });

      return res.status(400).json({
        success: false,
        message: 'Reservation has already expired',
      });
    }

    const newReservedUntil = new Date(
      reservation.reservedUntil.getTime() + extraTime * 1000
    );

    await reservation.updateOne({
      reservedUntil: newReservedUntil,
      duration: reservation.duration + extraTime,
    });

    await Seat.findByIdAndUpdate(reservation.seat, {
      holdExpiresAt: newReservedUntil,
    });

    const timeLeft = Math.floor((newReservedUntil - Date.now()) / 1000);

    res.json({
      success: true,
      message: 'Reservation extended',
      data: {
        reservation,
        timeLeft,
        newReservedUntil,
      },
    });
  } catch (error) {
    console.error('Extend reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend reservation',
    });
  }
};

// Get all seats with availability
exports.getSeats = async (req, res) => {
  try {
    const { zone, status } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    filter.isActive = true;

    const seats = await Seat.find(filter).sort({ seatNumber: 1 });

    const total = seats.length;
    const available = seats.filter((s) => s.status === 'available').length;
    const held = seats.filter((s) => s.status === 'held').length;
    const booked = seats.filter((s) => s.status === 'booked').length;

    res.json({
      success: true,
      data: seats,
      stats: { total, available, held, booked },
    });
  } catch (error) {
    console.error('Get seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seats',
    });
  }
};

// Get seat layout with real-time status
exports.getSeatLayout = async (req, res) => {
  try {
    const seats = await Seat.find({ isActive: true })
      .select('seatNumber zone status row column')
      .sort({ row: 1, column: 1 });

    const layout = {};
    seats.forEach((seat) => {
      const row = seat.row || 'A';
      if (!layout[row]) layout[row] = [];
      layout[row].push(seat);
    });

    const total = seats.length;
    const available = seats.filter((s) => s.status === 'available').length;
    const held = seats.filter((s) => s.status === 'held').length;
    const booked = seats.filter((s) => s.status === 'booked').length;

    res.json({
      success: true,
      data: {
        layout,
        stats: { total, available, held, booked },
        girlsZone: seats.filter((s) => s.zone === 'girls').length,
      },
    });
  } catch (error) {
    console.error('Get seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seat layout',
    });
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
  const reservationController = require('./reservationController');
  return reservationController.cancelReservation(req, res);
};
