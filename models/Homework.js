const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl:     { type: String },
  note:        { type: String },
  submittedAt: { type: Date, default: Date.now },
  status:      { type: String, enum: ['submitted', 'late', 'graded'], default: 'submitted' },
  grade:       { type: String },
  feedback:    { type: String },
});

const homeworkSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  subject:     { type: String, required: true },
  class:       { type: String, required: true },   // e.g. "Class 10 A"
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate:     { type: Date, required: true },
  fileUrl:     { type: String },                   // teacher's attachment
  submissions: [submissionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Homework', homeworkSchema);
