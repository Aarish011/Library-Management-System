const mongoose = require('mongoose');

const slotSettingsSchema = new mongoose.Schema(
  {
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const generalAreaSettingsSchema = new mongoose.Schema(
  {
    bookingEnabled: {
      type: Boolean,
      default: true,
    },
    slots: {
      morning: {
        type: slotSettingsSchema,
        default: () => ({ capacity: 40, isOpen: true }),
      },
      evening: {
        type: slotSettingsSchema,
        default: () => ({ capacity: 50, isOpen: true }),
      },
      wholeDay: {
        type: slotSettingsSchema,
        default: () => ({ capacity: 25, isOpen: true }),
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeneralAreaSettings', generalAreaSettingsSchema);
