const mongoose = require('mongoose');

const lockerAllocationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lockerNumber: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator(value) {
          if (!value) return true;
          const number = Number(value);
          return Number.isInteger(number) && number >= 1 && number <= 36;
        },
        message: 'Locker number must be between 1 and 36',
      },
    },
    status: {
      type: String,
      enum: ['active', 'returned'],
      default: 'active',
    },
    securityDepositAmount: {
      type: Number,
      default: 250,
    },
    securityDepositStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially_refunded', 'refunded', 'deducted'],
      default: 'unpaid',
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

lockerAllocationSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);
lockerAllocationSchema.index(
  { lockerNumber: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      lockerNumber: { $type: 'string' },
    },
  }
);
lockerAllocationSchema.index({ securityDepositStatus: 1 });

module.exports = mongoose.model('LockerAllocation', lockerAllocationSchema);
