const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      default: null,
    },
    plan: {
      type: String,
      enum: ['library_access', 'reserved_seat', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    slot: {
      type: String,
      enum: ['morning', 'evening', 'full_day'],
      default: 'full_day',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'active',
    },
    amount: {
      type: Number,
      required: true,
    },
    lockerSelected: {
      type: Boolean,
      default: false,
    },
    lockerDeposit: {
      type: Number,
      default: 0,
    },
    lockerRent: {
      type: Number,
      default: 0,
    },
    lockerNumber: {
      type: String,
      default: null,
      trim: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    expiryProcessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ seat: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
