const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
    plan: {
      type: String,
      enum: ['library_access', 'reserved_seat', 'monthly', 'quarterly', 'yearly'],
      default: null,
    },
    slot: {
      type: String,
      enum: ['morning', 'evening', 'full_day'],
      default: 'full_day',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
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
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'pay_on_desk'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    failureReason: {
      type: String,
      default: null,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    referenceId: {
      type: String,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ reservation: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ referenceId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
