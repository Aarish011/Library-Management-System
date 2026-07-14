const GeneralSlotBooking = require('../models/GeneralSlotBooking');
const Subscription = require('../models/Subscription');
const {
  GENERAL_AREA_SLOTS,
  normalizeGeneralSlot,
  getGeneralAreaSettings,
  getGeneralAreaAvailability,
  assertGeneralSlotCanBeBooked,
  createPendingGeneralSlotBooking,
} = require('../services/generalAreaService');

exports.getAvailability = async (req, res) => {
  try {
    const availability = await getGeneralAreaAvailability();
    res.json({ success: true, data: availability });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load general area availability',
    });
  }
};

exports.createPendingBooking = async (req, res) => {
  try {
    const booking = await createPendingGeneralSlotBooking(
      req.user._id,
      req.body.slot
    );

    res.status(201).json({
      success: true,
      message: 'General area slot selected. Complete payment to activate it.',
      data: { booking },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create general area booking',
    });
  }
};

exports.getAdminOverview = async (req, res) => {
  try {
    const [availability, activeBookings] = await Promise.all([
      getGeneralAreaAvailability(),
      GeneralSlotBooking.find({ status: 'active' })
        .populate('user', 'name email phone preparation profilePicture')
        .populate('subscription', 'startDate endDate amount status')
        .sort({ slot: 1, createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        ...availability,
        activeBookings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load general area management data',
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await getGeneralAreaSettings();
    if (typeof req.body.bookingEnabled === 'boolean') {
      settings.bookingEnabled = req.body.bookingEnabled;
    }

    GENERAL_AREA_SLOTS.forEach(({ slot }) => {
      const incoming = req.body.slots?.[slot];
      if (!incoming) return;

      if (incoming.capacity !== undefined) {
        settings.slots[slot].capacity = Math.max(0, Number(incoming.capacity) || 0);
      }
      if (typeof incoming.isOpen === 'boolean') {
        settings.slots[slot].isOpen = incoming.isOpen;
      }
    });

    await settings.save();
    const availability = await getGeneralAreaAvailability();

    res.json({
      success: true,
      message: 'General area settings updated',
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update general area settings',
    });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await GeneralSlotBooking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'General area booking not found',
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    if (booking.subscription) {
      await Subscription.findByIdAndUpdate(booking.subscription, {
        status: 'cancelled',
      });
    }

    res.json({
      success: true,
      message: 'General area booking cancelled',
      data: { booking },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel general area booking',
    });
  }
};

exports.changeBookingSlot = async (req, res) => {
  try {
    const slot = normalizeGeneralSlot(req.body.slot);
    if (!slot) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid general area slot',
      });
    }

    const booking = await GeneralSlotBooking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'General area booking not found',
      });
    }

    await assertGeneralSlotCanBeBooked(booking.user, slot, {
      ignoreBookingId: booking._id,
    });
    booking.slot = slot;
    await booking.save();

    res.json({
      success: true,
      message: 'General area booking slot updated',
      data: { booking },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change general area slot',
    });
  }
};
