const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      unique: true,
      trim: true,
    },
    zone: {
      type: String,
      enum: ['general', 'girls'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['available', 'held', 'booked', 'maintenance'],
      default: 'available',
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
    },
    row: {
      type: Number,
      default: null,
    },
    column: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
seatSchema.index({ status: 1 });
seatSchema.index({ zone: 1 });
seatSchema.index({ seatNumber: 1 });
seatSchema.index({ heldBy: 1 });
seatSchema.index({ holdExpiresAt: 1 });

module.exports = mongoose.model('Seat', seatSchema);
