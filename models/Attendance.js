const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class:     { type: String, required: true },
  date:      { type: Date, required: true },
  status:    { type: String, enum: ['present', 'absent', 'late'], required: true },
  subject:   { type: String },    // optional: per-subject attendance
  markedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks:   { type: String },
}, { timestamps: true });

attendanceSchema.index({ student: 1, date: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
