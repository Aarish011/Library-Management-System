const mongoose = require('mongoose');

const careerApplicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    qualification: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    subjects: {
      type: [String],
      default: [],
    },
    teachingInterest: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    experience: {
      type: String,
      enum: ['fresher', 'less_than_1_year', '1_to_3_years', '3_plus_years'],
      default: 'fresher',
    },
    availability: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'weekend', 'flexible'],
      default: 'flexible',
    },
    preferredMode: {
      type: String,
      enum: ['offline', 'online', 'hybrid'],
      default: 'offline',
    },
    currentOccupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    expectedPay: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['new', 'reviewing', 'shortlisted', 'rejected', 'contacted'],
      default: 'new',
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  { timestamps: true }
);

careerApplicationSchema.index({ email: 1, createdAt: -1 });
careerApplicationSchema.index({ phone: 1, createdAt: -1 });
careerApplicationSchema.index({ subjects: 1 });

module.exports = mongoose.model('CareerApplication', careerApplicationSchema);
