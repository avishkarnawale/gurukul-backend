const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  subject: { type: String, required: true },
  type: { type: String, enum: ['note', 'pyq', 'syllabus', 'reference'], required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String },       // pdf, ppt, docx etc.
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetClass: { type: String },
  semester: { type: Number },
  year: { type: Number },           // For PYQs: which exam year
  examType: { type: String },       // For PYQs: mid, final etc.
  tags: [{ type: String }],
  downloadCount: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: true }, // Staff can toggle
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
