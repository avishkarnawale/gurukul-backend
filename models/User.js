const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, sparse: true, lowercase: true },  // staff/admin only
  password:    { type: String, required: true },
  role:        { type: String, enum: ['student', 'staff', 'admin'], required: true },

  // Student-specific
  rollNumber:  { type: String, sparse: true, uppercase: true },  // e.g. GK001
  dateOfBirth: { type: String },   // stored as YYYY-MM-DD, used as default password
  class:       { type: String },   // e.g. "Class 10|CBSE"
  board:       { type: String, enum: ['SSC', 'CBSE'] },
  parentName:  { type: String },
  parentPhone: { type: String },
  address:     { type: String },

  // Staff/Admin specific
  employeeId:  { type: String, sparse: true },
  department:  { type: String },
  subjects:    [{ type: String }],
  phone:       { type: String },

  // Common
  avatar:      { type: String },
  isActive:    { type: Boolean, default: true },

  // Password reset via OTP (admin/staff) — never returned by default
  resetOtpHash:     { type: String, select: false },
  resetOtpExpires:  { type: Date, select: false },
  resetOtpAttempts: { type: Number, select: false, default: 0 },
  resetOtpSentAt:   { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
