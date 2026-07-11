const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema(
  {
    originalUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    profile: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, default: '' },
      gender: { type: String, default: '' },
      preparation: { type: String, default: '' },
      profilePicture: { type: String, default: null },
      lastLogin: { type: Date, default: null },
      joinedAt: { type: Date, default: null },
      lastProfileUpdate: { type: Date, default: null },
    },
    subscriptions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    payments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    reservations: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    archivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

alumniSchema.index({ 'profile.name': 1 });
alumniSchema.index({ 'profile.email': 1 });

module.exports = mongoose.model('Alumni', alumniSchema);
