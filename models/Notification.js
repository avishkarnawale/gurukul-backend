const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    { type: String, enum: ['notice', 'homework', 'general'], default: 'notice' },
  title:   { type: String, required: true },
  body:    { type: String, default: '' },
  link:    { type: String, default: '/student/notices' },
  refId:   { type: mongoose.Schema.Types.ObjectId },
  read:    { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
