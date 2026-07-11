const Seat = require('../models/Seats');
const Reservation = require('../models/Reservation');
const { createReservation } = require('./reservationController');
const { getPlan, normalizeSlot } = require('../services/subscriptionService');
const { releaseOrphanedSeatLocks } = require('../services/seatConsistencyService');

function buildSlotAvailability(reservations) {
  const availability = {
    morning: 'available',
    evening: 'available',
  };

  reservations.forEach((reservation) => {
    if (reservation.slot === 'full_day') {
      availability.morning = reservation.status === 'active' ? 'held' : 'booked';
      availability.evening = reservation.status === 'active' ? 'held' : 'booked';
      return;
    }

    if (availability[reservation.slot]) {
      availability[reservation.slot] =
        reservation.status === 'active' ? 'held' : 'booked';
    }
  });

  return availability;
}

function getDisplayStatus(seat, slotAvailability) {
  if (seat.isActive === false) return 'disabled';
  if (!slotAvailability) return seat.status;

  const values = Object.values(slotAvailability);
  if (values.every((status) => status === 'available')) return 'available';
  if (values.every((status) => status !== 'available')) return 'booked';
  if (values.includes('held')) return 'held';
  return 'available';
}

// Reserve a seat
exports.reserveSeat = async (req, res) => {
  try {
    const { seatId, plan } = req.body;
    const userId = req.user._id;
    const duration = req.body.duration || 300;

    const seat = await Seat.findById(seatId);
    const planConfig = getPlan(plan);
    const selectedSlot = normalizeSlot(planConfig, req.body.slot);

    if (!planConfig?.reservesSeat) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid seat reservation plan',
      });
    }

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Seat not found',
      });
    }

    if (!selectedSlot) {
      return res.status(400).json({
        success: false,
        message: 'Select morning or evening slot for the general seat package',
      });
    }

    if (selectedSlot === 'full_day' && seat.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Seat is ${seat.status}`,
      });
    }

    const seatNumber = Number(seat.seatNumber);
    const [minimumSeat, maximumSeat] = planConfig.allowedSeatRange;

    if (seatNumber < minimumSeat || seatNumber > maximumSeat) {
      return res.status(403).json({
        success: false,
        message:
          planConfig.plan === 'library_access'
            ? 'The Rs. 1000 general slot plan allows seats 66 to 75 only'
            : 'The Rs. 1500 plan allows seats 1 to 65 only',
      });
    }

    const isFemaleOnlySeat =
      seat.zone === 'girls' || (seatNumber >= 1 && seatNumber <= 10);

    if (isFemaleOnlySeat && req.user.gender !== 'female') {
      return res.status(403).json({
        success: false,
        message: 'Seats 1 to 10 are reserved for female students only',
      });
    }

    const result = await createReservation(
      userId,
      seat._id,
      duration,
      planConfig.plan,
      selectedSlot
    );

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('seat:reserved', {
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        status: result.data.seat.status,
        slot: selectedSlot,
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
    await releaseOrphanedSeatLocks();

    const { zone, status } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    filter.isActive = true;

    const seats = await Seat.find(filter).sort({ seatNumber: 1 });
    const reservations = await Reservation.find({
      seat: { $in: seats.map((seat) => seat._id) },
      status: { $in: ['active', 'confirmed'] },
    })
      .select('seat slot status')
      .lean();
    const reservationsBySeat = reservations.reduce((map, reservation) => {
      const key = String(reservation.seat);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(reservation);
      return map;
    }, new Map());
    const serializedSeats = seats.map((seat) => {
      const slotAvailability =
        Number(seat.seatNumber) >= 66 && Number(seat.seatNumber) <= 75
          ? buildSlotAvailability(reservationsBySeat.get(String(seat._id)) || [])
          : null;
      const object = seat.toObject();
      return {
        ...object,
        status: getDisplayStatus(object, slotAvailability),
        slotAvailability,
      };
    });

    const total = serializedSeats.length;
    const available = serializedSeats.filter((s) => s.status === 'available').length;
    const held = serializedSeats.filter((s) => s.status === 'held').length;
    const booked = serializedSeats.filter((s) => s.status === 'booked').length;

    res.json({
      success: true,
      data: serializedSeats,
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
    await releaseOrphanedSeatLocks();

    const seats = await Seat.find({ isActive: true })
      .select('seatNumber zone status row column')
      .sort({ row: 1, column: 1 });
    const reservations = await Reservation.find({
      seat: { $in: seats.map((seat) => seat._id) },
      status: { $in: ['active', 'confirmed'] },
    })
      .select('seat slot status')
      .lean();
    const reservationsBySeat = reservations.reduce((map, reservation) => {
      const key = String(reservation.seat);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(reservation);
      return map;
    }, new Map());

    const layout = {};
    seats.forEach((seat) => {
      const slotAvailability =
        Number(seat.seatNumber) >= 66 && Number(seat.seatNumber) <= 75
          ? buildSlotAvailability(reservationsBySeat.get(String(seat._id)) || [])
          : null;
      const serializedSeat = {
        ...seat.toObject(),
        status: getDisplayStatus(seat, slotAvailability),
        slotAvailability,
      };
      const row = seat.row || 'A';
      if (!layout[row]) layout[row] = [];
      layout[row].push(serializedSeat);
    });

    const layoutSeats = Object.values(layout).flat();
    const total = layoutSeats.length;
    const available = layoutSeats.filter((s) => s.status === 'available').length;
    const held = layoutSeats.filter((s) => s.status === 'held').length;
    const booked = layoutSeats.filter((s) => s.status === 'booked').length;

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
