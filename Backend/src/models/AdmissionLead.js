const mongoose = require('mongoose');

const admissionLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^$|^\S+@\S+\.\S+$/,
      maxlength: 120,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    preparation: {
      type: String,
      enum: ['UPSC', 'JEE', 'GATE', 'NEET', 'CAT', 'Banking', 'SSC', 'Other', ''],
      default: '',
    },
    demoDate: {
      type: Date,
      default: null,
    },
    expectedJoinDate: {
      type: Date,
      default: null,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    preferredSeatType: {
      type: String,
      enum: ['general', 'reserved', 'any', ''],
      default: '',
    },
    preferredSlot: {
      type: String,
      enum: ['morning', 'evening', 'whole_day', 'any', ''],
      default: '',
    },
    lockerInterested: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ['walk_in', 'referral', 'phone_call', 'website', 'social_media', 'other', ''],
      default: '',
    },
    status: {
      type: String,
      enum: ['demo_taken', 'interested', 'follow_up', 'admitted', 'not_interested'],
      default: 'demo_taken',
      index: true,
    },
    guardianName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    guardianPhone: {
      type: String,
      trim: true,
      match: /^$|^[0-9]{10}$/,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

admissionLeadSchema.index({ name: 'text', phone: 'text', email: 'text', city: 'text' });
admissionLeadSchema.index({ createdAt: -1 });
admissionLeadSchema.index({ followUpDate: 1 });

module.exports = mongoose.model('AdmissionLead', admissionLeadSchema);
