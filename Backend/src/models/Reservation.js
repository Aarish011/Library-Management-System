const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
    },
    plan: {
      type: String,
      enum: ['library_access', 'reserved_seat'],
      required: true,
    },
    slot: {
      type: String,
      enum: ['morning', 'evening', 'full_day'],
      default: 'full_day',
      required: true,
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    reservedUntil: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'confirmed'],
      default: 'active',
    },
    duration: {
      type: Number,
      default: 300, // 5 minutes in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reservationSchema.index({ user: 1 });
reservationSchema.index({ seat: 1 });
reservationSchema.index(
  { seat: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      $or: [{ status: 'active' }, { status: 'confirmed' }],
    },
  }
);
reservationSchema.index({ status: 1 });
reservationSchema.index({ reservedUntil: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
