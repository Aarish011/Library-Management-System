const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [5, 'Subject must be at least 5 characters'],
      maxlength: [120, 'Subject cannot be longer than 120 characters'],
    },
    category: {
      type: String,
      enum: ['seat', 'payment', 'subscription', 'profile', 'facility', 'other'],
      default: 'other',
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message cannot be longer than 2000 characters'],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [2000, 'Admin response cannot be longer than 2000 characters'],
      default: '',
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

issueSchema.index({ user: 1, createdAt: -1 });
issueSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);
