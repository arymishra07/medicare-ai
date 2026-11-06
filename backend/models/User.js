const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, ROLE_VALUES, SPECIALIZATIONS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.PATIENT,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 250,
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: '',
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },

    /* ----------------------------- Doctor profile ---------------------------- */
    specialization: {
      type: String,
      enum: [...SPECIALIZATIONS, ''],
      default: '',
    },
    qualification: {
      type: String,
      trim: true,
      default: '',
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 60,
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
      max: 100000,
      default: 0,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 800,
      default: '',
    },
    hospital: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.7,
    },
    reviewsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ specialization: 1, isVerified: 1 });
userSchema.index({ name: 'text', specialization: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('initials').get(function getInitials() {
  return this.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
});

module.exports = mongoose.model('User', userSchema);
