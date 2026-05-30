const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  examType: { type: String, enum: ['internal', 'midterm', 'final', 'practical', 'assignment'], required: true },
  marksObtained: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  grade: { type: String },          // Auto-calculated: A, B, C etc.
  semester: { type: Number },
  academicYear: { type: String },
  remarks: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-calculate letter grade before saving
gradeSchema.pre('save', function (next) {
  const percentage = (this.marksObtained / this.totalMarks) * 100;
  if (percentage >= 90) this.grade = 'O';
  else if (percentage >= 75) this.grade = 'A+';
  else if (percentage >= 65) this.grade = 'A';
  else if (percentage >= 55) this.grade = 'B+';
  else if (percentage >= 50) this.grade = 'B';
  else if (percentage >= 40) this.grade = 'C';
  else this.grade = 'F';
  next();
});

module.exports = mongoose.model('Grade', gradeSchema);
