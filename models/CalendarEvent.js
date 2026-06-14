const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  description: { type: String, trim: true },
  targetClass: { type: String, default: null }, // null = all classes
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

calendarEventSchema.index({ date: 1 });
calendarEventSchema.index({ targetClass: 1, date: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
