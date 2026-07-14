const mongoose = require('mongoose');

const generalSlotBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    slot: {
      type: String,
      enum: ['morning', 'evening', 'wholeDay'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'cancelled', 'expired'],
      default: 'pending',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

generalSlotBookingSchema.index({ user: 1 });
generalSlotBookingSchema.index({ slot: 1, status: 1 });
generalSlotBookingSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      $or: [{ status: 'pending' }, { status: 'active' }],
    },
  }
);

module.exports = mongoose.model('GeneralSlotBooking', generalSlotBookingSchema);
