const mongoose = require('mongoose');

// "Notices" in the Gurukul UI
const noticeSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  content:        { type: String, required: true },
  postedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetAudience: { type: String, enum: ['all', 'students', 'staff'], default: 'all' },
  targetClass:    { type: String },
  category:       { type: String, enum: ['academic', 'general', 'event'], default: 'academic' },
  isPinned:       { type: Boolean, default: false },
  attachmentUrl:  { type: String },
  expiresAt:      { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', noticeSchema);
